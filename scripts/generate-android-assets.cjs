#!/usr/bin/env node

// ─── scripts/generate-android-assets.cjs ────────────────────────────────
//
// Genera todos los íconos y splash screens de Android desde los SVG
// fuente en resources/icons/.
//
// USO:
//
//   npm run icons:generate
//
// Después correr:
//
//   npx cap copy android   (o npx cap sync android)
//
// para que los assets copien al directorio android/.
//
// LOGO REAL DE CLASLOOP:
//   Reloj con sol sobre gradiente sky→ocean (#38A1F0 → #1452A8).
//   Definido en src/components/Icons.jsx como LogoMark.
//
// DISEÑO DEL ÍCONO DE APP (decidido con Jota):
//   - iOS-style: fondo gris claro neutro (#F0F0EC) + logo flotando
//     adentro con gradiente. Más premium, más Notion/Linear-vibe.
//
// SPLASH (PR 53.1):
//   - Fondo blanco neutro #F0F0EC (mismo que el background del ícono)
//   - Logo centrado, sin wordmark.
//   - Una sola transición visual al abrir: splash → app. Limpio.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "resources", "icons");
const ANDROID_RES = path.join(ROOT, "android", "app", "src", "main", "res");

if (!fs.existsSync(SRC_DIR)) {
  console.error("❌ resources/icons/ no existe");
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, "android"))) {
  console.error("❌ android/ no existe. Corré: npx cap add android");
  process.exit(1);
}

const ICON_SVG = fs.readFileSync(path.join(SRC_DIR, "icon.svg"));
const ICON_FOREGROUND_SVG = fs.readFileSync(path.join(SRC_DIR, "icon-foreground.svg"));

// Colors
// PR 53.1: Jota prefirió splash claro (sin transición a oscuro).
// El fondo del splash y del adaptive icon background son el mismo
// blanco neutro → toda la app abre con coherencia visual.
const ADAPTIVE_BG_COLOR = "#F0F0EC";  // gris claro neutro
const SPLASH_BG_COLOR = "#F0F0EC";    // mismo color, sin oscuro

// Legacy icons sizes
const LEGACY_SIZES = {
  mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192,
};

// Adaptive foreground sizes
const ADAPTIVE_FG_SIZES = {
  mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432,
};

// Splash sizes
const SPLASH_SIZES = {
  "drawable-port-mdpi":   [320, 480],
  "drawable-port-hdpi":   [480, 800],
  "drawable-port-xhdpi":  [720, 1280],
  "drawable-port-xxhdpi": [960, 1600],
  "drawable-port-xxxhdpi": [1280, 1920],
  "drawable-land-mdpi":   [480, 320],
  "drawable-land-hdpi":   [800, 480],
  "drawable-land-xhdpi":  [1280, 720],
  "drawable-land-xxhdpi": [1600, 960],
  "drawable-land-xxxhdpi": [1920, 1280],
};

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * PR 53.1: splash simplificado — solo el logo Clasloop centrado sobre
 * fondo neutro claro. Sin wordmark (Jota lo prefirió así, sin la
 * transición a un splash oscuro custom).
 *
 * El logo es el mismo del ícono: cuadrado redondeado con gradiente azul,
 * reloj blanco con manecillas, sol amarillo arriba.
 */
