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
      // Mantener el splash hasta que React monte y dispare hide()
      // manualmente. Evita el flash blanco entre splash y app.
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#1a1a1a',  // grafito oscuro, coherente con tema dark
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,           // sin spinner, solo logo limpio
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Coherente con el splash oscuro. Se puede cambiar dinámicamente
      // desde la app (e.g. quiz themed override).
      backgroundColor: '#1a1a1a',
      style: 'DARK',                // texto/íconos claros sobre fondo oscuro
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
    // Background color del WebView mientras carga, antes que el CSS pinte.
    // Evita un flash blanco al abrir.
    backgroundColor: '#1a1a1a',
  },
};

export default config;
