#!/usr/bin/env node

// ─── scripts/generate-android-assets.js ─────────────────────────────────
//
// Genera todos los íconos y splash screens de Android desde los SVG
// fuente en resources/icons/.
//
// USO:
//
//   npm run icons:generate
//
// Después correr una vez:
//
//   npx cap copy android
//
// (o npm run sync, lo que prefieras) para que los assets copien al
// directorio android/.
//
// Lo que genera:
//
//   ÍCONOS LEGACY (para Android <8):
//     android/app/src/main/res/mipmap-mdpi/ic_launcher.png        (48px)
//     android/app/src/main/res/mipmap-hdpi/ic_launcher.png        (72px)
//     android/app/src/main/res/mipmap-xhdpi/ic_launcher.png       (96px)
//     android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png      (144px)
//     android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png     (192px)
//     ic_launcher_round.png (mismos tamaños) — versión circular
//
//   ÍCONO ADAPTATIVO (Android 8+):
//     android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png   (108px)
//     android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png   (162px)
//     android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png  (216px)
//     android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png (324px)
//     android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png(432px)
//
//   ARCHIVO XML del adaptive icon:
//     android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
//     android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
//     android/app/src/main/res/values/ic_launcher_background.xml
//     (definen background color + foreground PNG)
//
//   SPLASH SCREEN:
//     android/app/src/main/res/drawable/splash.png                 (480×320)
//     android/app/src/main/res/drawable-port-mdpi/splash.png       (320×480)
//     android/app/src/main/res/drawable-port-hdpi/splash.png       (480×800)
//     android/app/src/main/res/drawable-port-xhdpi/splash.png      (720×1280)
//     android/app/src/main/res/drawable-port-xxhdpi/splash.png     (960×1600)
//     android/app/src/main/res/drawable-port-xxxhdpi/splash.png    (1280×1920)
//     android/app/src/main/res/drawable-land-mdpi/splash.png       (480×320)
//     android/app/src/main/res/drawable-land-hdpi/splash.png       (800×480)
//     android/app/src/main/res/drawable-land-xhdpi/splash.png      (1280×720)
//     android/app/src/main/res/drawable-land-xxhdpi/splash.png     (1600×960)
//     android/app/src/main/res/drawable-land-xxxhdpi/splash.png    (1920×1280)

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
const SPLASH_SVG = fs.readFileSync(path.join(SRC_DIR, "splash.svg"));

// El color de background del adaptive icon es plano (#1a1a1a).
const ADAPTIVE_BG_COLOR = "#1a1a1a";

// ─── Legacy icons (mipmap-{density}/ic_launcher.png) ───────────────────
const LEGACY_SIZES = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

// ─── Adaptive foreground sizes (mipmap-{density}/ic_launcher_foreground.png) ─
// Los foregrounds adaptativos son 108dp en density-independent units.
// En pixels: 108 × density factor.
const ADAPTIVE_FG_SIZES = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

// ─── Splash sizes ───────────────────────────────────────────────────────
// (width, height) por densidad. Portrait y landscape.
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

async function main() {
  console.log("🎨 Generando assets Android desde resources/icons/...\n");

  // 1. Legacy icons (square + round versions)
  for (const [density, size] of Object.entries(LEGACY_SIZES)) {
    const outDir = path.join(ANDROID_RES, `mipmap-${density}`);
    fs.mkdirSync(outDir, { recursive: true });

    // ic_launcher.png — square
    await sharp(ICON_SVG)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, "ic_launcher.png"));

    // ic_launcher_round.png — same image, Android crops to circle at runtime
    await sharp(ICON_SVG)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, "ic_launcher_round.png"));

    console.log(`✓ mipmap-${density}/ic_launcher.png  (${size}×${size})`);
  }

  // 2. Adaptive foreground icons
  for (const [density, size] of Object.entries(ADAPTIVE_FG_SIZES)) {
    const outDir = path.join(ANDROID_RES, `mipmap-${density}`);
    fs.mkdirSync(outDir, { recursive: true });

    await sharp(ICON_FOREGROUND_SVG)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, "ic_launcher_foreground.png"));

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

  // 4. ic_launcher_background color resource
  const valuesDir = path.join(ANDROID_RES, "values");
  fs.mkdirSync(valuesDir, { recursive: true });

  // Read existing colors.xml if it exists, replace or add ic_launcher_background
  const colorsPath = path.join(valuesDir, "ic_launcher_background.xml");
  const bgColorXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ADAPTIVE_BG_COLOR}</color>
</resources>
`;
  fs.writeFileSync(colorsPath, bgColorXml);
  console.log(`✓ values/ic_launcher_background.xml`);

  // 5. Splash screens
  for (const [folder, [w, h]] of Object.entries(SPLASH_SIZES)) {
    const outDir = path.join(ANDROID_RES, folder);
    fs.mkdirSync(outDir, { recursive: true });

    // El splash SVG es cuadrado 2732×2732 con el logo centrado.
    // Para portrait/landscape, hacemos resize a "cover" para que el
    // logo quede centrado y el fondo #1a1a1a llene los bordes.
    // Como el fondo del SVG es #1a1a1a, cover funciona perfecto sin
    // bordes raros.
    await sharp(SPLASH_SVG)
      .resize(w, h, {
        fit: "cover",
        position: "center",
        background: ADAPTIVE_BG_COLOR,
      })
      .png()
      .toFile(path.join(outDir, "splash.png"));

    console.log(`✓ ${folder}/splash.png  (${w}×${h})`);
  }

  // Default drawable/splash.png (fallback que Android usa si no hay
  // qualifier que matchee)
  const defaultSplashDir = path.join(ANDROID_RES, "drawable");
  fs.mkdirSync(defaultSplashDir, { recursive: true });
  await sharp(SPLASH_SVG)
    .resize(480, 320, { fit: "cover", position: "center", background: ADAPTIVE_BG_COLOR })
    .png()
    .toFile(path.join(defaultSplashDir, "splash.png"));
  console.log(`✓ drawable/splash.png  (480×320, fallback)`);

  console.log("\n✅ Todos los assets generados.");
  console.log("");
  console.log("Próximos pasos en tu PC:");
  console.log("  1. npx cap copy android   (copia los nuevos assets al wrapper)");
  console.log("  2. Build → Rebuild en Android Studio");
  console.log("  3. Desinstalá la app vieja del emulador (sino usa el ícono cacheado)");
  console.log("  4. Run → debería abrir con splash nuevo + ícono nuevo");
}

main().catch(err => {
  console.error("❌ Error generando assets:", err);
  process.exit(1);
});
