import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GuestJoin from './pages/GuestJoin'
import './index.css'

// Simple route splitter — the /join page is a public, no-auth entry point
// for students who only have a session code (no account). Everything else
// goes through the main App which handles auth and the dashboard shell.
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
