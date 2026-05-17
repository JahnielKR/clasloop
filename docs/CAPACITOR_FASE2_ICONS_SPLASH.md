# FASE 2 — Splash + ícono con el logo REAL de Clasloop

**Estado:** scripts + componentes listos. Falta correr los comandos
locales para regenerar assets.

> Versión anterior (PR 52) tenía un logo inventado (círculos
> concéntricos) — mi error. Esta versión usa el logo REAL de la app:
> reloj con sol sobre gradiente azul (definido en
> src/components/Icons.jsx → LogoMark).

---

## Lo que cambia ahora

**Ícono:** estilo iOS — fondo gris claro neutro (#F0F0EC) + logo
flotando adentro con el gradiente azul sky→ocean. Sin "círculos
concéntricos" inventados.

**Splash:**
- En Android 12+: el sistema operativo muestra splash con logomark
  sobre grafito (theme configurado). ~0.5s.
- Después, React monta y muestra un splash CUSTOM con el mismo logo +
  "Clasloop" en DM Sans 700 sentence case. Mismo background grafito,
  así que la transición es invisible.
- Después de ~1.5s, fade-out → app.

Resultado total: el usuario ve aparecer el logo, después aparecer
"Clasloop" debajo, y después la app. ~2 segundos total.

---

## Pasos a correr

### 1. Pull + install

```powershell
cd C:\path\a\clasloop-phase1
git pull origin feature/capacitor-android
npm install
```

`npm install` trae 2 nuevas devDeps: `opentype.js` y `wawoff2` (para
convertir DM Sans a SVG paths en build time) + `typeface-dm-sans` (la
font misma).

### 2. Regenerar android desde cero

**Importante:** porque hicimos varios cambios al script (logo nuevo,
patch del splash theme, etc), y porque Android cachea agresivo, el
camino más seguro es:

```powershell
rmdir /s /q android
npm run build
npx cap add android
npm run patch:android
npm run icons:generate
npx cap sync android
```

### 3. Desinstalar app vieja del emulador

Mantener presionado el ícono → Uninstall.

### 4. Abrir Android Studio + Run

```powershell
npx cap open android
```

En Android Studio: Build → Clean Project → Rebuild → ▶ Run.

---

## Qué debería verse ahora

1. **En el home del cel/emulador:** ícono Clasloop estilo iOS, logo
   azul con reloj flotando sobre fondo gris claro neutro. Debajo
   dice "Clasloop".

2. **Al abrir la app:**
   - ~0.5s: aparece el logo sobre grafito (Android sistema splash)
   - ~1.5s: aparece "Clasloop" debajo del logo (CustomSplash React)
   - Fade-out → app

---

## Si querés ajustar el diseño después

### Cambiar el logo del ícono
Editás `resources/icons/icon.svg` y `resources/icons/icon-foreground.svg`.
Después corrés `npm run icons:generate && npx cap sync android` + Rebuild.

### Cambiar el wordmark del splash
El wordmark es generado al vuelo en el script desde DM Sans. Para
cambiar el texto, edita `scripts/generate-android-assets.cjs` y buscá
`buildSplashSvg`. Cambia "Clasloop" por lo que quieras y regenerá.

### Cambiar el tiempo del custom splash
En `src/components/CustomSplash.jsx`:
- `VISIBLE_MS` (default 1500) — tiempo visible antes del fade
- `FADE_MS` (default 350) — duración del fade-out

---

## Lo que sigue

- PDF export en mobile (bug pendiente que reportaste)
- Safe areas / keyboard avoiding

Decime cómo se ve cuando lo pruebes.
