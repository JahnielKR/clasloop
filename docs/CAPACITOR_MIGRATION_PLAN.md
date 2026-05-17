# Plan de migración a app nativa (Capacitor) — PR 50+

**Fecha de inicio:** 2026-05-17
**Decisión:** ir a app nativa después de que el CV pipeline web (PR 49.x) no diera resultados confiables en mobile. El scanner cam necesita APIs nativas para funcionar bien. Aprovechamos para tener app nativa completa.

**Stack elegido:** **Capacitor + React + Vite** (mismo stack actual, envuelto en WebView nativa).

**Razón:** preserva 100% del código actual de Clasloop, agrega acceso a APIs nativas vía plugins. No es reescribir, es envolver.

---

## Por qué Capacitor (no React Native ni Tauri)

| Opción | Veredicto | Razón |
|---|---|---|
| **Capacitor** | ✅ ELEGIDO | Web app actual + plugins nativos. Cero reescritura. |
| **React Native** | ❌ | Habría que rehacer cada pantalla en componentes nativos. Mucho trabajo perdido. |
| **Tauri** | ❌ | Mobile aún joven, comunidad chica, docs ralos. Mejor para desktop. |
| **PWA pura** | ❌ | Sin APIs nativas de cámara, sin distribución en stores. Lo que ya tenemos. |

---

## Por qué empezar con Android, no iOS

- Android: $25 USD **pago único vitalicio**, gratis para development
- iOS: $99 USD/año, se renueva cada año o las apps salen del store
- Android tiene review más permisivo (menos rejections por detalles)
- Capacitor maneja ambos del mismo codebase: agregar iOS después es 1 comando (`npx cap add ios`)
- Jota tiene Mac → iOS development será directo cuando llegue el momento

---

## FASES

### FASE 1 — Setup base de Capacitor (1 sesión)

**Objetivo:** App básica corriendo en emulador Android.

Pasos:
1. `npm install @capacitor/core @capacitor/cli @capacitor/android`
2. `npx cap init` con app name "Clasloop", bundle ID `com.clasloop.app`
3. Modificar `vite.config.js` para que build a `dist/` (default ya es eso)
4. `npx cap add android`
5. `npm run build && npx cap sync`
6. `npx cap open android` (abre Android Studio)
7. Probar app en emulador → debería abrir la web app actual sin cambios
8. Configurar splash screen + ícono + nombre en `capacitor.config.ts`
9. Configurar status bar para que respete el tema oscuro/claro

**Decisiones pendientes para esta fase:**
- Bundle ID definitivo (`com.clasloop.app` propuesto)
- Display name en el cajón de apps ("Clasloop" o "Clasloop · Teach")
- Color de splash screen (tema oscuro o claro)
- Versión inicial (`1.0.0`)

**Riesgos:**
- Vite + Capacitor a veces tienen issues con paths absolutos. Hay que asegurar `base: './'` en `vite.config.js`.
- Supabase auth callback URL: cambiar de `claude.ai/...` (no aplica) → URL scheme custom `clasloop://auth-callback` o usar `localhost:CapacitorWebview`.

---

### FASE 2 — Smoke test en device real (1 sesión)

**Objetivo:** Validar que todo Clasloop funciona dentro de la WebView de Capacitor en un Android real.

Pasos:
1. Conectar Android personal de Jota por USB con USB debugging habilitado
2. Instalar app por sideload (sin Play Store)
3. Probar flows críticos uno por uno:
   - Login con email/password
   - Login con Google OAuth (probablemente hay que ajustar el callback URL)
   - Sign up + role onboarding
   - Crear deck
   - Crear sesión / unirse a sesión
   - PDF export (probablemente hay que ajustar download path → usa filesystem plugin)
4. Identificar quirks de WebView:
   - Keyboard avoiding (cuando input está al fondo, no se tape)
   - Safe areas (notch, navigation bar de Android)
   - Status bar color
   - Back button hardware de Android (debe ir atrás dentro de la app, no salir)

**Riesgos altos:**
- **OAuth con Google**: callback URL cambia. Hay que configurar Capacitor con `appUrlOpen` listener + nuevo redirect en Supabase Auth settings.
- **PDF download**: actualmente el browser maneja `URL.createObjectURL`. En WebView puede no funcionar bien. Posible uso del plugin `@capacitor/filesystem` para guardar a Downloads.
- **Hardware back button**: por default cierra la app. Hay que hookear con `App.addListener('backButton', ...)` para que haga back en la nav interna.

