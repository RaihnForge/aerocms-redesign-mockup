// Generate a "team of professionals" placeholder SVG matching the
// colored-pencil portrait style. Three figure silhouettes drawn with
// hatched pencil strokes on the same blue/orange scribble background,
// with a prominent teal "+" symbol in the foreground.

const fs = require('fs');
const path = require('path');

let seed = 20260520;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

const W = 600, H = 600;
const blueShades  = ['#1f4f8a', '#3b6ca8', '#5485b8', '#6b96c6'];
const orangeShades = ['#a85b1c', '#c9722a', '#e68b3a', '#f0a050'];
const figureShades = ['#2a4751', '#3a5a66', '#4a6d7a', '#5a808e'];

function stroke(x1, y1, x2, y2, color, op, w) {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-opacity="${op.toFixed(2)}" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`;
}

const bg = [];
const figures = [];
const plusStrokes = [];

// Background scribbles (same recipe as Shelby placeholder)
for (let i = 0; i < 350; i++) {
  const cx = 50 + rand() * 280;
  const cy = -20 + rand() * 640;
  if (cx > 350 && rand() > 0.3) continue;
  const len = 50 + rand() * 200;
  const angle = -65 + (rand() - 0.5) * 25;
  const dx = Math.cos(angle * Math.PI / 180) * len;
  const dy = Math.sin(angle * Math.PI / 180) * len;
  const op = 0.06 + rand() * 0.18;
  bg.push(stroke(cx, cy, cx + dx, cy + dy, blueShades[Math.floor(rand() * 4)], op, 0.5 + rand() * 1.4));
}
for (let i = 0; i < 350; i++) {
  const cx = 270 + rand() * 320;
  const cy = -20 + rand() * 640;
  if (cx < 250 && rand() > 0.3) continue;
  const len = 50 + rand() * 200;
  const angle = -115 + (rand() - 0.5) * 25;
  const dx = Math.cos(angle * Math.PI / 180) * len;
  const dy = Math.sin(angle * Math.PI / 180) * len;
  const op = 0.06 + rand() * 0.18;
  bg.push(stroke(cx, cy, cx + dx, cy + dy, orangeShades[Math.floor(rand() * 4)], op, 0.5 + rand() * 1.4));
}

// Three figure silhouettes arranged in a row, slightly overlapping
// Each: head circle + shoulder trapezoid, hatched fill
const figureDefs = [
  { cx: 165, cy: 320, headR: 60, shoulderW: 175, depth: 0 }, // back-left
  { cx: 300, cy: 290, headR: 70, shoulderW: 220, depth: 1 }, // front-center (slightly larger / forward)
  { cx: 440, cy: 320, headR: 60, shoulderW: 175, depth: 0 }, // back-right
];

for (const fig of figureDefs) {
  const shade = figureShades[fig.depth === 1 ? 1 : 3];
  const shadeDeep = figureShades[fig.depth === 1 ? 0 : 2];
  // Solid silhouette base (low opacity so background scribbles still peek)
  // Head as circle
  figures.push(`<circle cx="${fig.cx}" cy="${fig.cy}" r="${fig.headR}" fill="${shade}" fill-opacity="0.42"/>`);
  // Shoulders as a rounded trapezoid/blob
  const sx = fig.cx - fig.shoulderW / 2;
  const sw = fig.shoulderW;
  const sy = fig.cy + fig.headR - 8;
  // Use a path for a smooth shoulder curve
  figures.push(`<path d="M ${sx} ${sy + 200} L ${sx} ${sy + 50} Q ${sx + 10} ${sy + 5} ${fig.cx - fig.headR * 0.55} ${sy + 0} Q ${fig.cx} ${sy - 5} ${fig.cx + fig.headR * 0.55} ${sy + 0} Q ${sx + sw - 10} ${sy + 5} ${sx + sw} ${sy + 50} L ${sx + sw} ${sy + 200} Z" fill="${shade}" fill-opacity="0.42"/>`);

  // Hatched fill strokes over the silhouette for pencil texture
  const figLeft = Math.max(0, fig.cx - fig.shoulderW / 2 - 10);
  const figRight = Math.min(W, fig.cx + fig.shoulderW / 2 + 10);
  const figTop = fig.cy - fig.headR - 5;
  const figBot = Math.min(H, sy + 220);
  const strokeCount = 180;
  for (let i = 0; i < strokeCount; i++) {
    // Random points within bounding box
    const x1 = figLeft + rand() * (figRight - figLeft);
    const y1 = figTop + rand() * (figBot - figTop);
    // Hatch direction (diagonal)
    const angle = -65 + (rand() - 0.5) * 15;
    const len = 14 + rand() * 22;
    const x2 = x1 + Math.cos(angle * Math.PI / 180) * len;
    const y2 = y1 + Math.sin(angle * Math.PI / 180) * len;
    // Only draw if midpoint is inside silhouette (rough test)
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const inHead = Math.hypot(mx - fig.cx, my - fig.cy) < fig.headR;
    const inBody = mx > sx && mx < sx + sw && my > sy && my < figBot;
    if (!inHead && !inBody) continue;
    const op = 0.10 + rand() * 0.25;
    plusStrokes.push(stroke(x1, y1, x2, y2, shadeDeep, op, 0.7 + rand() * 1.2));
  }
}

// Big "+" symbol in the foreground, drawn with pencil-stroke texture for cohesion
// Geometry: centered at (300, 300), arm length 90, arm width 60
const plusCx = 300, plusCy = 300;
const armLen = 100, armW = 64;
// Base shape: cream-edged plus on top of figures
const plusPath = `M ${plusCx - armW/2} ${plusCy - armLen} L ${plusCx + armW/2} ${plusCy - armLen} L ${plusCx + armW/2} ${plusCy - armW/2} L ${plusCx + armLen} ${plusCy - armW/2} L ${plusCx + armLen} ${plusCy + armW/2} L ${plusCx + armW/2} ${plusCy + armW/2} L ${plusCx + armW/2} ${plusCy + armLen} L ${plusCx - armW/2} ${plusCy + armLen} L ${plusCx - armW/2} ${plusCy + armW/2} L ${plusCx - armLen} ${plusCy + armW/2} L ${plusCx - armLen} ${plusCy - armW/2} L ${plusCx - armW/2} ${plusCy - armW/2} Z`;

const plusFills = [
  // Cream halo for separation from figures
  `<path d="${plusPath}" fill="#FAF4E6" fill-opacity="0.92" stroke="#2C9DB7" stroke-width="3" stroke-opacity="0.85"/>`,
];
// Pencil hatch over the plus in teal
for (let i = 0; i < 220; i++) {
  // bounding box of plus
  const x1 = (plusCx - armLen) + rand() * (armLen * 2);
  const y1 = (plusCy - armLen) + rand() * (armLen * 2);
  // Check if point is inside plus shape: in vertical bar or horizontal bar
  const inVBar = Math.abs(x1 - plusCx) <= armW/2 && Math.abs(y1 - plusCy) <= armLen;
  const inHBar = Math.abs(y1 - plusCy) <= armW/2 && Math.abs(x1 - plusCx) <= armLen;
  if (!inVBar && !inHBar) continue;
  const angle = -65 + (rand() - 0.5) * 20;
  const len = 10 + rand() * 18;
  const x2 = x1 + Math.cos(angle * Math.PI / 180) * len;
  const y2 = y1 + Math.sin(angle * Math.PI / 180) * len;
  const op = 0.15 + rand() * 0.30;
  plusFills.push(stroke(x1, y1, x2, y2, '#2C9DB7', op, 0.7 + rand() * 1.3));
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Extended team placeholder">
  <!-- Cream base -->
  <rect width="${W}" height="${H}" fill="#FAF4E6"/>

  <!-- Background pencil scribbles -->
  <g>
    ${bg.join('\n    ')}
  </g>

  <!-- Figure silhouettes (3 professionals) -->
  <g>
    ${figures.join('\n    ')}
  </g>

  <!-- Hatched pencil texture on silhouettes -->
  <g>
    ${plusStrokes.join('\n    ')}
  </g>

  <!-- Foreground plus with cream halo and teal pencil hatch -->
  <g>
    ${plusFills.join('\n    ')}
  </g>

  <!-- Caption -->
  <text x="${W / 2}" y="${H - 40}" text-anchor="middle"
        font-family="'Inter', sans-serif"
        font-size="22" font-weight="600"
        fill="#0F2A33" fill-opacity="0.45"
        letter-spacing="3">EXTENDED TEAM</text>
</svg>
`;

const out = path.resolve(__dirname, '..', 'assets', 'team', 'extended-team.svg');
fs.writeFileSync(out, svg);
console.log(`Wrote: ${out} (${svg.length} bytes, bg=${bg.length} fig-strokes=${plusStrokes.length} plus-strokes=${plusFills.length - 1})`);
