// Apply two cross-page nav fixes:
// 1. Add aria-label="AeroCMS home" to brand links that lack it
// 2. Add aria-current="page" to the matching nav link on each page

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// page -> nav href that should get aria-current
const activeMap = {
  'index.html':                       null,           // no nav item maps to home
  'about.html':                       'about.html',
  'services.html':                    'services.html',
  'plans.html':                       'plans.html',
  'resources.html':                   'resources.html',
  'news.html':                        'news.html',
  'contact.html':                     'contact.html',
  'services/it-business.html':        '../services.html',
  'services/security.html':           '../services.html',
  'services/cloud.html':              '../services.html',
  'services/hardware.html':           '../services.html',
};

function escRE(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let totalChanges = 0;

for (const [page, activeHref] of Object.entries(activeMap)) {
  const fullPath = path.join(root, page);
  let html = fs.readFileSync(fullPath, 'utf-8');
  const before = html;

  // 1. Add aria-label to brand link if missing
  // Patterns to match (with or without trailing newline/space):
  //   <a href="index.html" class="site-header__brand">
  //   <a href="../index.html" class="site-header__brand">
  // Inject aria-label if not already present.
  html = html.replace(
    /<a href="((?:\.\.\/)?index\.html)" class="site-header__brand"(?!\s+aria-label)/,
    '<a href="$1" class="site-header__brand" aria-label="AeroCMS home"'
  );

  // 2. Add aria-current to matching nav link
  if (activeHref) {
    const escHref = escRE(activeHref);
    const navLinkPattern = new RegExp(`<a href="${escHref}"(?![^>]*aria-current)>`);
    html = html.replace(navLinkPattern, `<a href="${activeHref}" aria-current="page">`);
  }

  if (html !== before) {
    fs.writeFileSync(fullPath, html);
    totalChanges++;
    console.log(`updated: ${page}`);
  } else {
    console.log(`no-change: ${page}`);
  }
}

console.log(`\nFiles updated: ${totalChanges}`);