---

### FASE 3 — Cámara nativa con plugin Capacitor (1 sesión)

**Objetivo:** Reemplazar `getUserMedia` del scanner por la API nativa de Capacitor Camera.

Pasos:
1. `npm install @capacitor/camera`
2. `npx cap sync`
3. Configurar permisos en `AndroidManifest.xml` (`CAMERA`, `WRITE_EXTERNAL_STORAGE`)
4. Modificar `Scanner.jsx`:
   - Detectar si estamos en Capacitor (`Capacitor.isNativePlatform()`)
   - Si nativo: usar `Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.Uri })`
   - Si web: usar el `getUserMedia` actual (deja la web app funcionando)
5. La API nativa retorna directo una **foto de alta resolución**, no un stream. Es más simple: no hay marco guía animado, no hay preview, el sistema operativo maneja la UX de la cámara (interfaz nativa de cámara con focus, exposure auto, zoom, todo built-in)
6. Mantener el procesamiento JS puro del PR 49.5/49.6 para validar que con una foto **de calidad nativa** el CV puro funciona mejor

**Pregunta abierta para esta fase:**
- ¿Mantenemos el JS puro como fallback, o ya pasamos directo a CV nativo?
- Si funciona bien con JS puro + foto nativa de alta calidad, podríamos saltarnos la FASE 4

---

### FASE 4 — OpenCV/CV nativo en el scanner (1-2 sesiones)

**Solo necesaria si FASE 3 no es suficiente.** Si la foto nativa + JS puro ya da resultados confiables, **saltamos esta fase**.

Si necesitamos CV nativo, opciones:

**Opción A: Plugin existente de OpenCV para Capacitor**
- Buscar plugins en https://capacitorjs.com/docs/plugins
- Existen wrappers comunitarios de OpenCV nativo
- Tiempo: 1 sesión si funciona

**Opción B: Plugin custom de Capacitor**
- Escribir un plugin Java/Kotlin (Android) que toma una foto y devuelve respuestas detectadas
- Usa OpenCV nativo Android (sí, existe)
- Tiempo: 2-3 sesiones

**Opción C: ML Kit de Google (Android nativo)**
- Document Scanner API (gratis, on-device)
- Detección de rectángulos + perspective correction automática
- Tiempo: 1-2 sesiones
- Limitación: solo Android. Para iOS habría que usar Vision Framework.

**Mi recomendación cuando lleguemos a esta fase:** empezar por A (plugin existente). Si no, B con OpenCV Android nativo.

---

### FASE 5 — Build, deploy a Play Store (1 sesión)

**Objetivo:** Tener APK + AAB para distribuir.

Pasos:
1. Generar **keystore** de release (`keytool -genkey`). GUARDAR BIEN — sin este keystore no podés actualizar la app después.
2. Configurar `android/app/build.gradle` con el signing config
3. `npx cap build android --prod`
4. Probar el AAB resultante en device real
5. Pagar $25 Google Play Developer
6. Crear listing en Google Play Console
7. Subir AAB a **Internal Testing track** primero (no Production)
8. Invitar a tester (Jota + amigo profe + 1-2 más)
9. Después de validación, mover a **Closed Testing** → **Open Testing** → **Production**

**Cosas que hay que preparar para el listing:**
- Screenshots (mínimo 2, recomendado 4-8) — diferentes tamaños
- Feature graphic (1024×500)
- Ícono adaptivo
- Descripción corta (80 chars) + completa
- Privacy Policy URL (REQUERIDO) — hay que escribir una
- Categoría (Education)
- Rating (PEGI/ESRB) — questionnaire

---

### FASE 6 — Capgo para OTA updates (½ sesión)

**Objetivo:** Poder pushear updates de JS/CSS sin esperar review de Play Store.

Cuando arreglamos un bug y la fix es solo JS, no queremos esperar 1-3 días de review de Google para que llegue a los usuarios.

