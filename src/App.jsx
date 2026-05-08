import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { ROUTES, PAGE_TO_ROUTE, pathToPage, defaultRouteForRole, buildRoute, buildPathWithOpts, isPageAllowedForRole } from './routes';
import { supabase } from './lib/supabase';
import Icon, { LogoMark, SessionsIcon, AIGenIcon, SchoolIcon, CommunityIcon, DecksIcon, NotificationsIcon, SettingsIcon, JoinSessionIcon, ProgressIcon, AchievementsIcon, ActivitiesIcon, TeacherInline, StudentInline, TeacherAvatar, StudentAvatar, BackArrow, ReviewIcon } from './components/Icons';
import { Avatar as ProfileAvatar } from './components/Avatars';
// PublicHome and AvatarOnboarding are eagerly imported because they paint
// before the authed shell — making them lazy would just add a Suspense
// fallback to the very first screen the user sees.
import PublicHome from './pages/PublicHome';
import AvatarOnboarding from './pages/AvatarOnboarding';
// All other pages are code-split via React.lazy. Each becomes its own chunk
// that's fetched on demand the first time the user navigates there. The
// initial JS bundle drops from ~1.5MB to a much smaller core.
//
// Note about StudentJoin: it's listed as lazy() here so App.jsx doesn't pull
// it into the main chunk on its own behalf, but it's also statically imported
// by GuestJoin (which renders on the /join public route). That static import
// wins, so StudentJoin ends up bundled into the main chunk anyway. Vite warns
// about this but it's intentional — guests entering by PIN should see the
// quiz instantly without a Suspense flash, even if it costs some KB up front.
//
// Each import is bound to a thunk so it can be invoked twice: once by lazy()
// (which uses the result to render) and once by the prefetch effect below
// (which warms the cache so navigation never shows a Suspense flash). Vite
// caches dynamic imports — calling the thunk a second time returns the same
// already-resolved module without re-downloading.
const importSessionFlow    = () => import('./pages/SessionFlow');
const importStudentJoin    = () => import('./pages/StudentJoin');
const importCommunity      = () => import('./pages/Community');
const importAchievements   = () => import('./pages/Achievements');
const importSettings       = () => import('./pages/Settings');
const importDirector       = () => import('./pages/Director');
const importNotifications  = () => import('./pages/Notifications');
const importDecks          = () => import('./pages/Decks');
const importMyClasses      = () => import('./pages/MyClasses');
const importMyClassesTeacher = () => import('./pages/MyClassesTeacher');
const importClassPage      = () => import('./pages/ClassPage');
const importTeacherProfile = () => import('./pages/TeacherProfile');
const importAdminAIStats   = () => import('./pages/AdminAIStats');
const importReview         = () => import('./pages/Review');
const importDeckResults    = () => import('./pages/DeckResults');
const importClassInsights  = () => import('./pages/ClassInsights');
const importMyResults      = () => import('./pages/MyResults');

const SessionFlow      = lazy(importSessionFlow);
const StudentJoin      = lazy(importStudentJoin);
const Community        = lazy(importCommunity);
const Achievements     = lazy(importAchievements);
const Settings         = lazy(importSettings);
const Director         = lazy(importDirector);
const Notifications    = lazy(importNotifications);
const Decks            = lazy(importDecks);
const MyClasses        = lazy(importMyClasses);
const MyClassesTeacher = lazy(importMyClassesTeacher);
const ClassPage        = lazy(importClassPage);
const TeacherProfile   = lazy(importTeacherProfile);
const AdminAIStats     = lazy(importAdminAIStats);
const Review           = lazy(importReview);
const DeckResults      = lazy(importDeckResults);
const ClassInsights    = lazy(importClassInsights);
const MyResults        = lazy(importMyResults);
import { useIsMobile } from './components/MobileMenuButton';
import { countVisibleNotifications, countPendingReviewsForTeacher } from './lib/notifications';
import { C } from './components/tokens';

// MyClasses wrapper — /classes is shared between roles and now has a
// nested route for class detail:
//   /classes              → list view
//                           teacher: MyClassesTeacher (cards + codes)
//                           student: MyClasses (joined classes)
//   /classes/:classId     → detail view
//                           teacher: ClassPage (warmups/exit tickets/review)
//                           student: MyClasses (existing class drilldown)
//
// We do the URL match here rather than each component reading the URL
// independently — keeps the routing decision in one place.
function MyClassesByRole(props) {
  const role = props.profile?.role;
  const classMatch = useMatch("/classes/:classId");
  const classId = classMatch?.params?.classId || null;

  if (role === "teacher") {
    if (classId) return <ClassPage {...props} classId={classId} />;
    return <MyClassesTeacher {...props} />;
  }
  // Students stay on the existing MyClasses component, which already
  // handles its own /classes/:classId drilldown internally.
  return <MyClasses {...props} />;
}

const COMPONENTS = { sessions: SessionFlow, studentJoin: StudentJoin, community: Community, achievements: Achievements, settings: Settings, director: Director, notifications: Notifications, decks: Decks, myClasses: MyClassesByRole, teacherProfile: TeacherProfile, adminAIStats: AdminAIStats, review: Review, deckResults: DeckResults, classInsights: ClassInsights, myResults: MyResults };

