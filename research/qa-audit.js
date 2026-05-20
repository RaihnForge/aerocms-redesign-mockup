// Frontend QA audit across all pages.
// - Verifies every <img src=...> + every background-image: url(...) returns 200
// - Verifies every internal href resolves to a real file in the project
// - Verifies header, footer, and utility-bar blocks are structurally consistent
// - Reports findings; exits 0 (informational)

const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.resolve(__dirname, '..');
const pages = [
  'index.html',
  'about.html',
  'services.html',
  'plans.html',
  'resources.html',
  'news.html',
  'contact.html',
  'services/it-business.html',
  'services/security.html',
  'services/cloud.html',
  'services/hardware.html',
];

function read(p) { return fs.readFileSync(path.join(root, p), 'utf-8'); }

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => resolve('ERR'));
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT'); });
    req.end();
  });
}

function extractImgSrcs(html) {
  const out = new Set();
  const re = /<img[^>]+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) out.add(m[1]);
  return [...out];
}

function extractBgUrls(html) {
  const out = new Set();
  const re = /url\(['"]?(https?:\/\/[^'")]+)['"]?\)/g;
  let m;
  while ((m = re.exec(html)) !== null) out.add(m[1]);
  return [...out];
}

function extractInternalHrefs(html) {
  const out = new Set();
  // Match href="X" where X is a relative path (not starting with http, mailto, tel, #)
  const re = /href="((?!https?:|mailto:|tel:|#)[^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) out.add(m[1]);
  return [...out];
}

function resolveLocal(fromPage, href) {
  const fromDir = path.dirname(fromPage);
  // strip query/hash for resolution
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  return path.normalize(path.join(fromDir, clean));
}

function extractBlock(html, marker) {
  // Return the substring between specific markers, normalized
  const m = html.match(marker);
  return m ? m[0] : null;
}

