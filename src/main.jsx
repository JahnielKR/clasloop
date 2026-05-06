import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GuestJoin from './pages/GuestJoin'
import './index.css'
import { ensureThemeCss, applyTheme, getStoredTheme } from './components/tokens'

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

// Simple route splitter — only /join is a truly public, no-auth entry point
// (for guests joining a session by code). Everything else, including
// /teacher/:id, lives inside the authenticated App shell.
function Root() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/join') {
    return <GuestJoin />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
