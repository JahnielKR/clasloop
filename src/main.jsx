import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import App from './App'
import GuestJoin from './pages/GuestJoin'
import CustomSplash from './components/CustomSplash'
import './index.css'
// PR 20: theme stylesheets for lobby + live screens. Loaded eagerly
// since they're small (~5KB) and avoid a flash when the lobby mounts.
import './styles/themes.css'
import './styles/theme-overlays.css'
import { ensureThemeCss, applyTheme, getStoredTheme } from './components/tokens'
import { ROUTE_PATTERNS } from './routes'
import { bootCapacitor } from './lib/capacitor-boot'

// ── Theme boot ──
// Inject the theme CSS variables and apply the persisted theme BEFORE
// React mounts. This prevents a flash of light theme for users who chose
// dark. Add the .theme-ready class AFTER initial paint so the first render
// doesn't animate the transition (otherwise it would visibly fade in).
ensureThemeCss();
applyTheme(getStoredTheme());
requestAnimationFrame(() => {
  document.documentElement.classList.add("theme-ready");
});

// ── Router selection ──
// PR 50 (FASE 1 Capacitor): when running inside the Capacitor WebView
// the files are served from a capacitor:// or file:// scheme, where
// BrowserRouter (which uses HTML5 History API) doesn't behave the same
// way (no real "URL bar"). HashRouter sidesteps the issue by encoding
// routes after a # (e.g. /#/decks), which works regardless of the
// underlying scheme.
//
// On the web (browser) we keep BrowserRouter for clean URLs (/decks
// instead of /#/decks).
const isNative = Capacitor.isNativePlatform();
const Router = isNative ? HashRouter : BrowserRouter;

// Routing entry point.
//
// /join is the only truly public, no-auth entry point (guests joining a
// session by PIN). Everything else lives inside the authenticated <App />
// shell, which itself uses react-router for its internal navigation.
//
// The catch-all "/*" handing routing to App lets App own *all* its internal
// routes (sessions, decks, settings, /teacher/:id, etc.) while keeping
// /join as a sibling that bypasses the auth shell entirely.
//
// PR 53 (FASE 2 Capacitor — splash polish): cuando estamos en la app
// nativa, montamos <CustomSplash /> arriba de todo. El sistema OS de
// Android 12+ ya mostró su splash con el logomark (theme configurado),
// y ahora React monta y vemos el CustomSplash con MISMO background
// grafito + logo + wordmark "Clasloop". Al usuario le parece continuo
// porque el fondo no cambia. Después de ~1.5s, CustomSplash hace
// fade-out y se ve la app debajo.
function Root() {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <>
      {isNative && !splashDone && (
        <CustomSplash onDone={() => setSplashDone(true)} />
      )}
      <Router>
        <Routes>
          <Route path={ROUTE_PATTERNS.JOIN} element={<GuestJoin />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </Router>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)

// PR 50 (FASE 1 Capacitor): inicializar plugins nativos después de
// montar React. En web es no-op.
bootCapacitor();
