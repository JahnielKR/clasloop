// ─────────────────────────────────────────────────────────────────────────────
// Capacitor configuration — Clasloop mobile app
//
// PR 50 (FASE 1): setup base. Esta es la configuración inicial; algunos
// valores (especialmente plugins) se afinarán en fases siguientes.
//
// IMPORTANTE — bundle ID inmutable:
// "com.clasloop.app" no se puede cambiar después de publicar en stores
// sin re-listar la app como nueva (rompe updates para usuarios). Está
// decidido y fijo.
//
// "webDir" = directorio donde Vite hace build. Default de Vite es "dist/".
// Capacitor copia este directorio al wrapper nativo en cada `cap sync`.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clasloop.app',
  appName: 'Clasloop',
  webDir: 'dist',

  // PR 50 (FASE 1): server config no se setea acá. Por default Capacitor
  // sirve los archivos de webDir desde el bundle nativo. Para development
  // con livereload (apuntando al dev server de Vite) se agrega
  // `server: { url, cleartext: true }` temporalmente — eso se hace
  // manualmente cuando se necesita, no por default.

  // PR 50 (FASE 1): plugins config. Estos son los que ya instalamos.
  // Los que NO están acá usan sus defaults.
  plugins: {
    SplashScreen: {
      // PR 53.1: Jota prefirió splash claro (blanco neutro #F0F0EC) +
      // logo, sin transición a un splash custom oscuro. Más limpio.
      // launchAutoHide=true → el sistema cierra el splash solito
      // cuando termina la animación (~0.5s típico).
      launchShowDuration: 500,
      launchAutoHide: true,
      backgroundColor: '#F0F0EC',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // PR 53.1: status bar también clara, coherente con el splash.
      // Se puede cambiar dinámicamente desde la app (e.g. quiz themed
      // override) si hace falta.
      backgroundColor: '#F0F0EC',
      style: 'LIGHT',                // texto/íconos oscuros sobre fondo claro
      overlaysWebView: false,
    },
    Keyboard: {
      // Cuando aparece el teclado, ajustar el viewport sin saltos.
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },

  // Configuración específica de Android
  android: {
    // PR 165 (L15): allowMixedContent (cargar HTTP dentro del WebView HTTPS)
    // solo en debug — sirve para el livereload local sobre HTTP. En release
    // queda false (requisito Play Store). Se resuelve con process.env.NODE_ENV
    // al compilar este config (lo hace el Capacitor CLI en `cap sync`), así que
    // el build de release DEBE correr con NODE_ENV=production. Si NODE_ENV no
    // está seteado (dev), queda true → mantiene el comportamiento actual, sin
    // regresión. Las llamadas HTTPS a Supabase funcionan igual en ambos casos.
    allowMixedContent: process.env.NODE_ENV !== "production",
    // PR 53.1: background del WebView mientras carga = mismo blanco
    // neutro que el splash. Si hubiera un flash entre splash y app,
    // sería del mismo color, invisible.
    backgroundColor: '#F0F0EC',
  },
};

export default config;
