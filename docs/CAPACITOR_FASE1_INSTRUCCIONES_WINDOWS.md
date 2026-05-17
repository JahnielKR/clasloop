# FASE 1 — Setup Capacitor (instrucciones para Jota en Windows)

**Estado:** archivos de config + código Capacitor instalado en el repo.
**Falta:** correr comandos en tu Windows para generar el wrapper Android.

> Esta es la versión Windows. Para Mac usá `CAPACITOR_FASE1_INSTRUCCIONES.md`.
> Los pasos son casi idénticos — solo cambian los paths y algunos comandos
> de PowerShell vs Terminal.

---

## Antes de empezar

### Node.js y npm

Abrí **PowerShell** (no CMD, PowerShell es más moderno) y verificá:

```powershell
node --version    # debe ser ≥18
npm --version     # debe ser ≥9
```

Si no los tenés instalados, bajalos de https://nodejs.org (versión LTS).

### Git

```powershell
git --version
```

Si no lo tenés, https://git-scm.com/download/win.

### Android Studio

Para Android development necesitás **Android Studio**:

- Descarga: https://developer.android.com/studio
- Tamaño: ~1.5 GB el instalador, ~5 GB total después de instalar
- Instalación toma 20-40 minutos
- Durante el setup wizard: aceptar todos los defaults (incluyendo "Standard installation")
- Después del setup, Android Studio descarga el Android SDK (~3 GB más). **Dejalo terminar**, no cierres la ventana de download.

Mientras Android Studio descarga, podés ir haciendo los pasos 1-3 abajo (que no lo necesitan).

### Variables de entorno (importante en Windows)

Esto es **crítico en Windows** y suele ser donde la gente se traba. Después de instalar Android Studio hay que setear 2 variables:

1. **Abrir System Properties:**
   - Win + R → escribir `sysdm.cpl` → Enter
   - Pestaña "Advanced" → botón "Environment Variables"

2. **Agregar `ANDROID_HOME`:**
   - En "User variables" (la sección de arriba) → "New"
   - Variable name: `ANDROID_HOME`
   - Variable value: `C:\Users\<TU_USUARIO>\AppData\Local\Android\Sdk`
     (reemplazá `<TU_USUARIO>` por tu nombre de usuario de Windows)
   - "OK"

3. **Editar `Path`:**
   - En "User variables" → seleccionar "Path" → "Edit"
   - "New" → agregar: `%ANDROID_HOME%\platform-tools`
   - "New" → agregar: `%ANDROID_HOME%\emulator`
   - "OK" en todas las ventanas

4. **Cerrar y reabrir PowerShell** para que tome las variables nuevas.

5. **Verificar:**
   ```powershell
   echo $env:ANDROID_HOME
   adb --version
   ```

   Si `adb --version` te devuelve la versión, está bien. Si dice "no se reconoce", revisá los pasos 2-3.

### Java JDK

Android Studio trae su propio JDK embebido y Capacitor lo usa automáticamente desde Windows si está bien configurado. No deberías necesitar instalar Java por separado en versiones recientes. **Si en el paso 4 tirás error de Java, ahí vemos.**

---

## Pasos a correr

### 1. Bajar el repo actualizado

Abrí PowerShell, navegá al directorio del proyecto:

```powershell
cd C:\donde\sea\que\tengas\clasloop-fresh\clasloop-phase1
git pull origin feature/capacitor-android
npm install
```

> **Importante:** estamos en la branch `feature/capacitor-android`, no en `main`. Por eso el `git pull origin feature/capacitor-android`. Si no estás en esa branch:
> ```powershell
> git checkout feature/capacitor-android
> ```

Esto instala las nuevas deps: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, y los plugins (app, splash-screen, status-bar, keyboard).

### 2. Verificar que la web sigue funcionando

```powershell
npm run dev
```

Abrir http://localhost:3000 en el browser, verificar que TODO sigue funcionando como antes. Login, decks, sesiones — todo igual. **Si algo se rompió decímelo antes de seguir.**

Si todo va bien, **Ctrl+C** en PowerShell para parar el dev server.

### 3. Build para producción

```powershell
npm run build
```