function buildSplashSvg() {
  // Canvas conceptual cuadrado 2732×2732. Sharp después hace "cover"
  // sobre las dimensiones reales del device. Como fondo es sólido,
  // el cover no genera bordes raros.
  const C = 2732;

  // Tamaño del logo proporcional al canvas.
  const logoSize = 420;
  const logoX = (C - logoSize) / 2;
  const logoY = (C - logoSize) / 2;  // centrado en ambas dimensiones

  const r = logoSize / 2;
  const cx = logoX + r;
  const cy = logoY + r;

  return Buffer.from(`<svg width="${C}" height="${C}" viewBox="0 0 ${C} ${C}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38A1F0"/>
      <stop offset="1" stop-color="#1452A8"/>
    </linearGradient>
  </defs>
  <rect width="${C}" height="${C}" fill="${SPLASH_BG_COLOR}"/>
  <!-- Logo cuadrado redondeado con gradiente -->
  <rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="${logoSize * 0.22}" fill="url(#g)"/>
  <!-- Reloj -->
  <circle cx="${cx}" cy="${cy}" r="${r * 0.57}" fill="none" stroke="#fff" stroke-width="${r * 0.124}"/>
  <path d="M ${cx} ${cy - r * 0.31} L ${cx} ${cy} L ${cx + r * 0.22} ${cy + r * 0.095}"
        fill="none" stroke="#fff" stroke-width="${r * 0.137}"
        stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Sol arriba del logo (fuera del reloj) -->
  <circle cx="${cx}" cy="${logoY - r * 0.06}" r="${r * 0.10}" fill="#FFEAA7"/>
</svg>`);
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 Generando assets Android desde resources/icons/...\n");

  // 1. Legacy icons (mipmap-{density}/ic_launcher.png + _round)
  for (const [density, size] of Object.entries(LEGACY_SIZES)) {
    const outDir = path.join(ANDROID_RES, `mipmap-${density}`);
    fs.mkdirSync(outDir, { recursive: true });
    await sharp(ICON_SVG).resize(size, size).png().toFile(path.join(outDir, "ic_launcher.png"));
    await sharp(ICON_SVG).resize(size, size).png().toFile(path.join(outDir, "ic_launcher_round.png"));
    console.log(`✓ mipmap-${density}/ic_launcher.png  (${size}×${size})`);
  }

  // 2. Adaptive foreground icons
  for (const [density, size] of Object.entries(ADAPTIVE_FG_SIZES)) {
    const outDir = path.join(ANDROID_RES, `mipmap-${density}`);
    fs.mkdirSync(outDir, { recursive: true });
    await sharp(ICON_FOREGROUND_SVG).resize(size, size).png().toFile(
      path.join(outDir, "ic_launcher_foreground.png")
    );
    console.log(`✓ mipmap-${density}/ic_launcher_foreground.png  (${size}×${size})`);
  }

  // 3. Adaptive icon XML (anydpi-v26)
  const anydpiDir = path.join(ANDROID_RES, "mipmap-anydpi-v26");
  fs.mkdirSync(anydpiDir, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpiDir, "ic_launcher.xml"), adaptiveXml);
  fs.writeFileSync(path.join(anydpiDir, "ic_launcher_round.xml"), adaptiveXml);
  console.log(`✓ mipmap-anydpi-v26/ic_launcher.xml`);
  console.log(`✓ mipmap-anydpi-v26/ic_launcher_round.xml`);

  // 4. Limpiar drawables conflictivos que Capacitor genera por default
  const drawableDir = path.join(ANDROID_RES, "drawable");
  const drawableV24Dir = path.join(ANDROID_RES, "drawable-v24");
  for (const dir of [drawableDir, drawableV24Dir]) {
    for (const f of ["ic_launcher_background.xml", "ic_launcher_foreground.xml"]) {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`✓ borrado ${path.relative(ANDROID_RES, p)} (conflicto)`);
      }
    }
  }

  // 5. Color resource para el background del adaptive icon
  const valuesDir = path.join(ANDROID_RES, "values");
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(path.join(valuesDir, "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ADAPTIVE_BG_COLOR}</color>
</resources>
`);
  console.log(`✓ values/ic_launcher_background.xml  (${ADAPTIVE_BG_COLOR})`);

  // 6. Splash screens (solo logo, fondo claro neutro)
  console.log("\nGenerando splash...");
  for (const [folder, [w, h]] of Object.entries(SPLASH_SIZES)) {
    const outDir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(outDir, { recursive: true });
    const splashSvg = buildSplashSvg();
    await sharp(splashSvg)
      .resize(w, h, { fit: "cover", position: "center", background: SPLASH_BG_COLOR })
      .png()
      .toFile(path.join(outDir, "splash.png"));
    console.log(`✓ ${folder}/splash.png  (${w}×${h})`);
  }

  // Default fallback
  const defaultSplashDir = path.join(ANDROID_RES, "drawable");
  fs.mkdirSync(defaultSplashDir, { recursive: true });
  const splashSvg = buildSplashSvg();
  await sharp(splashSvg)
    .resize(480, 320, { fit: "cover", position: "center", background: SPLASH_BG_COLOR })
    .png()
    .toFile(path.join(defaultSplashDir, "splash.png"));
  console.log(`✓ drawable/splash.png  (480×320, fallback)`);

  console.log("\n✅ Todos los assets generados.");
  console.log("\nPróximos pasos:");
  console.log("  1. npm run patch:android   (configura splash theme + deep link)");
  console.log("  2. npx cap sync android");
  console.log("  3. Desinstalá la app del emulador (Android cachea íconos)");
  console.log("  4. En Android Studio: Build → Clean → Rebuild → Run");
}

main().catch(err => {
  console.error("❌ Error generando assets:", err);
  process.exit(1);
});
