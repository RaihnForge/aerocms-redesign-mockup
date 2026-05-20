// Generate an SVG placeholder for Shelby Spencer that matches the
// colored-pencil portrait style of the other team headshots:
// cream base, diagonal blue strokes from top-left, orange strokes
// from top-right, large centered "SS" initials.
//
// Deterministic seed so re-running produces identical output.

const fs = require('fs');
const path = require('path');

// Tiny PRNG for reproducible output
let seed = 20260520;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

const W = 600, H = 600;
const blueShades = ['#1f4f8a', '#3b6ca8', '#5485b8', '#6b96c6'];
const orangeShades = ['#a85b1c', '#c9722a', '#e68b3a', '#f0a050'];

function stroke(x1, y1, x2, y2, color, op, w) {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-opacity="${op.toFixed(2)}" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`;
}

const lines = [];

// Blue scribble cloud (left half, angled down-right)
for (let i = 0; i < 450; i++) {
  // Center cluster around upper-left, with falloff
  const cx = 50 + rand() * 280;
  const cy = -20 + rand() * 640;
  const distFromCenter = Math.abs(cx - 180) / 180;
  // Density falloff toward right side
  if (cx > 350 && rand() > 0.3) continue;
  const len = 50 + rand() * 200;
  const angle = -65 + (rand() - 0.5) * 25; // mostly diagonal down
  const dx = Math.cos(angle * Math.PI / 180) * len;
  const dy = Math.sin(angle * Math.PI / 180) * len;
  const op = 0.08 + rand() * 0.22 * (1 - distFromCenter * 0.5);
  const color = blueShades[Math.floor(rand() * blueShades.length)];
  const w = 0.5 + rand() * 1.6;
  lines.push(stroke(cx, cy, cx + dx, cy + dy, color, op, w));
}

// Orange scribble cloud (right half, angled down-left)
for (let i = 0; i < 450; i++) {
  const cx = 270 + rand() * 320;
  const cy = -20 + rand() * 640;
  const distFromCenter = Math.abs(cx - 420) / 180;
  if (cx < 250 && rand() > 0.3) continue;
  const len = 50 + rand() * 200;
  const angle = -115 + (rand() - 0.5) * 25; // mostly diagonal down toward left
  const dx = Math.cos(angle * Math.PI / 180) * len;
  const dy = Math.sin(angle * Math.PI / 180) * len;
  const op = 0.08 + rand() * 0.22 * (1 - distFromCenter * 0.5);
  const color = orangeShades[Math.floor(rand() * orangeShades.length)];
  const w = 0.5 + rand() * 1.6;
  lines.push(stroke(cx, cy, cx + dx, cy + dy, color, op, w));
}

// Soft centered halo to mimic where the subject would be
const haloId = 'halo';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Shelby Spencer placeholder portrait">
  <defs>
    <radialGradient id="${haloId}" cx="50%" cy="55%" r="45%">
      <stop offset="0%" stop-color="#FAF4E6" stop-opacity="0.85"/>
      <stop offset="70%" stop-color="#FAF4E6" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#FAF4E6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Cream base -->
  <rect width="${W}" height="${H}" fill="#FAF4E6"/>

  <!-- Pencil scribbles -->
  <g>
    ${lines.join('\n    ')}
  </g>

  <!-- Soft halo so initials read clean -->
  <rect width="${W}" height="${H}" fill="url(#${haloId})"/>

  <!-- Initials in a hand-drawn-feeling serif -->
  <text x="${W / 2}" y="${H / 2 + 90}" text-anchor="middle"
        font-family="'Georgia', 'Playfair Display', serif"
        font-size="280" font-weight="700"
        fill="#0F2A33" fill-opacity="0.72"
        letter-spacing="-14">SS</text>

  <!-- Subtle name tag -->
  <text x="${W / 2}" y="${H - 40}" text-anchor="middle"
        font-family="'Inter', sans-serif"
        font-size="22" font-weight="600"
        fill="#0F2A33" fill-opacity="0.45"
        letter-spacing="3">SHELBY SPENCER</text>
</svg>
`;

const out = path.resolve(__dirname, '..', 'assets', 'team', 'shelby-spencer.svg');
fs.writeFileSync(out, svg);
console.log(`Wrote: ${out} (${svg.length} bytes, ${lines.length} strokes)`);
