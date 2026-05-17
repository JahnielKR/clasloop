# FASE 1 — Setup Capacitor (instrucciones para Jota)

**Estado:** archivos de config + código Capacitor instalado en el repo.
**Falta:** correr comandos en tu Mac para generar el wrapper Android.

---

## Antes de empezar

Confirmá que tenés instalado en tu Mac:

```bash
node --version    # debe ser ≥18
npm --version     # debe ser ≥9
```

Y para Android development necesitás **Android Studio**:

- Descarga: https://developer.android.com/studio
- Instalación toma 15-30 minutos (es grande, ~3GB)
- Cuando lo abrís por primera vez, hace setup wizard: aceptar todos los defaults

Mientras se descarga Android Studio, podés ir haciendo los pasos 1-3 abajo. Para los pasos 4+ ya necesitás Android Studio listo.

---

## Pasos a correr

### 1. Bajar el repo actualizado

```bash
cd /donde/sea/que/tengas/clasloop-fresh/clasloop-phase1
git pull origin main
npm install
```

Esto instala las nuevas deps: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, y los plugins (app, splash-screen, status-bar, keyboard).

### 2. Verificar que la web sigue funcionando

```bash
npm run dev
```

Abrir http://localhost:3000, verificar que TODO sigue funcionando como antes. Login, decks, sesiones — todo igual. **Si algo se rompió decímelo antes de seguir.**

Si todo va bien, **Ctrl+C** para parar el dev server.

### 3. Build para producción

```bash
npm run build
```

Esto genera `dist/`. Capacitor va a copiar este directorio al wrapper Android en el próximo paso.

### 4. Agregar Android al proyecto

```bash
npx cap add android
```

Esto crea el directorio `android/` con un proyecto Android Studio completo. Incluye:
- `android/app/src/main/AndroidManifest.xml` (permisos)
- `android/app/build.gradle` (versión, signing, etc)
- `android/app/src/main/assets/public/` (donde va el dist/)
- ... y mucho más

**Output esperado:** algo como `✔ Adding native android project in android in [seconds]`.

### 5. Sincronizar el build web con Android

```bash
npx cap sync android
```

Esto copia `dist/` adentro de `android/app/src/main/assets/public/` y registra todos los plugins instalados en el wrapper Android.

**Output esperado:** lista de plugins encontrados (@capacitor/app, @capacitor/splash-screen, etc).

### 6. Abrir Android Studio

```bash
npx cap open android
```

Esto abre Android Studio con el proyecto `android/` cargado. La primera vez tarda un montón porque va a:
- Hacer Gradle sync (descarga dependencias Java, puede ser 5-15 min)
- Indexar el proyecto

**Tomá un café.** Cuando termine, verás un mensaje "Gradle sync finished" abajo a la derecha.

### 7. Crear un emulador (si no tenés ninguno)

En Android Studio:
- Menú: **Tools → Device Manager**
- Click "Create Device"
- Elegí "Pixel 7" (o cualquier teléfono moderno)
- "Next" → elegí imagen "API 34" (Android 14) → descargá si te lo pide
- "Next" → "Finish"

Vuelvas a Device Manager y arranca el emulador (▶ play button al lado del Pixel 7).

### 8. Correr la app

Con el emulador corriendo, en Android Studio:
- Arriba en la barra hay un menú "app" con un botón ▶ verde
- Click el ▶ verde
- En ~30 segundos verás la app abrir en el emulador

**Lo que deberías ver:**
- Splash screen oscuro brevemente
- Después la home de Clasloop, exactamente como en la web
- Click sidebar items → navega normalmente

### 9. Probar en tu Android real (opcional pero recomendado)

Si tenés un Android, conectalo por USB con USB Debugging habilitado:
- En tu Android: Settings → About phone → tap "Build number" 7 veces (habilita Developer Options)
- Settings → System → Developer Options → habilita "USB Debugging"
- Conectalo al Mac por USB
- Aceptar el popup "Allow USB Debugging" en tu Android

En Android Studio el dropdown de devices ahora muestra tu Android. Cambiá el target del play button al device real y dale play. La app va a instalarse y abrirse en tu Android.

---

## ¿Qué validar en este punto?

Probá en el emulador o device real:

- [ ] App abre con splash oscuro
- [ ] Llega a la home de Clasloop sin errores
- [ ] Login con email/password funciona
- [ ] Sidebar abre/cierra
- [ ] Navegación entre páginas funciona
- [ ] PDF export funciona (puede que tenga issues, anotalos)
- [ ] El back button del Android (gesto o botón) navega atrás en lugar de cerrar la app

**Cosas que probablemente NO funcionan todavía (es esperado, las arreglamos en FASE 2):**

- [ ] Login con Google OAuth (necesitamos configurar callback URL)
- [ ] Realtime de Supabase puede tener quirks
- [ ] Keyboard avoiding en inputs cerca del fondo de la pantalla
- [ ] Safe areas en devices con notch o nav bar (Galaxy Tab S9 no tiene, pero Pixel sí)

---

## Si algo falla

Tomar screenshot/foto del error y mandar. Errores comunes:

**"SDK location not found"** — En Android Studio: File → Project Structure → SDK Location → setear path al Android SDK. Generalmente `~/Library/Android/sdk`.

**"Gradle build failed"** — En Android Studio abajo aparece el log. Copia el último error y mandalo.

**"Plugin X not implemented on android"** — Algún plugin no se registró. Correr de nuevo `npx cap sync android` desde el directorio raíz.

**App abre pero pantalla blanca** — Devtools del WebView: en Chrome desktop abrir `chrome://inspect/#devices`. Tu emulador debe aparecer ahí. Click "inspect" → ves la consola JS. Pasame errores.

---

## Próximos pasos (FASE 2, próxima sesión)

Una vez que tengas la app abriendo en el emulador, próxima sesión hacemos:

1. Smoke test completo (todos los flows críticos)
2. Arreglar OAuth con Google (lo más jodido)
3. Arreglar PDF export en mobile
4. Hardware back button polish
5. Keyboard avoiding
6. Safe areas

Decime cómo va con esto.
