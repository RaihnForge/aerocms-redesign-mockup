// One-shot script to rewrite mockup placeholder links to real aerocms.net URLs.
// Run from project root: node research/rewrite-links.js

const fs = require('fs');
const path = require('path');

const GH = 'https://marketing.aerocms.sites.glasshivepages.com/';

// Map: h4 title substring -> external URL
const resourceMap = {
  // Tools & Calculators
  'Hidden Expense Calculator': GH + 'hidden-expense-calculator',
  'Excessive Spending Calculator': GH + 'excessive-spending-calculator',
  'Cybersecurity Readiness Assessment': GH + 'Cybersecurity-Readiness-Assessment',
  'Dark Web Scan': GH + 'New-Dark-Web-Scan',
  'Cloud Migration VDI Readiness Checklist': GH + 'cloud-migration-vdi-readiness-checklist',
  'Priority Discovery Call': GH + 'Priority-Discovery-Call',

  // Guides & Checklists
  'The Business Continuity Blueprint': GH + 'The-Business-Continuity-Blueprint',
  'AI Business Playbook': GH + 'AI-business-playbook',
  'PCI Compliance Guide': GH + 'PCI-Compliance',
  'Cyber Insurance Toolkit': GH + 'Cyber-Insurance-Toolkit',
  'Windows End-of-Life Audit': GH + 'Windows-End-of-Life-Internal-System-Audit',
  'Windows Upgrade Readiness Guide': GH + 'windows-upgrade-readiness-guide',
  'Data Breach Response Plan Template': GH + 'data-breach-response-plan',
  'Essential Guide to Co-Managed IT': GH + 'free-co-managed-it-services-eguide',
  'BYOD Policy Template': GH + 'aerocms-BYOD-Policy-Template',

  // Webinars
  'Is Your IT Provider Nickel': GH + 'IT-Industry-Webinar',
  'Cyber Hygiene 101': GH + 'cyber-hygiene-101-webinar',
  'Cloud Services Overview': GH + 'aerocms-cloud-webinar',
  'Common Pitfalls in Cybersecurity': GH + 'common-pitfalls-in-cybersecurity-webinar',

  // Infographics
  'Top 10 Steps': GH + 'aerocms-infographic-top10-steps-to-take',
  'Vendor Management': GH + 'aerocms-vendor-management-infographic',
  'Audit Your IT Provider': GH + 'audit-it-provider',
  '5 Fears and 5 Benefits of Cloud': GH + 'aerocms-5fears-and-5benefits-of-the-cloud-infographic',
  'Switch From Remote to Hybrid': GH + 'aerocms-switch-from-remote-to-hybrid',
  'Co-Managed IT Services': GH + 'co-managed-it-services',

  // eBooks / Long-form
  'The Growing Role of AI in Security': GH + 'the-growing-role-of-ai-in-security-ebook',
  'BDR Explainer Video': GH + 'aerocms-bdr-explainer-video',

  // Training
  'Employee Cybersecurity Awareness Training Quiz': GH + 'aerocms-employee-cybersecurity-quiz',
};

// News article URLs on aerocms.net (suffix -dallas-tx is on every post)
const AERO = 'https://aerocms.net/';
const newsMap = {
  'Why Are SaaS Sprawl Risks Costing': AERO + 'why-are-saas-sprawl-risks-costing-your-business-more-dallas-tx/',
  'How Does SaaS Vendor Risk Management Reduce SaaS Sprawl': AERO + 'how-does-saas-vendor-risk-management-reduce-saas-sprawl-dallas-tx/',
  'What Are the Real Risks of Aging Technology': AERO + 'what-are-the-real-risks-of-aging-technology-dallas-tx/',
  'Is Windows 10 End of Life a Security Risk': AERO + 'is-windows-10-end-of-life-a-security-risk-for-your-business-dallas-tx/',
  'Aging Technology &amp; Business Continuity': AERO + 'aging-technology-and-business-continuity-how-do-you-prepare-for-change-without-chaos-dallas-tx/',
  'How Can Businesses Follow PCI DSS 4.0': AERO + 'how-can-businesses-follow-pci-dss-4-0-with-a-simplified-survival-guide-dallas-tx/',
  // Card 6 was an extra I added that has no live equivalent — point to the news archive
  'Year-End IT: Five Things to Lock Down': AERO + 'news/',
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteResources(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let hits = 0;
  const misses = [];

  for (const [title, url] of Object.entries(resourceMap)) {
    const escTitle = escapeRegex(title);
    // Match <a href="contact.html" class="resource-tile">...up to h4 containing the title
    const pattern = new RegExp(
      '<a href="contact\\.html" class="resource-tile">([\\s\\S]*?<h4>[^<]*' + escTitle + '[^<]*</h4>)',
      'g'
    );
    const before = html;
    html = html.replace(pattern, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="resource-tile">$1`);
    if (html === before) misses.push(title); else hits++;
  }

  fs.writeFileSync(filePath, html);
  const remaining = (html.match(/<a href="contact\.html" class="resource-tile"/g) || []).length;
  console.log(`[${path.basename(filePath)}] resources rewritten: ${hits}, misses: ${misses.length}, remaining contact.html tiles: ${remaining}`);
  if (misses.length) misses.forEach(m => console.log('  miss: ' + m));
}

function rewriteNews(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let hits = 0;
  const misses = [];

  // Featured: <a href="#" ...> with text "Why Are SaaS Sprawl Risks"
  // Cards: <a href="#" class="news-card"> ... <h3>title</h3>
  // Read the post button (featured): <a href="#" class="btn btn--primary">Read the post

  // 1. Featured title link
  const featuredTitle = newsMap['Why Are SaaS Sprawl Risks Costing'];
  html = html.replace(
    /<h2><a href="#" style="color: inherit; text-decoration: none;">Why Are SaaS Sprawl Risks Costing Your Business More\?<\/a><\/h2>/,
    `<h2><a href="${featuredTitle}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">Why Are SaaS Sprawl Risks Costing Your Business More?</a></h2>`
  );
  hits++;

  // 2. Featured "Read the post" button
  html = html.replace(
    /<a href="#" class="btn btn--primary">Read the post/,
    `<a href="${featuredTitle}" target="_blank" rel="noopener noreferrer" class="btn btn--primary">Read the post`
  );
  hits++;

  // 3. Each news card (skip featured)
  for (const [title, url] of Object.entries(newsMap)) {
    if (title === 'Why Are SaaS Sprawl Risks Costing') continue;
    const escTitle = escapeRegex(title);
    const pattern = new RegExp(
      '<a href="#" class="news-card">([\\s\\S]*?<h3>[^<]*' + escTitle + '[^<]*</h3>)',
      'g'
    );
    const before = html;
    html = html.replace(pattern, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="news-card">$1`);
    if (html === before) misses.push(title); else hits++;
  }

  fs.writeFileSync(filePath, html);
  const remaining = (html.match(/<a href="#" class="news-card"/g) || []).length;
  console.log(`[${path.basename(filePath)}] news rewritten: ${hits}, misses: ${misses.length}, remaining # cards: ${remaining}`);
  if (misses.length) misses.forEach(m => console.log('  miss: ' + m));
}

rewriteResources(path.resolve(__dirname, '..', 'resources.html'));
rewriteNews(path.resolve(__dirname, '..', 'news.html'));
