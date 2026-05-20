const fs = require('fs');
const path = require('path');

function verify(filePath, tileClass) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const escClass = tileClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('<a href="([^"]+)"[^>]*class="' + escClass + '"[^>]*>[\\s\\S]*?<h([34])>([^<]+)</h\\2>', 'g');
  let m;
  const rows = [];
  while ((m = re.exec(html)) !== null) {
    const short = m[1]
      .replace('https://marketing.aerocms.sites.glasshivepages.com/', 'GH/')
      .replace('https://aerocms.net/', 'AERO/');
    rows.push({ url: short, title: m[3].trim() });
  }
  console.log(`\n=== ${path.basename(filePath)} :: ${tileClass} (${rows.length} entries) ===`);
  rows.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${r.title.padEnd(55).slice(0,55)} -> ${r.url}`);
  });
}

const root = path.resolve(__dirname, '..');
verify(path.join(root, 'resources.html'), 'resource-tile');
verify(path.join(root, 'news.html'), 'news-card');
