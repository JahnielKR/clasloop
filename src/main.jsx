import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GuestJoin from './pages/GuestJoin'
import TeacherProfile from './pages/TeacherProfile'
import './index.css'

// Simple route splitter — public no-auth entry points (GuestJoin for students
// joining a session by code, TeacherProfile for sharing a teacher's public
// page) bypass the main App shell. Everything else flows through App which
// handles auth and the dashboard.
function Root() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/join') {
    return <GuestJoin />;
  }
  if (path.startsWith('/teacher/')) {
    return <TeacherProfile />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
