# Clasloop Android — Runbook de release a Google Play

Estado al 2026-05-23: el proyecto Android nativo ya está generado, compila, y la
app corre en device (verificado en emulador Pixel_7). Este doc es el paso-a-paso
para firmar el AAB y publicarlo. Lo que **Claude dejó listo en el repo** vs lo que
**hacés vos** está marcado.

---

## 0. Lo que ya quedó listo en el repo (no tenés que rehacerlo)

- Proyecto `android/` generado (`npx cap add android`) con los 9 plugins (incluido ML Kit).
- `capacitor.config.ts`, `vite.config.js base:'./'`, íconos + splash (`npm run icons:generate`).
- Patches aplicados (`npm run patch:android`): proguard-optimize, **deep link `com.clasloop.app://`**, splash legacy, **permiso CAMERA**.
- `versionCode 1` / `versionName "1.0.0"` en `android/app/build.gradle`.
- **Signing config** en `build.gradle` que lee `android/keystore.properties` (gitignored) con guard (sin el archivo, el debug no se rompe).
- `viewport-fit=cover` en `index.html` (activa las safe-areas en notch).
- **Privacy policy** en `public/privacy.html` (se sirve en `https://TU-DOMINIO/privacy.html`) + link en el footer.
- **Feature graphic** 1024×500 en `resources/store/feature-graphic.png` (`npm run store:assets`).

### Reproducir el proyecto nativo desde cero (si alguna vez se borra `android/`)
```bash
npm install
npm run build
npx cap add android
npm run icons:generate
npm run patch:android
npx cap sync android
```

---

## 1. Crear el keystore de upload (UNA sola vez) — TUYO

⚠️ Si perdés este keystore no podés volver a actualizar la app en Play. Guardalo
en un password manager / backup cifrado, **fuera del repo**.

```bash
cd android
keytool -genkey -v -keystore clasloop-upload.jks -alias clasloop \
  -keyalg RSA -keysize 2048 -validity 10000
# (keytool está en el JBR: "C:\Program Files\Android\Android Studio\jbr\bin")
```

Después copiá el template y completá las passwords:
```bash
cp keystore.properties.example keystore.properties
# editá android/keystore.properties con storePassword / keyPassword reales
```

**Recomendado: Play App Signing.** En Play Console activás "Play App Signing":
Google guarda la *app signing key* definitiva y vos solo subís firmado con tu
*upload key* (este keystore). Si perdés el upload key, Google te lo puede resetear
— por eso es la opción segura.

---

## 2. Compilar el AAB de release — local

```bash
npm run build           # con el .env presente (las VITE_SUPABASE_* se hornean acá)
npx cap sync android
cd android
# NODE_ENV=production hace que allowMixedContent quede false (requisito Play)
NODE_ENV=production JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" ./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

> Nota: el `.env` con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` debe estar en
> la raíz del repo al hacer `npm run build`, o la app arranca con el overlay
> "No se cargaron las credenciales de Supabase". El anon key es público (va en el
> bundle web igual que en Vercel) — no es un secreto.

---

## 3. OAuth de Google en el device — TUYO (paso crítico)

El login con Google nativo usa deep link `com.clasloop.app://auth-callback`
(`src/lib/native-oauth.js`, PKCE). El intent-filter ya está en el manifest. Falta
la config del lado servidor:

1. **Supabase → Authentication → URL Configuration → Redirect URLs:** agregá
   `com.clasloop.app://auth-callback`.
2. El provider Google ya está habilitado para la web; el flujo nativo lo reutiliza
   vía Supabase, así que normalmente no hace falta tocar Google Cloud Console.
3. **Probalo en un device real** (no emulador sin Google Play services): login
   Google → debe volver a la app y quedar logueado. Es el punto más frágil; si algo
   falla, revisá que el redirect URL esté exacto en Supabase.

Login con email/password funciona sin esto.

---

## 4. Smoke test en device real (antes de subir)

