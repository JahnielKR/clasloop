import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import App from './App'
import GuestJoin from './pages/GuestJoin'
import './index.css'
// PR 20: theme stylesheets for lobby + live screens. Loaded eagerly
// since they're small (~5KB) and avoid a flash when the lobby mounts.
import './styles/themes.css'
import './styles/theme-overlays.css'
import { ensureThemeCss, applyTheme, getStoredTheme } from './components/tokens'
import { ROUTE_PATTERNS } from './routes'
import { bootCapacitor } from './lib/capacitor-boot'
// PR 67: Sentry initialization. Llamar lo más temprano posible —
// antes de cualquier React rendering — para que errores durante el
// montaje inicial también queden capturados. initSentry es no-op
// si no hay DSN definida o no es production, así que es seguro
// llamarlo siempre.
import { initSentry, SentryErrorBoundary } from './lib/sentry'
// PR 69: PostHog analytics. Inicializar después de Sentry — orden
// importa solo conceptualmente (errores tienen prioridad sobre tracking).
// initAnalytics es no-op si no hay key o no es production.
import { initAnalytics } from './lib/analytics'
// PR 91: montaje del ErrorBoundary + ToastProvider que ya existían
// pero nunca habían sido conectados al árbol React.
import ErrorFallback from './components/ErrorFallback'
import { ToastProvider } from './lib/toast'
// PR 170a (M1): React Query client. First step of the incremental data-layer
// migration — the provider is mounted now so per-page hooks (useDecks, etc.)
// can be added page-by-page in the 170b-g sub-PRs.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Sentry boot ──
initSentry();

// ── Analytics boot ──
initAnalytics();

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
// PR 53.1: removido el CustomSplash custom. El splash del sistema
// Android 12+ (blanco neutro + logo) ya queda limpio y Jota lo prefirió
// así. Sin transición a un segundo splash. La app aparece directo
// después del splash sistema.
function Root() {
  return (
    <Router>
      <Routes>
        <Route path={ROUTE_PATTERNS.JOIN} element={<GuestJoin />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Router>
  );
}

// PR 170a (M1): one QueryClient for the whole app. Defaults tuned for this
// app's read patterns; per-query overrides go in the individual hooks.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // 30s — most reads stay fresh this long
      gcTime: 5 * 60_000,     // keep unused data cached for 5 min
      refetchOnWindowFocus: true,
    },
  },
});

// ── React mount ──
// PR 91: árbol con ErrorBoundary (afuera) + ToastProvider (adentro) + Root.
// Orden importa:
//   - ErrorBoundary afuera: captura crashes del subtree completo, incluyendo
//     un crash hipotético del provider de Toast.
//   - ToastProvider adentro del boundary: si el boundary se activa, ErrorFallback
//     no necesita useToast (renderiza fuera del flujo normal).
//   - Root adentro de ambos: cualquier page puede usar useToast() y está
//     protegida por el boundary.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SentryErrorBoundary
      fallback={(props) => <ErrorFallback {...props} />}
      showDialog={false}
    >
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <Root />
        </QueryClientProvider>
      </ToastProvider>
    </SentryErrorBoundary>
  </React.StrictMode>,
)

// PR 50 (FASE 1 Capacitor): inicializar plugins nativos después de
// montar React. En web es no-op.
bootCapacitor();