Esto genera el directorio `dist\`. Capacitor va a copiar este directorio al wrapper Android en el próximo paso.

### 4. Agregar Android al proyecto

```powershell
npx cap add android
```

Esto crea el directorio `android\` con un proyecto Android Studio completo. Incluye:
- `android\app\src\main\AndroidManifest.xml` (permisos)
- `android\app\build.gradle` (versión, signing, etc)
- `android\app\src\main\assets\public\` (donde va el dist\)
- ... y mucho más

**Output esperado:** algo como `✔ Adding native android project in android in [seconds]`.

> **Si tira error "Unable to find Android SDK"**, revisá las variables de entorno del paso "Antes de empezar". `ANDROID_HOME` tiene que estar bien seteada y PowerShell tiene que estar cerrado y reabierto después de setearla.

### 5. Sincronizar el build web con Android

```powershell
npx cap sync android
```

Esto copia `dist\` adentro de `android\app\src\main\assets\public\` y registra todos los plugins instalados en el wrapper Android.

**Output esperado:** lista de plugins encontrados (@capacitor/app, @capacitor/splash-screen, etc).

### 6. Abrir Android Studio

```powershell
npx cap open android
```

Esto abre Android Studio con el proyecto `android\` cargado. **La primera vez tarda un montón** porque va a:
- Hacer Gradle sync (descarga dependencias Java, **puede ser 10-20 minutos** la primera vez)
- Indexar el proyecto

**Tomá un café.** Cuando termine, verás un mensaje "Gradle sync finished" abajo a la derecha.

> **Si Android Studio no abre solo o `npx cap open` falla**, también podés abrirlo manualmente:
> - Abrir Android Studio
> - "Open" → navegar a `C:\path\to\clasloop-phase1\android` → "OK"

### 7. Crear un emulador (si no tenés ninguno)

En Android Studio:
- Menú: **Tools → Device Manager**
- Click "Create Virtual Device" (botón "+")
- Categoría "Phone" → elegí "Pixel 7" (o cualquier teléfono moderno)
- "Next" → elegí imagen "API 34" (Android 14)
  - Si no la tenés, click el ícono de descarga al lado del nombre. Esto descarga ~1 GB.
- "Next" → "Finish"

Volvé a Device Manager y arrancá el emulador (▶ play button al lado del Pixel 7).

> **Si el emulador no arranca o queda en pantalla negra:**
> - Verificá que tenés Intel HAXM (o Hyper-V) habilitado para virtualización
> - Si tu PC no soporta virtualización, podés usar un Android físico en vez del emulador (ver paso 9)

### 8. Correr la app

Con el emulador corriendo, en Android Studio:
- Arriba en la barra hay un menú "app" con un botón ▶ verde
- Verificá que el dropdown al lado dice "Pixel 7 API 34" (o el emulador que creaste)
- Click el ▶ verde
- En ~30-60 segundos verás la app abrir en el emulador

**Lo que deberías ver:**
- Splash screen oscuro brevemente
- Después la home de Clasloop, exactamente como en la web
- Click sidebar items → navega normalmente

### 9. Probar en tu Android real (recomendado)

Si tenés un Android físico, conectalo por USB:

**En tu Android:**
- Settings → About phone → tap "Build number" 7 veces (habilita Developer Options)
  - En algunos teléfonos puede estar en Settings → System → About
- Settings → System → Developer Options → habilitá "USB Debugging"
- Conectalo al PC por USB
- Aceptar el popup "Allow USB Debugging" que aparece en tu Android

**En el PC (PowerShell):**
```powershell
adb devices
```

Debería listar tu device. Si no aparece:
- En tu Android, cambiá el modo USB de "Charging only" a "File Transfer (MTP)"
- En Windows, puede que necesites instalar drivers del fabricante (Samsung, Xiaomi, etc tienen sus drivers propios). En Windows 10/11 modernos suele ser automático.

En Android Studio, el dropdown de devices ahora muestra tu Android. Cambiá el target del play button al device real y dale play. La app va a instalarse y abrirse en tu Android.

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
- [ ] Safe areas en devices con notch o nav bar

---

## Si algo falla

Tomar screenshot del error y mandar. Errores comunes en Windows:

### "SDK location not found" / "Unable to find Android SDK"
- Verificar variable `ANDROID_HOME` (ver sección "Antes de empezar")
- Cerrar y reabrir PowerShell después de setearla
- Alternativa: en Android Studio → File → Project Structure → SDK Location → setear path manualmente

### "Gradle build failed: JDK version"
- Android Studio trae JDK embebido. En Android Studio:
- File → Settings → Build, Execution, Deployment → Build Tools → Gradle
- "Gradle JDK" → seleccionar "Embedded JDK" o JDK 17+

### "JAVA_HOME is not set"
- Setear variable de entorno `JAVA_HOME` apuntando a:
  `C:\Program Files\Android\Android Studio\jbr`
- Cerrar y reabrir PowerShell

### "Plugin X not implemented on android"
- Algún plugin no se registró. Correr de nuevo:
  ```powershell
  npx cap sync android
  ```

### App abre pero pantalla blanca
- DevTools del WebView:
  - Abrir Chrome desktop
  - Ir a `chrome://inspect/#devices`
  - Tu emulador/device debe aparecer ahí. Click "inspect" → ves la consola JS
  - Pasame los errores que ves

### Emulador no arranca / pantalla negra
- Verificar virtualización habilitada en BIOS (Intel VT-x o AMD-V)
- En Windows: Panel de Control → Programas → Activar características de Windows → habilitar "Plataforma de máquina virtual" y "Hyper-V" (si tu Windows lo soporta)
- Alternativa: usar Android físico (paso 9)

### `npx cap` no es reconocido
- Asegurate de estar en el directorio del proyecto:
  ```powershell
  cd C:\path\to\clasloop-phase1
  ```
- Y de haber corrido `npm install` antes

### Permission denied al ejecutar scripts
- Si PowerShell se queja con "execution of scripts is disabled":
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```

---

## Próximos pasos (FASE 2, próxima sesión)

Una vez que tengas la app abriendo en el emulador, próxima sesión hacemos:

1. Smoke test completo (todos los flows críticos)
2. Arreglar OAuth con Google (lo más jodido)
3. Arreglar PDF export en mobile (probablemente con Capacitor Filesystem + Share plugins)
4. Hardware back button polish
5. Keyboard avoiding
6. Safe areas

Decime cómo va con esto.