Instalá el AAB/APK y probá:
- [ ] App abre (splash → landing).
- [ ] Login email/password.
- [ ] Login Google (round-trip del deep link).
- [ ] Crear/lanzar una sesión, unirse desde otro teléfono.
- [ ] Export PDF → abre el share sheet (Drive/Gmail/imprimir).
- [ ] Scanner: pide permiso de cámara, ML Kit detecta la hoja.
- [ ] Botón atrás de Android navega adentro, no cierra la app.
- [ ] Teclado no tapa los inputs (join code, free-text).

Para probar el AAB tal cual lo recibe Play: `bundletool build-apks --bundle=app-release.aab ...`
o subilo a Internal testing (más simple).

---

## 5. Play Console — TUYO

1. **Cuenta de developer:** US$25 pago único (https://play.google.com/console).
2. **Crear app:** nombre "Clasloop", idioma default, app/free.
3. **Subir el AAB a Internal testing primero** (no Production directo).
4. ⚠️ **Realidad de cuentas personales nuevas (desde 2023):** antes de poder pedir
   acceso a Production necesitás **closed testing con 12+ testers durante 14 días
   corridos**. Planificá los testers (profes amigos, etc.) desde el inicio: Internal
   → Closed (12+ testers, 14 días) → Production. Cuentas de organización pueden
   saltearlo, no las personales.

### Listing (textos)

**Short description (≤80 chars):**
- EN: `Daily warmups & exit tickets — AI builds them, you launch live or print.`
- ES: `Warmups y exit tickets diarios: la IA los crea, los lanzás en vivo o imprimís.`

**Full description (EN, ajustá a gusto):**
```
Clasloop helps teachers run the daily class routine — warmups, exit tickets and
live quizzes — and remembers what each class needs to review next.

• Generate a quiz from any file or topic in seconds. AI writes the questions and a
  second model verifies them.
• Launch live: students join from their phones with a PIN, just like Kahoot.
• Or print a clean exam + answer key as PDF.
• Spaced repetition tracks what each class is forgetting and tells you what to
  review — not just more data, an actual decision.
• Scan printed answer sheets with your camera to grade them fast (on-device).

Built for secondary-school and language teachers with persistent classes.
```
ES: traducir lo de arriba (la app es EN/ES/KO; podés subir listing localizado).

### Graphics
- **App icon:** ya en el AAB (adaptive). Play también pide un ícono 512×512 — exportable del logo.
- **Feature graphic:** `resources/store/feature-graphic.png` (1024×500).
- **Screenshots (mín 2 phone):** sacalas del device con la app real (Settings →
  capturas, o `adb exec-out screencap -p > shot.png`). Buenas: landing, generar
  warmup, sesión en vivo, resultados, scanner.

### Data safety form
- **Datos recolectados:** email/perfil (auth), contenido de clase y respuestas de
  quiz, imágenes de scan (cámara), analytics de uso, crash logs.
- **Cámara:** solo on-device, al iniciar un scan; imágenes en bucket privado,
  auto-borradas a los 7 días.
- **Sin venta de datos. Sin publicidad de terceros.** Datos cifrados en tránsito.
  Borrado de cuenta disponible in-app (Settings → Delete account).
- Privacy policy URL: `https://TU-DOMINIO/privacy.html` (completá `[SUPPORT EMAIL]`
  y `[LEGAL NAME]` en `public/privacy.html` antes de publicar).

### Content rating
- Categoría **Education**. Cuestionario: sin violencia/contenido sexual/drogas →
  rating "Everyone / PEGI 3". Es app educativa con contenido generado por docentes.

---

## 6. Checklist final antes de Production
- [ ] `keystore.properties` configurado + keystore respaldado.
- [ ] AAB de release firmado compila (`bundleRelease`).
- [ ] `.env` presente en el build (Supabase no vacío).
- [ ] Redirect `com.clasloop.app://auth-callback` en Supabase.
- [ ] Smoke test en device (sección 4) OK.
- [ ] Privacy policy con email/legal reales + accesible en su URL.
- [ ] Listing (textos + feature graphic + ≥2 screenshots) cargado.
- [ ] Data safety + content rating completados.
- [ ] Closed testing 12+ testers / 14 días cumplido (cuenta personal).
