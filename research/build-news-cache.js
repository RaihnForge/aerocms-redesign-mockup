// Fetch aerocms.net RSS feed and emit data/news-cache.json
// Run: node research/build-news-cache.js
//
// Output schema (per item):
//   { title, slug, link, externalLink, pubDate, author, categories[], excerpt }
//
// "link" is the local article page when we have one (articles/{slug}.html),
// otherwise it falls back to the original aerocms.net URL.

const fs = require('fs');
const path = require('path');
const https = require('https');

const FEED_URL = 'https://aerocms.net/feed/';
const ROOT = path.resolve(__dirname, '..');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (AeroCMS news cache builder)' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject);
  });
}

function getTagAll(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  const matches = [];
  let m;
  while ((m = re.exec(xml)) !== null) matches.push(m[1]);
  return matches;
}

function getTagOne(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : '';
}

function unescapeCdata(s) {
  // Strip CDATA wrappers; decode common HTML entities used in feed text
  return s
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function stripHtml(s, max = 240) {
  const stripped = s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function slugFromLink(link) {
  // https://aerocms.net/some-slug-dallas-tx/ -> some-slug-dallas-tx
  const m = link.match(/aerocms\.net\/([^/?#]+)\/?/);
  return m ? m[1] : null;
}

function estimateReadMinutes(content) {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 220));
}

function formatDate(rfc822) {
  const d = new Date(rfc822);
  if (isNaN(d.getTime())) return rfc822;
  return d.toISOString();
}

async function main() {
  console.log(`Fetching ${FEED_URL}…`);
  const xml = await fetchUrl(FEED_URL);

  // Build set of slugs we have local articles for
  const articlesDir = path.join(ROOT, 'articles');
  const localSlugs = new Set(
    fs.readdirSync(articlesDir)
      .filter((f) => f.endsWith('.html'))
      .map((f) => f.replace(/\.html$/, ''))
  );
  console.log(`Local article slugs: ${localSlugs.size}`);

  // RSS item-by-item parse
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1];
    const title = unescapeCdata(getTagOne(item, 'title'));
    const link = unescapeCdata(getTagOne(item, 'link'));
    const pubDate = unescapeCdata(getTagOne(item, 'pubDate'));
    const author = unescapeCdata(getTagOne(item, 'dc:creator'));
    const categories = getTagAll(item, 'category').map(unescapeCdata);
    const description = unescapeCdata(getTagOne(item, 'description'));
    const content = unescapeCdata(getTagOne(item, 'content:encoded'));

    const slug = slugFromLink(link);
    const hasLocal = slug && localSlugs.has(slug);
    items.push({
      title,
      slug,
      link: hasLocal ? `articles/${slug}.html` : link,
      externalLink: link,
      isExternal: !hasLocal,
      pubDate: formatDate(pubDate),
      author,
      categories,
      primaryCategory: categories.find((c) => !c.includes(' ')) || categories[0] || 'AeroCMS',
      excerpt: stripHtml(description, 220),
      readMinutes: estimateReadMinutes(content || description),
    });
  }

  const cache = {
    feed: {
      title: unescapeCdata(getTagOne(xml.replace(/<item>[\s\S]*?<\/item>/g, ''), 'title')),
      link: 'https://aerocms.net/',
      generated_at: new Date().toISOString(),
    },
    items,
  };

  const outDir = path.join(ROOT, 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'news-cache.json');
  fs.writeFileSync(outFile, JSON.stringify(cache, null, 2));
  console.log(`Wrote ${outFile} (${items.length} items, ${fs.statSync(outFile).size} bytes)`);
  console.log(`Articles linked locally: ${items.filter((i) => !i.isExternal).length}`);
  console.log(`Articles linked externally: ${items.filter((i) => i.isExternal).length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