[Capgo](https://capgo.app/) permite pushear updates JS sin App Store review. Lo usa el dev que cité en la búsqueda. Costo: hay tier gratis. Para más usuarios, ~$15/mes.

---

### FASE 7 — iOS cuando estés listo (1-2 sesiones)

**Cuando Jota decida pagar Apple Developer ($99/año):**
1. `npx cap add ios`
2. `npx cap sync`
3. `npx cap open ios` → abre Xcode
4. Configurar signing en Xcode con cuenta Apple Developer
5. Resolver issues de iOS específicos (suelen ser pocos, pero hay):
   - Permisos camera en `Info.plist` (`NSCameraUsageDescription`)
   - Safe areas iOS (notch del iPhone)
   - WebView quirks de Safari (algunos diferentes de Chrome Android)
6. Probar en iPhone real de Jota (USB + Mac)
7. TestFlight para beta
8. App Store review (más estricta, primer rejection es común)

---

## Riesgos & cosas a tener en cuenta

### OAuth con Google va a romper

Cuando movés Clasloop a Capacitor, el redirect URL de Google OAuth cambia. Hay que:
1. Configurar `appUrlOpen` listener en Capacitor
2. Agregar nuevo redirect URL en Supabase Auth settings
3. Posiblemente cambiar de browser-based OAuth a **Google Sign-In SDK nativo** (más fluido, pero más setup)

Este es de los issues más complicados. Tenerlo presente.

### Supabase realtime

Las subscriptions de Supabase usan WebSockets. En Capacitor funcionan, pero pueden tener quirks con el lifecycle de la app (cuando se va a background, etc).

### PDF export

`jsPDF` + `URL.createObjectURL` puede no funcionar bien en WebView. Posible solución:
- Capacitor Filesystem plugin → guardar a `Documents/`
- Capacitor Share plugin → abrir el "share sheet" nativo de Android para que el profe lo mande por WhatsApp, drive, etc.

### Mobile performance

WebView no es tan rápido como nativo puro. La app actual ya funciona bien en mobile browsers, así que en Capacitor también debería andar bien. Pero monitorear FPS especialmente en animaciones complejas (themed quizzes con transitions).

---

## Decisiones pendientes que necesito de Jota antes de codear

| Decisión | Opciones | Veredicto |
|---|---|---|
| Bundle ID | `com.clasloop.app` (propuesto) | TBD |
| Display name | "Clasloop" o "Clasloop · Teach" | TBD |
| Color splash inicial | Tema oscuro o claro | TBD |
| Repo: monorepo o subdir `mobile/` | Subdir parece más prolijo | TBD |
| Privacy Policy: la escribimos juntos o usás template | Template + ajustes | TBD |

---

## Lo que NO se descarta del trabajo previo

Todo el código actual de Clasloop sigue siendo válido:
- Componentes React: idénticos
- Supabase queries: idénticas
- PDF export logic: idéntica
- Sidebar / routing: idéntico
- Auth flow: idéntico (con ajustes para OAuth)

Lo único que **se tira** es la implementación del scanner cam que armamos en PR 49.3 → 49.6 (CV en JS puro). El scaffolding del PR 49.1/49.2 (sidebar item, ruta `/scan`, picker de deck) **se mantiene** porque va a ser el shell que envuelve la implementación nativa.

---

## Timeline realista

| Sesión | Fase | Duración estimada |
|---|---|---|
| 1 | Setup Capacitor + smoke test básico | 2-3h |
| 2 | Smoke test completo + ajustes de quirks | 2-4h |
| 3 | OAuth en Capacitor (probablemente el más jodido) | 2-4h |
| 4 | Camera plugin nativo + intentar CV con JS puro otra vez | 2-3h |
| 5 | Si JS puro no alcanza: CV nativo (opciones A/B/C) | 3-6h |
| 6 | Build de release + signing + Play Store listing | 2-3h |
| 7 | Internal Testing → Production release | 1-2h (+ días de espera de review) |
| Después | iOS cuando Jota pague Apple Developer | 4-8h adicionales |

**Total estimado:** 14-25 horas focadas, distribuido en 6-8 sesiones. Algunas sesiones pueden ser cortas (1h).

---

## Próxima sesión: FASE 1

Cuando arranquemos próxima vez, lo primero es:

1. **Confirmar decisiones pendientes** (bundle ID, display name, etc)
2. **Crear branch nueva** `feature/capacitor-android` para no romper la web app que ya funciona
3. **Ejecutar pasos de FASE 1** uno por uno con validación entre cada uno

Antes de codear nada, escribir un PR description que explique el cambio a alto nivel para que quede como milestone histórico (esto va a ser PR 50 + PR 50.x).
