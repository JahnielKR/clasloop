import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import GuestJoin from './pages/GuestJoin'
import './index.css'
import { ensureThemeCss, applyTheme, getStoredTheme } from './components/tokens'
import { ROUTE_PATTERNS } from './routes'

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

// Routing entry point.
//
// /join is the only truly public, no-auth entry point (guests joining a
// session by PIN). Everything else lives inside the authenticated <App />
// shell, which itself uses react-router for its internal navigation.
//
// The catch-all "/*" handing routing to App lets App own *all* its internal
// routes (sessions, decks, settings, /teacher/:id, etc.) while keeping
// /join as a sibling that bypasses the auth shell entirely.
function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTE_PATTERNS.JOIN} element={<GuestJoin />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