async function main() {
  console.log('=== AeroCMS Redesign QA ===\n');

  // 1. Image health
  console.log('## 1. Image availability\n');
  const allImages = new Set();
  for (const p of pages) {
    const html = read(p);
    extractImgSrcs(html).forEach((s) => allImages.add(s));
    extractBgUrls(html).forEach((s) => allImages.add(s));
  }
  const externalImages = [...allImages].filter((u) => u.startsWith('http'));
  const localImages = [...allImages].filter((u) => !u.startsWith('http'));
  console.log(`  External images to check: ${externalImages.length}`);
  console.log(`  Local images: ${localImages.length}`);

  const results = await Promise.all(externalImages.map((u) => head(u).then((c) => [u, c])));
  const bad = results.filter(([, code]) => code !== 200);
  if (bad.length === 0) {
    console.log('  [OK] All external images return 200.\n');
  } else {
    console.log(`  [FAIL] ${bad.length} external image(s) NOT 200:`);
    bad.forEach(([u, c]) => console.log(`    ${c}  ${u}`));
    console.log();
  }

  // Check local images exist
  console.log('  Local image existence:');
  let localBad = 0;
  for (const u of localImages) {
    const full = path.join(root, u);
    const exists = fs.existsSync(full);
    if (!exists) { console.log(`    [MISSING] ${u}`); localBad++; }
  }
  if (localBad === 0) console.log('    [OK] All local images present.\n'); else console.log();

  // 2. Internal links
  console.log('## 2. Internal link audit\n');
  let brokenLinks = 0;
  for (const p of pages) {
    const html = read(p);
    const hrefs = extractInternalHrefs(html);
    for (const h of hrefs) {
      if (h.startsWith('javascript:') || h === '/') continue;
      const resolved = resolveLocal(p, h);
      if (!resolved) continue;
      const full = path.join(root, resolved);
      if (!fs.existsSync(full)) {
        console.log(`  [BROKEN] ${p}  ->  ${h}  (looked for ${resolved})`);
        brokenLinks++;
      }
    }
  }
  if (brokenLinks === 0) console.log('  [OK] All internal links resolve to existing files.\n');
  else console.log(`\n  Total broken internal links: ${brokenLinks}\n`);

  // 3. Header/footer/utility-bar consistency
  console.log('## 3. Cross-page block consistency\n');
  const blockHashes = {
    utility: {},
    header: {},
    footer: {},
  };
  for (const p of pages) {
    const html = read(p);
    const isSubdir = p.includes('/');

    // Utility bar (between <div class="utility-bar"> and its closing </div>)
    const utilMatch = html.match(/<div class="utility-bar">[\s\S]*?<\/div>\s*<\/div>/);
    // Site header
    const headerMatch = html.match(/<header class="site-header">[\s\S]*?<\/header>/);
    // Footer
    const footerMatch = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);

    function normalize(s, subdir) {
      if (!s) return null;
      // Strip whitespace variation, and normalize ../ prefix for subdirs so subdir/root pages compare equal
      let n = s.replace(/\s+/g, ' ').trim();
      if (subdir) {
        // Convert ../ refs back to root refs for hashing
        n = n.replace(/\.\.\//g, '');
      }
      return n;
    }

    const utilN = normalize(utilMatch && utilMatch[0], isSubdir);
    const headerN = normalize(headerMatch && headerMatch[0], isSubdir);
    const footerN = normalize(footerMatch && footerMatch[0], isSubdir);

    blockHashes.utility[p] = utilN;
    blockHashes.header[p] = headerN;
    blockHashes.footer[p] = footerN;
  }

  function checkGroup(name, group) {
    const values = new Map();
    for (const [page, val] of Object.entries(group)) {
      if (!val) { console.log(`  [WARN] ${name}: ${page} has no ${name} block.`); continue; }
      if (!values.has(val)) values.set(val, []);
      values.get(val).push(page);
    }
    if (values.size === 1) {
      console.log(`  [OK] ${name}: all ${pages.length} pages match (after path normalization).`);
    } else {
      console.log(`  [DRIFT] ${name}: ${values.size} variants:`);
      let i = 0;
      for (const [, pageList] of values) {
        i++;
        console.log(`    Variant ${i}: ${pageList.length} page(s)`);
        pageList.forEach((p) => console.log(`       - ${p}`));
      }
      // Show diff hint
      const variants = [...values.entries()];
      if (variants.length === 2) {
        const [a, b] = variants;
        // Find first differing char
        let i2 = 0;
        while (i2 < a[0].length && i2 < b[0].length && a[0][i2] === b[0][i2]) i2++;
        const ctxStart = Math.max(0, i2 - 40);
        const ctxEnd = Math.min(Math.max(a[0].length, b[0].length), i2 + 80);
        console.log(`    First difference around char ${i2}:`);
        console.log(`      A: ...${a[0].slice(ctxStart, ctxEnd)}...`);
        console.log(`      B: ...${b[0].slice(ctxStart, ctxEnd)}...`);
      }
    }
  }

  checkGroup('utility-bar', blockHashes.utility);
  checkGroup('site-header', blockHashes.header);
  checkGroup('site-footer', blockHashes.footer);
  console.log();

  // 4. Active-nav state check (no page indicates current page in nav?)
  console.log('## 4. Active-state indicator on nav\n');
  let activeFound = 0;
  for (const p of pages) {
    const html = read(p);
    const hasActive = /class="[^"]*site-nav__active[^"]*"|aria-current="page"/.test(html);
    if (hasActive) activeFound++;
  }
  if (activeFound === 0) {
    console.log(`  [NOTE] No page sets an active-nav indicator. Optional improvement: add aria-current="page" to the matching nav link on each page.\n`);
  } else {
    console.log(`  [INFO] ${activeFound}/${pages.length} pages set active state.\n`);
  }

  // 5. Page titles
  console.log('## 5. Page titles\n');
  for (const p of pages) {
    const html = read(p);
    const m = html.match(/<title>([^<]+)<\/title>/);
    console.log(`  ${p.padEnd(34)} -> ${m ? m[1] : '(missing)'}`);
  }
  console.log();

  // 6. Suspicious typos
  console.log('## 6. Quick typo/markup checks\n');
  let typoCount = 0;
  for (const p of pages) {
    const html = read(p);
    if (html.includes('page-hole__inner')) { console.log(`  [TYPO] ${p}: "page-hole__inner" (should be "page-hero__inner")`); typoCount++; }
    if (html.match(/<a\b[^>]*<a\b/)) { console.log(`  [STRUCT] ${p}: nested <a> tag detected`); typoCount++; }
  }
  if (typoCount === 0) console.log('  [OK] No obvious typos / structural issues.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
