import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GuestJoin from './pages/GuestJoin'
import './index.css'

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
