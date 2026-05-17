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
    // Permitir HTTP (para development con livereload local). En producción
    // las llamadas HTTPS a Supabase y demás siguen funcionando.
    // OJO: cuando se publique a Play Store hay que revisar si dejamos esto
    // o lo restringimos.
    allowMixedContent: true,
    // PR 53.1: background del WebView mientras carga = mismo blanco
    // neutro que el splash. Si hubiera un flash entre splash y app,
    // sería del mismo color, invisible.
    backgroundColor: '#F0F0EC',
  },
};

export default config;
