# FASE 2 (Parte 2) — Splash + ícono Clasloop

**Estado:** script generador + SVGs base listos en el repo. Falta correr
1 comando local para generar los PNGs en el directorio android/.

---

## Lo que cambia

Reemplaza:
- ❌ Splash blanco con logo azul genérico de Android
- ❌ Ícono blanco genérico de Android

Por:
- ✅ Splash oscuro `#1a1a1a` con logomark blanco + "CLASLOOP" debajo
- ✅ Ícono adaptativo con logomark sobre fondo grafito (se ve tipo Notion/Linear)

---

## Pasos a correr

### 1. Pull + install

```powershell
cd C:\path\a\clasloop-phase1
git pull origin feature/capacitor-android
npm install
```

`npm install` trae `sharp` (nueva devDep, generador de PNGs).

### 2. Generar los PNGs

```powershell
npm run icons:generate
```

Esto toma los 3 SVG base en `resources/icons/` y genera 24 PNGs en
`android/app/src/main/res/`:
- 5 íconos legacy (mdpi a xxxhdpi) + 5 versiones round
- 5 foregrounds adaptativos
- 10 splash screens (portrait + landscape × 5 densidades)
- 1 splash de fallback
- XMLs del adaptive icon

**Output esperado:**
```
🎨 Generando assets Android desde resources/icons/...
✓ mipmap-mdpi/ic_launcher.png  (48×48)
✓ mipmap-hdpi/ic_launcher.png  (72×72)
... (~24 líneas)
✅ Todos los assets generados.
```

### 3. Copiar al wrapper

```powershell
npx cap copy android
```

Esto sincroniza los assets nuevos al proyecto Android Studio.

### 4. Desinstalar la app vieja del emulador

**IMPORTANTE:** Android cachea el ícono. Si no desinstalás, vas a seguir
viendo el ícono viejo.

En el emulador:
- Mantené presionado el ícono de Clasloop
- "Uninstall" / "App info → Uninstall"

(O desde Android Studio: Run > Edit Configurations > "Always install with package manager")

### 5. Rebuild + run

En Android Studio:
- Build → Clean Project
- Build → Rebuild Project
- ▶ Run

---

## Qué deberías ver ahora

1. **Pantalla con todas las apps del emulador:** el ícono de Clasloop es un círculo dentro de un círculo, blanco sobre fondo oscuro. Debajo dice "Clasloop".

2. **Al tocar el ícono:** se ve un splash oscuro `#1a1a1a` con el logomark centrado + "CLASLOOP" debajo. Por ~1-2 segundos.

3. **Después del splash:** abre la app directo, como antes.

---

## Si algo falla

### Sigo viendo el ícono viejo
- Desinstalaste la app del emulador antes de reinstalar?
- En algunos emuladores hay que reiniciar el launcher: tirar abajo el panel de notificaciones → tocar el ícono de settings → reboot el emulador.

### Splash sigue siendo blanco con logo azul
- Verificá que el archivo `android/app/src/main/res/drawable-port-xxhdpi/splash.png` existe
- Verificá que `capacitor.config.ts` tiene `androidSplashResourceName: 'splash'`
- Después de `npx cap copy android`, en Android Studio: Build → Clean Project antes de Run

### `npm run icons:generate` falla con "sharp install error"
- Sharp es una librería nativa que compila bindings. A veces falla en
  Windows si no tenés VS Build Tools.
- Probá: `npm install sharp --force`
- Si sigue, decímelo, hay alternativas.

### Build falla diciendo "ic_launcher_background not found"
- El script crea `values/ic_launcher_background.xml` pero capaz no se
  copió. Verificar que existe y tiene contenido. Si no, correr de
  nuevo `npm run icons:generate`.

---

## Si querés ajustar el diseño

Los SVG base están en `resources/icons/`:

- **icon.svg** — el ícono completo (1024×1024) usado para legacy icons
- **icon-foreground.svg** — solo el logomark (sin fondo) para adaptive icons
- **splash.svg** — splash screen completo (2732×2732)

Si querés cambiar tamaños, colores, o agregar elementos:
1. Editás el SVG correspondiente
2. Corrés `npm run icons:generate` de nuevo
3. `npx cap copy android` + Rebuild

Todos los PNGs se regeneran automáticamente desde los SVG. Nunca
editás los PNGs directamente.

---

## Lo que sigue (FASE 2 Parte 3)

- Arreglar PDF export en mobile (Jota reportó que no descarga nada)
- Safe areas para devices con notch
- Keyboard avoiding

Decime cómo se ve el ícono nuevo y seguimos.
