# FASE 2 (Parte 1) — Google OAuth en la app

**Estado:** código JS listo en el repo. Falta correr 1 comando local
que patchea el directorio `android/` (deep link + proguard) y rebuild.

---

## Antes de empezar

Verificá que **ya hiciste esto en Supabase Dashboard**:

1. https://supabase.com/dashboard → tu proyecto Clasloop
2. **Authentication** → **URL Configuration**
3. En **Redirect URLs**, debe estar: `com.clasloop.app://auth-callback`
4. Click "Save"

Si no lo hiciste, el login va a fallar con "redirect URL not allowed".

---

## Pasos a correr

### 1. Bajar el código nuevo

```powershell
cd C:\path\a\clasloop-phase1
git pull origin feature/capacitor-android
npm install
```

`npm install` trae `@capacitor/browser` (nuevo plugin) entre otras cosas.

### 2. Build de producción + sync

```powershell
npm run build
npx cap sync android
```

`cap sync` copia el `dist/` nuevo al wrapper Android y registra el
plugin Browser que acabamos de instalar.

### 3. Aplicar patches al directorio android/ (NUEVO)

```powershell
npm run patch:android
```

Este script aplica DOS cambios al directorio `android/`:

1. **Proguard fix** — el mismo bug que tuvimos antes (`proguard-android.txt` → `proguard-android-optimize.txt`). Si ya lo aplicaste manualmente, el script detecta que está y no hace nada.

2. **Deep link intent filter** — agrega al `AndroidManifest.xml` un intent-filter para que el sistema operativo reconozca `com.clasloop.app://` como URL de nuestra app. Sin esto, el callback de Google nunca vuelve a la app.

**Output esperado:**
```
✓ Proguard: proguard-android.txt → proguard-android-optimize.txt
✓ Deep link: intent-filter agregado para com.clasloop.app://
✓ 2 patch(es) aplicado(s)
  0 patch(es) ya estaban aplicados
```

Si decís que ya están aplicados:
```
○ Proguard: ya está aplicado
○ Deep link: ya está aplicado
✓ 0 patch(es) aplicado(s)
  2 patch(es) ya estaban aplicados
```

### 4. Compilar y correr

En Android Studio:
- Build → Clean Project
- Build → Rebuild Project
- ▶ Run

O desde PowerShell:
```powershell
cd android
.\gradlew assembleDebug
```

---

## Qué validar

1. **Email/password login** debería seguir funcionando como antes
2. **Google login**:
   - Apretás "Sign in with Google"
   - Se abre Chrome (no la WebView de la app — Chrome Custom Tabs es un browser pelado)
   - Elegís tu cuenta Google
   - Después de elegir, Chrome se cierra automáticamente y volvés a la app
   - La app debería mostrarte la home con tu cuenta logueada

3. **Si recién creás cuenta con Google**: te debería aparecer el RoleOnboarding (teacher / student)

---

## Si algo falla

### Apretás "Google" y no pasa nada
- Verificá que `@capacitor/browser` está instalado: en `package.json` debe figurar
- Después de `npx cap sync android`, verificá que el output lista `@capacitor/browser` entre los plugins

### Se abre Chrome pero después no vuelve a la app
- Verificá que aplicaste el patch:
  ```powershell
  npm run patch:android
  ```
- Inspeccioná `android/app/src/main/AndroidManifest.xml` y buscá `com.clasloop.app`. Debe aparecer dentro de un `<intent-filter>` adentro de la activity principal.
- Si no aparece, decímelo y vemos qué pasa con el script.

### Vuelve a la app pero queda en la pantalla de login
- Verificá que en Supabase Dashboard agregaste el redirect URL correctamente
- Abrí DevTools (chrome://inspect/#devices) y mirá Console al volver a la app. Probablemente hay un error de `exchangeCodeForSession`.

### Error "Code verifier missing"
- Esto pasa si el flowType del cliente Supabase quedó en 'implicit' por error en native. Decímelo y reviso.

### Error "Redirect URL not allowed by configuration"
- El redirect URL en Supabase Dashboard no coincide exacto. Tiene que ser literalmente: `com.clasloop.app://auth-callback` (con doble slash, todo en minúsculas).

---

## Lo que sigue

Una vez que el login Google funciona, próxima sesión:

- **PDF export en mobile**: probablemente no funciona, hay que usar Filesystem + Share plugins
- **Splash + ícono Clasloop**: reemplazar el splash genérico azul
- **Safe areas**: padding correcto en devices con notch / nav bar
- **Keyboard avoiding**: que inputs cerca del fondo no se tapen

Decime cómo va con OAuth.
