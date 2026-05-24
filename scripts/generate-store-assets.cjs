#!/usr/bin/env node

// ─── scripts/generate-store-assets.cjs ──────────────────────────────────
//
// Genera assets para el listing de Google Play (no para la app):
//   - feature-graphic.png  (1024×500, obligatorio en Play Console)
//   - icon-512.png         (512×512, ícono de alta resolución del listing)
//
// USO:  npm run store:assets
// Output: resources/store/feature-graphic.png, resources/store/icon-512.png
//
// El feature graphic es un punto de partida con la identidad de marca (logo
// reloj+sol sobre gradiente sky→ocean); refinable en Canva/Figma. El ícono 512
// se rasteriza del SVG real de la app (resources/icons/icon.svg) para que quede
// idéntico al ícono adaptive del AAB.
// Play exige: feature graphic 1024×500 PNG/JPG sin transparencia; ícono 512×512
// PNG de 32 bits.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "resources", "store");
const ICON_SRC = path.join(ROOT, "resources", "icons", "icon.svg");
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1024, H = 500;

// Logo (mismo mark del ícono: cuadrado redondeado gradiente, reloj blanco,
// sol amarillo arriba) centrado a la izquierda del wordmark.
function featureSvg() {
  const logo = 150;
  const lx = 250, ly = (H - logo) / 2;
  const r = logo / 2, cx = lx + r, cy = ly + r;
  return Buffer.from(`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38A1F0"/>
      <stop offset="1" stop-color="#1452A8"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- logo tile -->
  <rect x="${lx}" y="${ly}" width="${logo}" height="${logo}" rx="${logo * 0.22}" fill="#ffffff"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.57}" fill="none" stroke="#1452A8" stroke-width="${r * 0.124}"/>
  <path d="M ${cx} ${cy - r * 0.31} L ${cx} ${cy} L ${cx + r * 0.22} ${cy + r * 0.095}"
        fill="none" stroke="#1452A8" stroke-width="${r * 0.137}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${cx}" cy="${ly - r * 0.06}" r="${r * 0.10}" fill="#FFD24A"/>
  <!-- wordmark + tagline -->
  <text x="${lx + logo + 36}" y="${H / 2 - 6}" font-family="Outfit, 'Segoe UI', Arial, sans-serif" font-size="76" font-weight="700" fill="#ffffff">Clasloop</text>
  <text x="${lx + logo + 40}" y="${H / 2 + 44}" font-family="'Segoe UI', Arial, sans-serif" font-size="30" font-weight="400" fill="#EAF3FF">Daily warmups &amp; exit tickets</text>
</svg>`);
}

async function main() {
  await sharp(featureSvg()).png().toFile(path.join(OUT_DIR, "feature-graphic.png"));
  console.log("✓ resources/store/feature-graphic.png (1024×500)");

  // Hi-res listing icon (512×512), rasterized from the app's real SVG so it
  // matches the adaptive icon in the AAB. Solid background → opaque PNG, OK for Play.
  await sharp(fs.readFileSync(ICON_SRC)).resize(512, 512).png().toFile(path.join(OUT_DIR, "icon-512.png"));
  console.log("✓ resources/store/icon-512.png (512×512)");

  console.log("\nListo. Subilos en Play Console → Store listing → Graphics");
  console.log("(Feature graphic + App icon). Si el texto del feature graphic no se ve");
  console.log("perfecto (fuentes del sistema), refinalo en Canva.");
}

main().catch(err => { console.error("❌", err); process.exit(1); });