function AuthScreen({ initialMode = "select", initialRole = "teacher", onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || pass.length < 8) return;
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signUp({ email, password: pass, options: { data: { full_name: name, role } } });
    if (err) { setError(err.message); setLoading(false); }
  };
  const handleLogin = async () => {
    if (!email || !pass) return;
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (err) { setError(err.message); setLoading(false); }
  };
  const handleGoogle = async () => {
    // OAuth bounces us out of the app — the redirect loses React state.
    // Persist the role choice so we can apply it to the profile when we come
    // back. Cleared by App.jsx once consumed.
    try { localStorage.setItem("clasloop_pending_role", role); } catch (_) {}
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "11px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
  const btnP = { width: "100%", padding: "12px", borderRadius: 9, fontSize: 15, fontWeight: 600, background: `linear-gradient(135deg,${C.accent},${C.purple})`, color: "#fff", border: "none", cursor: "pointer", opacity: loading ? .5 : 1, fontFamily: "'Outfit',sans-serif" };
  const btnS = { width: "100%", padding: "12px", borderRadius: 9, fontSize: 15, fontWeight: 600, background: C.bg, color: C.text, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" };

  if (mode === "select") return (
    <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <LogoMark size={48} />
        </div>
        <h1 style={{ fontFamily: "'Outfit'", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Welcome to Clasloop</h1>
        <p style={{ color: C.textSecondary, fontSize: 15, marginBottom: 32 }}>Help your students actually remember what you teach</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => { setRole("teacher"); setMode("signup"); }} style={{ ...btnP, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><TeacherInline size={20} /> I'm a Teacher</button>
          <button onClick={() => { setRole("student"); setMode("signup"); }} style={{ ...btnS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><StudentInline size={20} /> I'm a Student</button>
        </div>
        <p style={{ marginTop: 24, fontSize: 13, color: C.textMuted, fontFamily: "'Outfit'" }}>Already have an account? <span onClick={() => setMode("login")} style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}>Sign in</span></p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <button onClick={() => {
          // If we entered straight into login/signup from the public home,
          // "back" should take us back there. Otherwise (came in via the
          // role-select screen), stay inside AuthScreen and reset to select.
          if (initialMode !== "select" && onBack) {
            onBack();
          } else {
            setMode("select"); setError("");
          }
        }} style={{ background: "transparent", border: "none", color: C.textSecondary, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "'Outfit'" }}>← Back</button>
        <div style={{ background: C.bg, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28 }}>
          <h2 style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
          <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20, fontFamily: "'Outfit'", display: "flex", alignItems: "center", gap: 6 }}>{mode === "signup" ? <>{role === "teacher" ? <><TeacherInline size={16}/> Teacher account</> : <><StudentInline size={16}/> Student account</>}</> : "Sign in to your account"}</p>
          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13, marginBottom: 14, fontFamily: "'Outfit'" }}>{error}</div>}
          <button onClick={handleGoogle} style={{ ...btnS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}><div style={{ flex: 1, height: 1, background: C.border }}/><span style={{ fontSize: 12, color: C.textMuted }}>or</span><div style={{ flex: 1, height: 1, background: C.border }}/></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5, fontFamily: "'Outfit'" }}>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp}/></div>}
            <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5, fontFamily: "'Outfit'" }}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" style={inp}/></div>
            <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5, fontFamily: "'Outfit'" }}>Password</label><input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} style={inp} onKeyDown={e => e.key === "Enter" && (mode === "signup" ? handleSignup() : handleLogin())}/></div>
          </div>
          <button onClick={mode === "signup" ? handleSignup : handleLogin} disabled={loading} style={{ ...btnP, marginTop: 16 }}>{loading ? "Loading..." : mode === "signup" ? "Create account" : "Sign in"}</button>
          <p style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: C.textMuted, fontFamily: "'Outfit'" }}>
            {mode === "signup" ? <>Already have an account? <span onClick={() => { setMode("login"); setError(""); }} style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}>Sign in</span></> : <>Don't have an account? <span onClick={() => { setMode("signup"); setError(""); }} style={{ color: C.accent, cursor: "pointer", fontWeight: 500 }}>Sign up</span></>}
          </p>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, profile, lang, setLang, open, setOpen, onSignOut, onNavClick, isMobile, mobileDrawerOpen, setMobileDrawerOpen, notifsCount = 0, reviewBadgeCount = 0 }) {
  // Default to teacher unless we know for sure they're a student
  // This prevents the sidebar from flipping during token refresh
  const isT = profile ? profile.role === "teacher" : (page === "sessions" || page === "decks" || page === "director");
  const isAdmin = profile?.is_admin === true;
  // Sidebar nav items. Admin tools van al final, después de Settings, y solo
  // se renderizan si profile.is_admin === true. La protección real está en
  // la página + RLS de Supabase; ocultar en sidebar es solo UX.
  const baseNav = isT
    ? [{ id:"sessions",icon:(a)=><SessionsIcon size={28} active={a}/>,l:"Today" },{ id:"decks",icon:(a)=><DecksIcon size={28} active={a}/>,l:"Decks" },{ id:"myClasses",icon:(a)=><SchoolIcon size={28} active={a}/>,l:"My Classes" },{ id:"review",icon:(a)=><ReviewIcon size={28} active={a} badge={reviewBadgeCount}/>,l:"To review" },{ id:"community",icon:(a)=><CommunityIcon size={28} active={a}/>,l:"Community" },{ id:"notifications",icon:(a)=><NotificationsIcon size={28} active={a} badge={notifsCount}/>,l:"Notifications" },{ id:"settings",icon:(a)=><SettingsIcon size={28} active={a}/>,l:"Settings" }]
    : [{ id:"myClasses",icon:(a)=><SchoolIcon size={28} active={a}/>,l:"My Classes" },{ id:"studentJoin",icon:(a)=><JoinSessionIcon size={28} active={a}/>,l:"Join Session" },{ id:"achievements",icon:(a)=><AchievementsIcon size={28} active={a}/>,l:"Achievements" },{ id:"community",icon:(a)=><CommunityIcon size={28} active={a}/>,l:"Community" },{ id:"notifications",icon:(a)=><NotificationsIcon size={28} active={a} badge={notifsCount}/>,l:"Notifications" },{ id:"settings",icon:(a)=><SettingsIcon size={28} active={a}/>,l:"Settings" }];
  const nav = isAdmin
    ? [...baseNav, { id:"adminAIStats", icon:(a)=><AIGenIcon size={28} active={a}/>, l:"AI Stats" }]
    : baseNav;

  // In mobile, the sidebar acts as a drawer: full-width-ish, slides in from
  // the left, always shows labels (no collapsed state). In desktop it keeps
  // its existing collapsible behavior — completely untouched.
  const sidebarWidth = isMobile ? 240 : (open ? 210 : 56);
  const showLabels = isMobile ? true : open;
  const sidebarTransform = isMobile && !mobileDrawerOpen ? "translateX(-100%)" : "translateX(0)";

  // In mobile, every nav action also closes the drawer.
  const handleNav = (cb) => {
    cb();
    if (onNavClick) onNavClick();
    if (isMobile) setMobileDrawerOpen(false);
  };

  return (
    <div style={{
      width: sidebarWidth,
      background: C.bg,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 60,
      transition: isMobile ? "transform .25s ease" : "width .2s",
      overflow: "hidden",
      transform: sidebarTransform,
      boxShadow: isMobile && mobileDrawerOpen ? "0 0 24px rgba(0,0,0,.12)" : "none",
    }}>
      <div style={{ padding: "14px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 50 }}>
        {showLabels && <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <LogoMark size={26} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.03em", fontFamily: "'Outfit',sans-serif" }}>clasloop</span>
        </div>}
        {!showLabels && <LogoMark size={26} />}
        {/* Desktop collapse arrow — hidden in mobile */}
        {!isMobile && open && <button className="cl-collapse" onClick={() => setOpen(!open)} style={{ width: 26, height: 26, borderRadius: 6, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.textMuted, flexShrink: 0, border: "none", cursor: "pointer" }}>◀</button>}
        {/* Mobile close (×) — only when drawer is open */}
        {isMobile && <button onClick={() => setMobileDrawerOpen(false)} aria-label="Close menu" style={{ width: 32, height: 32, borderRadius: 8, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, lineHeight: 1, color: C.textSecondary, flexShrink: 0, border: "none", cursor: "pointer" }}>×</button>}
      </div>
      {!isMobile && !open && <button className="cl-collapse" onClick={() => setOpen(true)} style={{ margin: "4px 6px", padding: "6px", borderRadius: 6, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.textMuted, border: "none", cursor: "pointer" }}>▶</button>}
      <div style={{ flex: 1, overflow: "auto", padding: "0 6px" }}>
        {nav.map(n => {
          const isActive = page === n.id;
          return <button key={n.id} className={isActive ? "cl-nav cl-nav-active" : "cl-nav"} onClick={() => handleNav(() => setPage(n.id))} style={{ display: "flex", alignItems: "center", gap: 10, padding: showLabels?"9px 10px":"9px", borderRadius: 8, width: "100%", background: isActive?C.accentSoft:"transparent", fontSize: 13, fontWeight: isActive?600:500, color: isActive?C.accent:C.textSecondary, marginBottom: 2, textAlign: "left", justifyContent: showLabels?"flex-start":"center", border: "none", cursor: "pointer" }}>
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{n.icon(isActive)}</span>{showLabels && n.l}
          </button>;
        })}
      </div>
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
        {showLabels ? <>
          {/* Language selector lives here for both mobile and desktop now.
              Used to live in the page header (PageHeader.jsx) but moved
              to the sidebar so every page has the same chrome and the
              choice feels like a user preference, not page furniture.
              When the sidebar is collapsed (showLabels=false) we hide
              this — the user can expand the sidebar or open Settings
              to change the language. */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{
                  flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: lang === code ? C.accentSoft : "transparent",
                  color: lang === code ? C.accent : C.textMuted,
                  border: `1px solid ${lang === code ? C.accent + "33" : C.border}`,
                  cursor: "pointer", fontFamily: "'Outfit',sans-serif",
                }}
              >{label}</button>
            ))}
          </div>
          <button
            className="cl-profile-chip"
            onClick={() => handleNav(() => setPage("settings"))}
            title="Open Settings"
            style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              width: "100%", padding: "6px 8px", borderRadius: 8,
              background: page === "settings" ? C.accentSoft : "transparent",
              border: "none", cursor: "pointer", textAlign: "left",
              fontFamily: "'Outfit',sans-serif",
              transition: "background .15s ease",
            }}
          >
            <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{profile ? <ProfileAvatar photoUrl={profile.avatar_url} id={profile.avatar_id} seed={profile.id} size={30}/> : (isT?<TeacherAvatar size={30}/>:<StudentAvatar size={30}/>)}</div>
            <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: page === "settings" ? C.accent : C.text }}>{profile?.full_name||"User"}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{isT?"Teacher":`Lv.${profile?.level||1}`}</div>
            </div>
          </button>
          <button className="cl-signout" onClick={onSignOut} style={{ fontSize: 11, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>Sign out</button>
        </> : <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="cl-profile-chip"
            onClick={() => handleNav(() => setPage("settings"))}
            title="Open Settings"
            style={{
              width: 32, height: 32, padding: 0, borderRadius: "50%",
              background: page === "settings" ? C.accentSoft : "transparent",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s ease",
            }}
          >
            {profile ? <ProfileAvatar photoUrl={profile.avatar_url} id={profile.avatar_id} seed={profile.id} size={26}/> : (isT?<TeacherAvatar size={26}/>:<StudentAvatar size={26}/>)}
          </button>
        </div>}
      </div>
    </div>
  );
}

