#!/usr/bin/env node

// ─── scripts/patch-android.js ─────────────────────────────────────────
//
// Aplica patches al directorio `android/` que Capacitor genera con
// `npx cap add android`. Estos cambios son NECESARIOS para que la app
// funcione bien:
//
//   1. proguard-android.txt → proguard-android-optimize.txt
//      Capacitor 8 genera el build.gradle con el primer file, que está
//      deprecated en Android Gradle Plugin 8.2+. Si no se patchea, el
//      build falla con un error de R8.
//
//   2. Intent filter para deep link com.clasloop.app://
//      Para que el callback de Google OAuth (Supabase) abra la app.
//      Sin este intent filter, el sistema operativo no sabe que
//      "com.clasloop.app://" pertenece a Clasloop.
//
// USO:
//
//   npm run patch:android
//
// Idempotente: correrlo dos veces no rompe nada (chequea antes de
// aplicar cada patch).
//
// Cuándo correrlo:
//   - Después de `npx cap add android` (primera vez)
//   - Después de `npx cap update android` (si Capacitor regenera files)
//
// Si más adelante agregamos otras cosas (permisos extra de cámara,
// keystore signing config, etc), se agregan acá como patches nuevos.

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ANDROID_DIR = path.join(ROOT, "android");

if (!fs.existsSync(ANDROID_DIR)) {
  console.error("❌ android/ no existe. Corré primero: npx cap add android");
  process.exit(1);
}

const patches = [
  patchProguard,
  patchDeepLink,
  patchSplashTheme,
];

let totalApplied = 0;
let totalSkipped = 0;
for (const patch of patches) {
  const result = patch();
  if (result === "applied") totalApplied++;
  if (result === "skipped") totalSkipped++;
}

console.log("");
console.log(`✓ ${totalApplied} patch(es) aplicado(s)`);
console.log(`  ${totalSkipped} patch(es) ya estaban aplicados`);

// ─── Patches individuales ─────────────────────────────────────────────

function patchProguard() {
  const filePath = path.join(ANDROID_DIR, "app", "build.gradle");
  if (!fs.existsSync(filePath)) {
    console.warn("⚠ build.gradle no encontrado, skipping proguard patch");
    return "skipped";
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Si ya está aplicado, no hacer nada
  if (content.includes("proguard-android-optimize.txt")) {
    console.log("○ Proguard: ya está aplicado");
    return "skipped";
  }

  if (!content.includes("proguard-android.txt")) {
    console.warn("⚠ Proguard: no encontré 'proguard-android.txt' para reemplazar");
    return "skipped";
  }

  content = content.replace(
    /proguard-android\.txt/g,
    "proguard-android-optimize.txt"
  );

  fs.writeFileSync(filePath, content);
  console.log("✓ Proguard: proguard-android.txt → proguard-android-optimize.txt");
  return "applied";
}

function patchDeepLink() {
  const filePath = path.join(
    ANDROID_DIR, "app", "src", "main", "AndroidManifest.xml"
  );
  if (!fs.existsSync(filePath)) {
    console.warn("⚠ AndroidManifest.xml no encontrado, skipping deep link patch");
    return "skipped";
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Si ya está aplicado, no hacer nada
  if (content.includes('android:scheme="com.clasloop.app"')) {
    console.log("○ Deep link: ya está aplicado");
    return "skipped";
  }

  // El intent-filter que vamos a agregar dentro del <activity>
  // principal de la app. Tiene autoVerify="true" para que Android
  // confíe automáticamente en el scheme (necesario en Android 12+).
  const intentFilter = `
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.clasloop.app" />
            </intent-filter>
`;

  // Lo insertamos justo antes del cierre de la primera <activity> que
  // sea LAUNCHER (la principal).
  const launcherActivityRegex =
    /(<activity[^>]+>[\s\S]*?<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>[\s\S]*?<\/intent-filter>)/;

  if (!launcherActivityRegex.test(content)) {
    console.warn("⚠ Deep link: no encontré la LAUNCHER activity para patchear");
    return "skipped";
  }

  content = content.replace(launcherActivityRegex, (match) => match + intentFilter);

  fs.writeFileSync(filePath, content);
  console.log("✓ Deep link: intent-filter agregado para com.clasloop.app://");
  return "applied";
}

/**
 * PR 53: configurar el Android 12+ Splash Screen API correctamente.
 *
 * En Android 12+, el splash que muestra el sistema operativo NO es el
 * drawable/splash.png que generamos. Es construido por el OS usando 3
 * atributos del tema:
 *   - windowSplashScreenBackground: el color de fondo
 *   - windowSplashScreenAnimatedIcon: el ícono central
 *   - windowSplashScreenAnimationDuration: cuánto dura visible
 *
 * Si no configuramos estos atributos, Android default a:
 *   - background: color del status bar (gris claro por default) ← bug 1
 *   - icon: el app icon adaptive foreground SIN background ← bug 2
 *
 * Por eso veías un splash gris/blanco con el logomark contorneado de
 * negro (era el adaptive foreground sin su background grafito).
 *
 * Patch: sobrescribimos AppTheme.NoActionBarLaunch en styles.xml para
 * setear los 3 atributos a nuestros valores.
 */
function patchSplashTheme() {
  const filePath = path.join(
    ANDROID_DIR, "app", "src", "main", "res", "values", "styles.xml"
  );
  if (!fs.existsSync(filePath)) {
    console.warn("⚠ styles.xml no encontrado, skipping splash theme patch");
    return "skipped";
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Si ya está aplicado, no hacer nada
  if (content.includes("windowSplashScreenBackground")) {
    console.log("○ Splash theme: ya está aplicado");
    return "skipped";
  }

  // Reemplazar el <style name="AppTheme.NoActionBarLaunch"> existente.
  // Capacitor lo genera con un solo item:
  //   <item name="android:background">@drawable/splash</item>
  // Lo reemplazamos con la config moderna del Splash Screen API.
  const newStyle = `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="windowSplashScreenBackground">@color/ic_launcher_background</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="windowSplashScreenAnimationDuration">200</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>`;

  const oldStyleRegex =
    /<style name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/;

  if (!oldStyleRegex.test(content)) {
    console.warn("⚠ Splash theme: no encontré AppTheme.NoActionBarLaunch para patchear");
    return "skipped";
  }

  content = content.replace(oldStyleRegex, newStyle);
  fs.writeFileSync(filePath, content);
  console.log("✓ Splash theme: configurado para Android 12+ Splash Screen API");
  return "applied";
}
