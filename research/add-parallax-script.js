// Sweep all HTML files and add the parallax.js script tag if missing.
// Placement: just before the first inline <script> block (so it loads first).

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function walk(dir, list) {
  list = list || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'assets', 'research', 'data'].indexOf(entry.name) >= 0) continue;
      walk(p, list);
    } else if (entry.name.endsWith('.html')) {
      list.push(p);
    }
  }
  return list;
}

const files = walk(root);
let updated = 0;
for (const f of files) {
  let html = fs.readFileSync(f, 'utf-8');
  if (html.indexOf('parallax.js') !== -1) {
    console.log('skipped (already has script):', path.relative(root, f));
    continue;
  }
  const rel = path.relative(root, f);
  const inSubdir = rel.indexOf(path.sep) !== -1;
  const src = inSubdir ? '../assets/js/parallax.js' : 'assets/js/parallax.js';
  const tag = '<script src="' + src + '" defer></script>\n';
  const before = html;
  // Insert just before the first inline <script> tag (the existing mobile-nav block)
  html = html.replace(/(<script>\s*(?:\/\/[^\n]*\n\s*)?(?:const menuBtn|\(async function loadNewsStream))/, tag + '$1');
  if (html === before) {
    // Fallback: insert before </body>
    html = html.replace(/<\/body>/, tag + '</body>');
  }
  if (html !== before) {
    fs.writeFileSync(f, html);
    updated++;
    console.log('updated:', path.relative(root, f));
  } else {
    console.log('FAILED to insert in:', path.relative(root, f));
  }
}
console.log('Total updated:', updated);