// ── 404 screen ──
// Shown inside the authed shell when the URL doesn't map to any known page.
// We reuse the sidebar layout (rendered by App around us) so the user can
// still navigate via the sidebar — this screen only fills the content area.
function NotFoundScreen({ onGoHome, lang = "en" }) {
  // Tiny i18n inline — not worth wiring through the full i18n system for one
  // screen. en/es/ko cover the rest of the app.
  const txt = {
    en: { title: "Page not found", body: "The link you followed may be broken, or the page may have been moved.", cta: "Go to home" },
    es: { title: "Página no encontrada", body: "El enlace que seguiste puede estar roto o la página fue movida.", cta: "Volver al inicio" },
    ko: { title: "페이지를 찾을 수 없습니다", body: "따라간 링크가 깨졌거나 페이지가 이동되었을 수 있습니다.", cta: "홈으로 이동" },
  }[lang] || { title: "Page not found", body: "The link you followed may be broken, or the page may have been moved.", cta: "Go to home" };

  return (
    <div style={{ minHeight: "calc(100vh - 0px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: C.textMuted, fontFamily: "'Outfit',sans-serif", letterSpacing: "-.04em", lineHeight: 1, marginBottom: 12 }}>404</div>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8, color: C.text }}>{txt.title}</h2>
        <p style={{ fontSize: 14, color: C.textSecondary, fontFamily: "'Outfit',sans-serif", marginBottom: 20, lineHeight: 1.5 }}>{txt.body}</p>
        <button
          onClick={onGoHome}
          style={{
            padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: `linear-gradient(135deg,${C.accent},${C.purple})`, color: "#fff",
            border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{txt.cta}</button>
      </div>
    </div>
  );
}

// ── Suspense fallback for lazy-loaded pages ──
// Shown briefly the first time a user navigates to a page whose chunk hasn't
// been fetched yet. Compact and centered in the content area (sidebar stays
// rendered around us). After the first visit the chunk is cached and this
// fallback never shows again for that page.
function PageSuspenseFallback() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ margin: "0 auto 10px", display: "inline-flex", opacity: .85 }}>
          <LogoMark size={36} />
        </div>
        <p style={{ color: C.textMuted, fontSize: 13, fontFamily: "'Outfit',sans-serif" }}>Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  // ── Router hooks ──
  // location/navigate are the single source of truth for "what page is showing".
  // The local `page` state below is kept as a *shadow* of the URL during this
  // refactor phase so that all the existing child components (Decks, SessionFlow,
  // etc.) keep receiving the same `page` prop they used to. The single useEffect
  // a few lines down syncs URL → page state on every navigation.
  const location = useLocation();
  const navigate = useNavigate();
  // useMatch reads the :teacherId param from /teacher/:teacherId — replaces the
  // old regex-on-pathname trick that lived in this file's state initializer.
  const teacherMatch = useMatch("/teacher/:teacherId");
  const viewingTeacherId = teacherMatch?.params?.teacherId || null;
  // /practice/:deckId — derive the practice deck id from URL.
  const practiceMatch = useMatch("/practice/:deckId");
  const practiceDeckId = practiceMatch?.params?.deckId || null;

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // `page` mirrors the URL (kept in sync by an effect below). Initialised from
  // the current pathname so the very first render already shows the correct
  // page without a flash. Default to "sessions" when path is "/" — fetchProfile
  // will redirect to the role's home as soon as the profile loads.
  const [page, setPage] = useState(() => pathToPage(location.pathname) || "sessions");
  const [pageKey, setPageKey] = useState(0);
  // El idioma de la UI persiste en localStorage. Si Jota cambia a español
  // y recarga la página, debe seguir en español — antes se reseteaba a "en"
  // en cada load porque useState arranca con "en" hardcoded.
  const [lang, setLangRaw] = useState(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage?.getItem("clasloop_lang");
    if (saved === "en" || saved === "es" || saved === "ko") return saved;
    return "en";
  });
  const setLang = (newLang) => {
    setLangRaw(newLang);
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("clasloop_lang", newLang);
    }
  };
  const [open, setOpen] = useState(true);
  const isMobile = useIsMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [practiceDeck, setPracticeDeck] = useState(null); // when set, render StudentJoin in practice mode
  // When unauthenticated, this controls which screen we show:
  //   null  → PublicHome (Blooket-style entry with code input)
  //   { mode: "select" }                       → AuthScreen role picker
  //   { mode: "signup", role: "teacher"|"student" } → AuthScreen sign-up direct
  //   { mode: "login" }                        → AuthScreen sign-in direct
  const [authIntent, setAuthIntent] = useState(null);

  // Count of currently-visible (i.e. not-yet-dismissed) notifications. The
  // Notifications page calls back into us so we can paint a badge on the
  // sidebar icon. Source of truth lives in Notifications.jsx — App just
  // mirrors the number for display.
  const [notifsCount, setNotifsCount] = useState(0);
  // Count of free-text responses pending the current teacher's review.
  // Drives the red badge on the "To review" sidebar item. Same pattern
  // as notifsCount: count on profile load, refresh whenever `page`
  // changes (so navigating into /review and out updates the number after
  // the teacher grades a few). Teacher-only — students never see this.
  const [reviewBadgeCount, setReviewBadgeCount] = useState(0);
  // sessionsOpts/decksOpts/studentJoinOpts used to be state here. As of
  // Phase 2 they live in the URL as search params:
  //   sessions: ?createClass=1, ?class=<id>
  //   decks:    ?class=<id>
  //   join:     ?pin=<6digits>
  // Each consumer page reads them via useSearchParams, runs its effect, and
  // clears the param with setSearchParams({}, {replace:true}). This makes
  // those intents shareable via URL and removes the App-level plumbing.
  // viewingTeacherId is also no longer state — it's derived from the URL via
  // useMatch("/teacher/:teacherId") near the top of this component. Navigation
  // to a teacher profile happens via navigate(buildRoute.teacher(id)), and the
  // back button works because react-router owns history.

  // Track whether the initial profile load already ran. Subsequent calls (token
  // refresh on tab return, etc.) shouldn't reset the page state.
  const profileLoadedRef = useRef(false);

  // ── Pre-app theme override ────────────────────────────────────────────
  // PublicHome and AuthScreen are pre-app surfaces — marketing-adjacent
  // pages where we want a single visual identity regardless of the user's
  // saved theme preference. Manage the override centrally here (instead of
  // per-component) so navigating PublicHome → AuthScreen doesn't briefly
  // flash dark between unmount and mount.
  //
  // The condition is exactly the same as the gating below (`!user` decides
  // PublicHome vs AuthScreen). When the user logs in, this effect runs,
  // restores their saved theme, and the app renders with their preference.
  // GuestJoin lives on its own route (/join) and handles its own override.
  const isPreAppSurface = !user;
  useEffect(() => {
    if (!isPreAppSurface) return;
    const html = document.documentElement;
    const previous = html.getAttribute("data-theme") || "light";
    html.setAttribute("data-theme", "light");
    return () => { html.setAttribute("data-theme", previous); };
  }, [isPreAppSurface]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const isInitial = !profileLoadedRef.current;
        profileLoadedRef.current = true;
        fetchProfile(u.id, isInitial);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (u && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        const isInitial = !profileLoadedRef.current;
        profileLoadedRef.current = true;
        fetchProfile(u.id, isInitial);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
        profileLoadedRef.current = false;
      }

      // Clean OAuth hash
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── URL → page state sync ──
  // The router owns navigation. This effect keeps the legacy `page` shadow in
  // step with whatever path is currently active so child components (which
  // still receive `page` as a prop) keep working unchanged. We only update
  // `page` if the URL maps to a known page id; for "/" we leave it alone
  // (fetchProfile will navigate to the role's default route once it loads).
  useEffect(() => {
    const next = pathToPage(location.pathname);
    if (next && next !== page) {
      setPage(next);
    }
  }, [location.pathname, page]);

  // ── Role guard ──
  // If the resolved page is not allowed for the current role (e.g. a student
  // pegging /decks or a teacher landing on /classes), bounce to that role's
  // default route. We wait until the profile loads — before then we can't
  // decide. Admin-only pages have their own check at the page level (this
  // guard handles role boundaries, not admin/non-admin).
  useEffect(() => {
    if (!profile) return;
    const currentPage = pathToPage(location.pathname);
    if (!currentPage) return; // unknown path — let the catch-all 404 handle it
    if (!isPageAllowedForRole(currentPage, profile.role)) {
      navigate(defaultRouteForRole(profile.role), { replace: true });
    }
  }, [location.pathname, profile, navigate]);

  // ── Background prefetch of page chunks ──
  // Without this, every first visit to a page within a session shows a
  // Suspense fallback while its chunk downloads. We get the perf win of code-
  // splitting (small initial bundle) AND instant in-app navigation by warming
  // the chunk cache as soon as the profile is known.
  //
  // Run once per session. Tied to profile so that:
  //   1. We don't waste bandwidth before the user is authenticated.
  //   2. We pick the right chunks for the user's role.
  //   3. We can split the work into a "primary" (likely next-click) batch
  //      that runs first and a "rest" batch that runs after a short delay,
  //      so we don't hammer the network during the page's first paint.
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (!profile) return;
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    const isTeacher = profile.role === "teacher";

    // Pages the user is most likely to click next from their default view.
    // Loaded first (~50-100ms after profile is ready).
    const primary = isTeacher
      ? [importDecks, importSessionFlow, importMyClassesTeacher, importClassPage, importSettings]
      : [importMyClasses, importStudentJoin, importSettings];

    // Less-frequent but still in-role pages. Loaded after the primary batch
    // settles — they're nice-to-have, not critical-path.
    const secondary = [
      importCommunity,
      importNotifications,
      importTeacherProfile,
      ...(isTeacher ? [importDirector] : [importAchievements]),
      ...(profile.is_admin ? [importAdminAIStats] : []),
    ];

    // Prefer requestIdleCallback so we yield to user interactions; fall back
    // to setTimeout for browsers (Safari, mobile) that don't have it.
    const idle = (cb, timeout) => {
      if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        return window.requestIdleCallback(cb, { timeout });
      }
      return setTimeout(cb, timeout);
    };

    // Fire-and-forget: failures (offline, tab closing, etc.) don't matter —
    // lazy() will retry on the actual navigation if the chunk is still missing.
    const fireAll = (list) => list.forEach(fn => { fn().catch(() => {}); });

    idle(() => fireAll(primary), 200);
    idle(() => fireAll(secondary), 1500);
    // We intentionally don't return a cleanup that aborts the imports — once
    // the network request is in flight, letting it complete is fine and
    // populates the cache for any future visit.
  }, [profile]);

  // ── Practice deck hydration ──
  // The practice deck object is held in `practiceDeck` state for rendering.
  // Two ways to populate it:
  //   1. User clicks a deck in MyClasses → onLaunchPractice(deck) sets the
  //      object directly AND navigates to /practice/:deckId.
  //   2. User refreshes / deep-links to /practice/:deckId → we load the deck
  //      by id from the DB.
  // When the URL leaves /practice/:id (back button, sidebar nav, etc.), we
  // clear the state so we don't leak a stale deck into the next render.
  useEffect(() => {
    if (!practiceDeckId) {
      // Left the /practice URL — drop the in-memory deck.
      if (practiceDeck) setPracticeDeck(null);
      return;
    }
    // URL has a deckId. If we already have the matching object, nothing to
    // do (this happens when onLaunchPractice set the state right before
    // navigate fired). Otherwise hydrate from DB.
    if (practiceDeck && practiceDeck.id === practiceDeckId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("id", practiceDeckId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        // Deck not found / no access — bounce out cleanly.
        navigate(ROUTES.CLASSES, { replace: true });
        return;
      }
      setPracticeDeck(data);
    })();
    return () => { cancelled = true; };
    // practiceDeck is intentionally NOT in deps — listing it would re-run
    // this effect every time we set it, which is exactly what we just did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceDeckId]);

  // Navigation helper that replaces every old `setPage(id)` call. It walks the
  // legacy id → URL map and pushes the URL; the effect above then updates
  // `page` reactively.
  const goToPage = (id) => {
    const path = PAGE_TO_ROUTE[id];
    if (!path) return;
    navigate(path);
  };

  // Lock body scroll while the mobile drawer is open so the page underneath
  // doesn't scroll behind the backdrop.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (isMobile && mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => { document.body.style.overflow = prev || ""; };
  }, [isMobile, mobileDrawerOpen]);

  // If we're transitioning from mobile back to desktop while the drawer was
  // open, close it — otherwise it would stay "open" in the desktop layout
  // (which doesn't use it).
  useEffect(() => {
    if (!isMobile && mobileDrawerOpen) setMobileDrawerOpen(false);
  }, [isMobile, mobileDrawerOpen]);

  // Count active (non-dismissed) notifications so the sidebar badge stays in
  // sync. We re-count on profile load and whenever the user navigates away
  // from the notifications page (in case they dismissed some). We don't
  // re-count on every page change — only the transitions that matter.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    countVisibleNotifications(profile).then(n => {
      if (!cancelled) setNotifsCount(n);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [profile, page]);

  // Count pending teacher reviews for the sidebar badge. Only fetch for
  // teachers; students don't have the /review item. Re-counts on profile
  // load and on every page change (so leaving /review with grades just
  // applied updates the badge to its new lower number).
  useEffect(() => {
    if (!profile) return;
    if (profile.role !== "teacher") {
      setReviewBadgeCount(0);
      return;
    }
    let cancelled = false;
    countPendingReviewsForTeacher(profile.id).then(n => {
      if (!cancelled) setReviewBadgeCount(n);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [profile, page]);

  const fetchProfile = async (id, isInitial = true) => {
    try {
      let { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();

      // Defensive: if the DB trigger didn't create a profile row (can happen
      // with OAuth in some configurations), create one now using whatever we
      // know — the auth user's metadata + the pending role from localStorage.
      if (error && error.code === "PGRST116") {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        let pendingRole = null;
        try { pendingRole = localStorage.getItem("clasloop_pending_role"); } catch (_) {}
        const role = (pendingRole === "teacher" || pendingRole === "student") ? pendingRole : "student";
        const fullName = authUser?.user_metadata?.full_name
          || authUser?.user_metadata?.name
          || (authUser?.email ? authUser.email.split("@")[0] : "User");
        const insert = await supabase.from("profiles").insert({
          id, full_name: fullName, role,
        }).select().single();
        data = insert.data;
        error = insert.error;
      }

      if (!error && data) {
        let finalProfile = data;

        // Apply pending OAuth role if there is one. The select-role screen
        // saved this to localStorage right before the Google redirect. We
        // always apply it when present — the user explicitly clicked
        // "I'm a Teacher" or "I'm a Student" right before logging in, so
        // their intent is clear. We then clear localStorage so subsequent
        // logins don't keep flipping the role.
        try {
          const pendingRole = localStorage.getItem("clasloop_pending_role");
          if (pendingRole === "teacher" || pendingRole === "student") {
            if (data.role !== pendingRole) {
              const { data: updated } = await supabase
                .from("profiles")
                .update({ role: pendingRole })
                .eq("id", id)
                .select()
                .single();
              if (updated) finalProfile = updated;
            }
            localStorage.removeItem("clasloop_pending_role");
          }
        } catch (_) { /* localStorage may be disabled */ }

        setProfile(finalProfile);
        setLang(finalProfile.language || "en");

        // Only set the default page on the first profile load. Re-fetches
        // (e.g. token refresh on tab return) shouldn't yank the user back to
        // a default — they should stay where they were.
        //
        // Important: only navigate when the current URL is the bare "/".
        // If the user arrived with a deep link (e.g. /teacher/abc, /decks,
        // or any specific page), we leave the URL alone — the router is
        // already showing the right page and pathToPage() has the shadow
        // `page` state in sync.
        if (isInitial && location.pathname === "/") {
          if (viewingTeacherId) {
            // Defensive: viewingTeacherId is derived from the URL, so this
            // branch only fires if pathname is "/teacher/:id" — which the
            // outer `=== "/"` guard rules out. Kept for completeness in case
            // the matching logic changes later.
            navigate(buildRoute.teacher(viewingTeacherId), { replace: true });
          } else if (finalProfile.role === "student") {
            navigate(defaultRouteForRole("student"), { replace: true });
          } else {
            navigate(defaultRouteForRole("teacher"), { replace: true });
          }
        }
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); };

  if (loading && !user) return (
    <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ margin: "0 auto 12px", display: "inline-flex" }}>
          <LogoMark size={44} />
        </div>
        <p style={{ color: C.textMuted, fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  );

  if (!user) {
    if (authIntent) {
      return (
        <AuthScreen
          initialMode={authIntent.mode}
          initialRole={authIntent.role || "teacher"}
          onBack={() => setAuthIntent(null)}
        />
      );
    }
    return (
      <PublicHome
        onSignIn={() => setAuthIntent({ mode: "login" })}
        onSignUp={(role) => setAuthIntent({ mode: "signup", role })}
      />
    );
  }

  // First-time avatar pick for students. We only intercept if we have the
  // profile loaded (so we know the role) and they're a student without an
  // avatar yet. Teachers skip this — their value flow starts with creating
  // a class, not personalizing.
  if (profile && profile.role === "student" && !profile.avatar_id && !profile.avatar_url) {
    return (
      <AvatarOnboarding
        profile={profile}
        lang={lang}
        onDone={(avatarId) => setProfile(p => ({ ...p, avatar_id: avatarId }))}
      />
    );
  }

  const sidebarCSS = `
    .cl-nav { transition: all .15s ease; }
    .cl-nav:hover { background: ${C.accentSoft} !important; color: ${C.accent} !important; }
    .cl-nav:active { transform: scale(.97); }
    .cl-nav-active { background: ${C.accentSoft} !important; color: ${C.accent} !important; }
    .cl-signout { transition: all .15s ease; }
    .cl-signout:hover { color: ${C.red} !important; }
    .cl-collapse { transition: all .15s ease; }
    .cl-collapse:hover { background: ${C.accentSoft} !important; color: ${C.accent} !important; }
    .cl-profile-chip { transition: all .15s ease; }
    .cl-profile-chip:hover { background: ${C.accentSoft} !important; }
    .cl-profile-chip:active { transform: scale(.98); }
  `;

  const P = COMPONENTS[page];
  // When the student launches a practice from MyClasses, we render StudentJoin in
  // "practice mode" — bypassing the PIN/lobby flow and going straight to the deck.
  const inPractice = practiceDeck !== null;
  // 404 detection. We're inside the authed shell here — if the URL maps to no
  // known page id AND we're not at "/" (which fetchProfile redirects from),
  // show a Not Found screen. /teacher/:id is a special case: pathToPage maps
  // it to "teacherProfile" so it counts as known.
  const isNotFound = !inPractice && pathToPage(location.pathname) === null && location.pathname !== "/";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{sidebarCSS}</style>
      {/* Backdrop — covers everything below the drawer, click-to-close */}
      {isMobile && mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
            zIndex: 55, animation: "fadeIn .2s ease-out",
          }}
        />
      )}
      <Sidebar
        page={page}
        setPage={(p) => {
          // Sidebar nav. We clear practiceDeck eagerly so the practice screen
          // doesn't flash for one render before the URL effect drops it.
          // goToPage navigates away from /practice if we were there, which
          // also triggers the hydration effect to clear practiceDeck — this
          // is the belt-and-suspenders version that just avoids the flash.
          setPracticeDeck(null);
          goToPage(p);
        }}
        profile={profile}
        lang={lang}
        setLang={setLang}
        open={open}
        setOpen={setOpen}
        onSignOut={handleSignOut}
        onNavClick={() => setPageKey(k => k + 1)}
        isMobile={isMobile}
        mobileDrawerOpen={mobileDrawerOpen}
        setMobileDrawerOpen={setMobileDrawerOpen}
        notifsCount={notifsCount}
        reviewBadgeCount={reviewBadgeCount}
      />
      <div style={{ marginLeft: isMobile ? 0 : (open ? 210 : 56), flex: 1, transition: "margin-left .2s", minHeight: "100vh", background: C.bgSoft }}>
        <Suspense fallback={<PageSuspenseFallback />}>
          {inPractice ? (
            <StudentJoin
              key={`practice-${practiceDeck.id}`}
              lang={lang}
              setLang={setLang}
              profile={profile}
              practiceDeck={practiceDeck}
              onPracticeExit={() => {
                // Clearing the state isn't strictly needed (the URL effect will
                // drop it when /practice exits), but doing it eagerly avoids a
                // brief render of stale data while navigation completes.
                setPracticeDeck(null);
                navigate(ROUTES.CLASSES);
              }}
            />
          ) : isNotFound ? (
            <NotFoundScreen
              onGoHome={() => navigate(profile ? defaultRouteForRole(profile.role) : ROUTES.HOME)}
              lang={lang}
            />
          ) : (
            P && <P
              key={page === "teacherProfile" ? `teacher-${viewingTeacherId}` : pageKey}
              lang={lang}
              setLang={setLang}
              profile={profile}
              // Refrescar el profile del state global (App). Lo llaman pantallas
              // que muten profile en DB (ej. Settings cambiando avatar/foto/full_name)
              // para que el sidebar y el resto del app vean el cambio sin refresh.
              // No refresca página, solo el state.
              refreshProfile={() => { if (user?.id) fetchProfile(user.id, false); }}
              onOpenMobileMenu={isMobile ? () => setMobileDrawerOpen(true) : undefined}
              onLaunchPractice={(deck) => {
                // Set the deck object up front so the next render has it ready;
                // navigate puts /practice/:deckId in the URL so the back button
                // pops us out cleanly. The hydration effect above won't re-fetch
                // because the id will match what we just set.
                setPracticeDeck(deck);
                navigate(buildRoute.practice(deck.id));
              }}
              // Navigation callbacks: opts are now serialized into URL search
              // params. The destination page reads them via useSearchParams,
              // runs its effect, and clears them with setSearchParams({}, {replace:true}).
              onNavigateToDecks={(opts) => navigate(buildPathWithOpts(ROUTES.DECKS, opts, "decks"))}
              onNavigateToSessions={(opts) => navigate(buildPathWithOpts(ROUTES.SESSIONS, opts, "sessions"))}
              teacherId={page === "teacherProfile" ? viewingTeacherId : null}
              onNavigateToTeacher={(id) => navigate(buildRoute.teacher(id))}
              onNavigateToCommunity={() => goToPage("community")}
              onNavigate={(targetPage, opts) => {
                // Generic navigator used by Notifications. The opts dict is
                // mapped to the destination page's URL + search params.
                const path = PAGE_TO_ROUTE[targetPage];
                if (!path) return;
                navigate(buildPathWithOpts(path, opts, targetPage));
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
