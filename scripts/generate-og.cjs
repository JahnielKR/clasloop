// Generates public/og-image.png (1200×630) — the social-share card referenced
// by index.html's og:image / twitter:image. Pure SVG → PNG via sharp (already a
// devDependency). Re-run with: node scripts/generate-og.cjs
//
// Fonts: SVG text renders with the system font stack (sharp/resvg has no web
// fonts), so we use a safe sans stack. The look stays on-brand via color +
// layout. No emoji/symbol glyphs (avoids tofu in the rasterizer).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 1200, H = 630;
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// A tilted "question card" for the right side.
function card({ x, y, rot, bg, border, label, labelColor }) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rot})">
      <rect width="330" height="150" rx="18" fill="${bg}" stroke="${border}" stroke-width="2"/>
      <text x="24" y="42" font-family="${FONT}" font-size="17" font-weight="700" letter-spacing="1.2" fill="${labelColor}">${label}</text>
      <rect x="24" y="62" width="250" height="12" rx="6" fill="${labelColor}" opacity="0.85"/>
      <rect x="24" y="86" width="200" height="12" rx="6" fill="${labelColor}" opacity="0.45"/>
      <rect x="24" y="110" width="150" height="12" rx="6" fill="${labelColor}" opacity="0.30"/>
    </g>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="32%" cy="-10%" r="120%">
      <stop offset="0" stop-color="#E8F0FE"/>
      <stop offset="55%" stop-color="#FFFFFF"/>
    </radialGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38A1F0"/>
      <stop offset="1" stop-color="#1452A8"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- right-side question cards -->
  ${card({ x: 772, y: 150, rot: -5, bg: "#FFF3E0", border: "#D9730D", label: "WARMUP", labelColor: "#8A4A0A" })}
  ${card({ x: 800, y: 338, rot: 4, bg: "#EDE6F6", border: "#6940A5", label: "EXIT TICKET", labelColor: "#3F2466" })}

  <!-- logo + wordmark -->
  <g transform="translate(90 76)">
    <rect width="60" height="60" rx="15" fill="url(#logo)"/>
    <circle cx="30" cy="30" r="17" fill="none" stroke="#fff" stroke-width="3.6"/>
    <path d="M30 21 L30 30 L37 34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30" cy="12" r="3" fill="#FFEAA7"/>
    <text x="78" y="42" font-family="${FONT}" font-size="38" font-weight="700" fill="#191919">Clasloop</text>
  </g>

  <!-- tagline -->
  <g font-family="${FONT}" fill="#191919" font-weight="800">
    <text x="90" y="262" font-size="62">From any file to</text>
    <text x="90" y="334" font-size="62">a warmup or exit</text>
    <text x="90" y="406" font-size="62">ticket in <tspan fill="#2383E2">30 seconds.</tspan></text>
  </g>

  <!-- sub -->
  <text x="92" y="468" font-family="${FONT}" font-size="26" font-weight="500" fill="#6B6B6B">AI writes and verifies the questions.</text>
  <text x="92" y="504" font-family="${FONT}" font-size="26" font-weight="500" fill="#6B6B6B">Launch them live, or print a polished test.</text>

  <!-- footer dot + url -->
  <text x="90" y="566" font-family="${FONT}" font-size="20" font-weight="600" fill="#9B9B9B">clasloop.com</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, "..", "public", "og-image.png"))
  .then((info) => console.log("OG written:", info.width + "x" + info.height, info.size + " bytes"))
  .catch((err) => { console.error(err); process.exit(1); });
