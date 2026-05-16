import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import { ROUTES, PAGE_TO_ROUTE, pathToPage, defaultRouteForRole, buildRoute, buildPathWithOpts, isPageAllowedForRole } from './routes';
import { supabase } from './lib/supabase';
import { LogoMark, TeacherInline, StudentInline, TeacherAvatar, StudentAvatar } from './components/Icons';
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
const importSessionRecap   = () => import('./pages/SessionRecap');
const importFavorites      = () => import('./pages/Favorites');

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
const SessionRecap     = lazy(importSessionRecap);
const Favorites        = lazy(importFavorites);
import { useIsMobile } from './components/MobileMenuButton';
import { countVisibleNotifications, countPendingReviewsForTeacher } from './lib/notifications';
import { C } from './components/tokens';
import Sidebar from './components/Sidebar';
import ClassCodeModal from './components/ClassCodeModal';
import MobileBlockedScreen from './components/MobileBlockedScreen';

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

const COMPONENTS = { sessions: SessionFlow, studentJoin: StudentJoin, community: Community, achievements: Achievements, settings: Settings, director: Director, notifications: Notifications, decks: Decks, myClasses: MyClassesByRole, teacherProfile: TeacherProfile, adminAIStats: AdminAIStats, review: Review, deckResults: DeckResults, classInsights: ClassInsights, myResults: MyResults, sessionRecap: SessionRecap, favorites: Favorites };

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
    // PR 37: Only persist the role pick when the user is SIGNING UP. In
    // login mode the user already has an account; their existing profile
    // is the source of truth. Setting pendingRole in login mode caused
    // bug #1: clicking "Sign in" + Google for a NEW user created a
    // profile with whatever default role was in state ("teacher"), or
    // worse, a stale value from a previous session in localStorage.
    //
    // We also defensively CLEAR localStorage in login mode, so a leftover
    // value from a previous signup attempt doesn't get picked up by the
    // callback handler.
    if (mode === "signup") {
      try { localStorage.setItem("clasloop_pending_role", role); } catch (_) {}
    } else {
      try { localStorage.removeItem("clasloop_pending_role"); } catch (_) {}
    }
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

// PR 28.17.3: MobileBlockedScreen extracted to src/components so GuestJoin
// can reuse it (GuestJoin renders outside the App shell via main.jsx).

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
  // PR 36: when the OAuth callback brings us back as a duplicate of an
  // existing account (same email, different auth.users row), we set this
  // and render a blocking screen with sign-out instructions.
  const [duplicateEmailError, setDuplicateEmailError] = useState(false);
  // PR 37: when an OAuth user lands without a profile AND without a
  // pendingRole in localStorage (i.e. they clicked "Sign in" not "Sign up"
  // and they're actually new), we don't know what role they want. Force
  // them to pick one before creating the profile.
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [pendingProfileCreation, setPendingProfileCreation] = useState(null);
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
  // PR 28.7: realtime "you were removed from a class" toast.
  // null = no toast; { className, ts } = visible toast.
  // Set by the realtime subscription effect below; auto-cleared
  // by a second effect that also redirects to /classes after 3s.
  const [removedToast, setRemovedToast] = useState(null);
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
  // PR 26: Class membership gate for students. Tracks whether the
  // current student account belongs to any class. While null, we
  // haven't checked yet (don't show the modal). false → modal opens
  // and blocks. true → modal stays closed. Recomputed when the
  // student joins a class via the modal.
  // PR 26.2 + 26.3: bumped on every change to the student's class
  // membership — joining (modal) AND leaving (class detail page).
  // Pages that show student data add this to their useEffect deps
  // so they re-fetch automatically without needing a full reload.
  // Also feeds the membership-check useEffect below, so the
  // ClassCodeModal can re-appear if a student leaves their last
  // class.
  const [studentMembershipTick, setStudentMembershipTick] = useState(0);
  const [studentHasClass, setStudentHasClass] = useState(null);
  // Count of free-text responses pending the current teacher's review.
  // Drives the red badge on the "To review" sidebar item. Same pattern
  // as notifsCount: count on profile load, refresh whenever `page`
  // changes (so navigating into /review and out updates the number after
  // the teacher grades a few). Teacher-only — students never see this.
  const [reviewBadgeCount, setReviewBadgeCount] = useState(0);
  // PR 23.13: when a teacher has a session live (lobby or active status)
  // we want the sidebar to surface a "back to session" shortcut. Null
  // when there's none. Teacher-only.
  const [activeSessionId, setActiveSessionId] = useState(null);
  // PR 23.13.1: bump to force re-poll of activeSessionId. Used by
  // SessionFlow after cancel/end so the sidebar updates immediately,
  // not after the next page change.
  const [activeSessionTick, setActiveSessionTick] = useState(0);
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

  // ── PR 28.7: realtime "removed from class" detection ──
  //
  // When a teacher removes a student via StudentsModal, the student's
  // `class_members` row is deleted. Without realtime, the student
  // keeps navigating the dimmed/cached version of that class until
  // they F5. With this subscription:
  //
  //   1. We listen for DELETE events on class_members filtered to
  //      this student's id (only their rows; minimal noise).
  //   2. On a delete, fetch the class name (the old row only has the
  //      class_id), then set the toast.
  //   3. A second effect below auto-dismisses the toast and redirects
  //      to /classes after 3s. Re-evaluation of studentHasClass at
  //      /classes naturally opens the ClassCodeModal if it was their
  //      only class — no special handling needed here.
  //
  // Why we DON'T also bump studentMembershipTick: navigating to
  // /classes triggers a route change, and MyClasses re-mounts +
  // re-fetches on every mount anyway. The redirect IS the refresh.
  //
  // Teachers don't need this — they can't be removed from their own
  // classes. Guarded on profile.role === "student".
  useEffect(() => {
    if (!profile || profile.role !== "student") return;
    const channel = supabase
      .channel(`class_member_removals:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "class_members",
          filter: `student_id=eq.${profile.id}`,
        },
        async (payload) => {
          const classId = payload.old?.class_id;
          if (!classId) return;
          // Fetch the class name for a friendlier toast. If RLS now
          // blocks reading the class (the student was JUST removed),
          // we still show a generic toast — better than silence.
          let className = "";
          try {
            const { data } = await supabase
              .from("classes")
              .select("name")
              .eq("id", classId)
              .maybeSingle();
            className = data?.name || "";
          } catch { /* generic toast below */ }
          setRemovedToast({ className, ts: Date.now() });
          // Bump the membership tick so the gating useEffect re-checks
          // immediately — important when the student was in zero
          // other classes (the ClassCodeModal needs to open).
          setStudentMembershipTick(n => n + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // ── PR 28.7: removed-toast auto-dismiss + redirect ──
  // Visible for 3s, then we send the student to /classes and clear
  // the toast. The redirect is intentional: it gets them out of any
  // page that was showing data from the now-inaccessible class.
  useEffect(() => {
    if (!removedToast) return;
    const timer = setTimeout(() => {
      setRemovedToast(null);
      // Only navigate if they're not already on /classes — avoids a
      // useless history entry.
      if (location.pathname !== ROUTES.CLASSES) {
        navigate(ROUTES.CLASSES, { replace: false });
      }
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removedToast]);

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

  // PR 23.13: detect the teacher's current active session, if any. Used
  // by the sidebar to surface a "back to session" shortcut for teachers
  // who closed the tab mid-quiz. We poll on profile load and on every
  // page change — cheap query (status filter + teacher_id, index hit).
  // No realtime subscription: when the teacher is inside the session
  // (sessions page) the SessionFlow page handles refresh itself; this
  // is only for finding their way BACK.
  useEffect(() => {
    if (!profile) return;
    if (profile.role !== "teacher") {
      setActiveSessionId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Include sessions even if pending_close_at IS set — the teacher
      // might have closed the tab and is now coming back, which is
      // exactly the case we want to surface. Just exclude completed.
      //
      // PR 23.13.5: also exclude sessions older than 24 hours. Pre-
      // PR 23.13.3 cancel was silently failing (schema rejected
      // 'cancelled' status), so many teachers have rows stuck in
      // lobby/active from days/weeks ago. Those are zombies, not
      // real active sessions. A real session lasts minutes — even
      // a long quiz finishes in <2h. 24h is a generous ceiling
      // that won't accidentally hide a legitimate ongoing session.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("sessions")
        .select("id, status, topic, created_at")
        .eq("teacher_id", profile.id)
        .in("status", ["lobby", "active"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      // PR 28.1: removed PR 23.13.4 debug log — the active-session
      // badge has been verified working across cancel/end/refresh
      // flows. If it regresses, re-add the log temporarily here:
      //   console.log("[clasloop] activeSession poll:",
      //     { tick: activeSessionTick, page, found: data?.[0] || null, error });
      setActiveSessionId(data?.[0]?.id || null);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [profile, page, activeSessionTick]);

  // PR 26: Check whether a student account has at least one class
  // membership. If false, the ClassCodeModal opens (rendered near
  // the bottom of the component) and blocks further interaction.
  //
  // CRITICAL: this effect MUST live above all the early returns of
  // this component (auth loading, AvatarOnboarding, etc.). Putting
  // it after them causes React error #310 ("rendered more hooks
  // than during the previous render") because the early returns
  // sometimes skip past this hook call and sometimes don't.
  //
  // Teachers and unauthenticated users skip the work — the field
  // stays at its initial null and the gating block downstream never
  // triggers.
  useEffect(() => {
    if (!profile || profile.role !== "student") {
      setStudentHasClass(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("student_id", profile.id);
      if (cancelled) return;
      if (error) {
        // On query error default to "has class" so the modal doesn't
        // trap students if the DB hiccups.
        console.error("[clasloop] class membership check failed:", error);
        setStudentHasClass(true);
        return;
      }
      setStudentHasClass((count || 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.role, studentMembershipTick]);

  const fetchProfile = async (id, isInitial = true) => {
    try {
      // PR 36: defense against duplicate accounts with the same email.
      // The OAuth flow can produce two distinct auth.users rows with the
      // same email if the user signs out and back in. Before we trust
      // this session, ask the DB if there's another user with our email.
      // If so, this is a duplicate account — sign out and show a blocking
      // screen telling the user to keep their original account.
      try {
        const { data: isDuplicate } = await supabase.rpc("email_already_registered");
        if (isDuplicate === true) {
          setDuplicateEmailError(true);
          setProfile(null);
          setLoading(false);
          return;
        }
      } catch (e) {
        // If the RPC doesn't exist or fails, don't block login. Log and
        // continue — better to over-permit than to lock everyone out.
        console.warn("[clasloop] email_already_registered check skipped:", e?.message);
      }

      let { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();

      // Defensive: if the DB trigger didn't create a profile row (can happen
      // with OAuth in some configurations), create one now using whatever we
      // know — the auth user's metadata + the pending role from localStorage.
      // PR 36: This is the ONLY moment pendingRole is consumed — at FIRST
      // profile creation. Pre-existing profiles never have their role flipped
      // by a localStorage value (that bug let users toggle roles by logging
      // out, clicking the other role button, and logging back in).
      // PR 37: If pendingRole is NOT set (user clicked "Sign in" rather than
      // "Sign up"), we DON'T silently pick a default. Instead, force a role
      // selection screen and stop here — the user picks, then this fn is
      // re-run from completeProfileCreation().
      if (error && error.code === "PGRST116") {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        let pendingRole = null;
        try { pendingRole = localStorage.getItem("clasloop_pending_role"); } catch (_) {}

        if (pendingRole !== "teacher" && pendingRole !== "student") {
          // No valid pendingRole — user clicked "Sign in" without choosing
          // a role. Force them to pick one. Save the auth context so we can
          // resume after they choose.
          const fullName = authUser?.user_metadata?.full_name
            || authUser?.user_metadata?.name
            || (authUser?.email ? authUser.email.split("@")[0] : "User");
          setPendingProfileCreation({ id, fullName });
          setNeedsRoleSelection(true);
          setLoading(false);
          return;
        }

        const fullName = authUser?.user_metadata?.full_name
          || authUser?.user_metadata?.name
          || (authUser?.email ? authUser.email.split("@")[0] : "User");
        const insert = await supabase.from("profiles").insert({
          id, full_name: fullName, role: pendingRole,
        }).select().single();
        data = insert.data;
        error = insert.error;
        // Clear the pending role NOW — it served its purpose
        try { localStorage.removeItem("clasloop_pending_role"); } catch (_) {}
      } else {
        // Profile already existed. Even if pendingRole is in localStorage
        // (e.g. user clicked "I'm a Teacher" before logging in to an
        // existing student account), we IGNORE it. One account = one role.
        // We do clean up the localStorage so it doesn't sit around.
        try { localStorage.removeItem("clasloop_pending_role"); } catch (_) {}
      }

      if (!error && data) {
        const finalProfile = data;

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

  // PR 37: called by the forced role-picker screen when the user chooses
  // teacher or student. Creates the profile with the chosen role and then
  // re-runs fetchProfile so the normal flow continues (set state, redirect).
  const completeProfileCreation = async (chosenRole) => {
    if (!pendingProfileCreation) return;
    const { id, fullName } = pendingProfileCreation;
    try {
      const insert = await supabase.from("profiles").insert({
        id, full_name: fullName, role: chosenRole,
      }).select().single();
      if (insert.error) {
        console.error("[clasloop] profile creation failed:", insert.error);
        return;
      }
      setNeedsRoleSelection(false);
      setPendingProfileCreation(null);
      // Re-run fetchProfile to apply normal post-load logic (setProfile,
      // setLang, navigate to default route).
      await fetchProfile(id, true);
    } catch (err) {
      console.error("[clasloop] completeProfileCreation error:", err);
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

  // PR 36: blocking screen when the current session is a duplicate of an
  // existing account (same email, different auth.users row). One email =
  // one role. The user must sign out, and re-enter with the original
  // account or contact support.
  if (duplicateEmailError) {
    const i18nDup = {
      en: {
        title: "Account already exists",
        body: "There's already a Clasloop account using this email. One email can only be used for one role — either teacher or student, not both. Please sign in with your original account.",
        signOut: "Sign out",
      },
      es: {
        title: "Esta cuenta ya existe",
        body: "Ya hay una cuenta de Clasloop con este email. Un email solo puede tener un rol — profesor o estudiante, no ambos. Iniciá sesión con tu cuenta original.",
        signOut: "Cerrar sesión",
      },
      ko: {
        title: "이미 존재하는 계정",
        body: "이 이메일을 사용하는 Clasloop 계정이 이미 있습니다. 하나의 이메일은 교사 또는 학생 중 하나의 역할만 사용할 수 있습니다.",
        signOut: "로그아웃",
      },
    };
    const td = i18nDup[lang] || i18nDup.en;
    return (
      <div style={{
        minHeight: "100vh",
        background: C.bgSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <LogoMark size={48} />
          </div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 24, fontWeight: 700,
            color: C.text,
            marginBottom: 12,
          }}>{td.title}</h1>
          <p style={{
            color: C.textSecondary,
            fontSize: 15,
            lineHeight: 1.5,
            marginBottom: 28,
          }}>{td.body}</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setDuplicateEmailError(false);
              setUser(null);
              setProfile(null);
            }}
            style={{
              padding: "12px 24px",
              borderRadius: 9,
              fontSize: 15,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}
          >{td.signOut}</button>
        </div>
      </div>
    );
  }

  // PR 37: forced role selection screen. Appears when an OAuth user lands
  // without a profile AND without a pendingRole in localStorage (e.g. they
  // clicked "Sign in" and are actually a new user). We don't know if
  // they're a teacher or a student; ask explicitly before creating the
  // profile.
  if (needsRoleSelection) {
    const i18nRP = {
      en: {
        title: "One more thing",
        subtitle: "Are you a teacher or a student?",
        teacher: "I'm a Teacher",
        student: "I'm a Student",
      },
      es: {
        title: "Una cosa más",
        subtitle: "¿Sos profesor o estudiante?",
        teacher: "Soy Profesor",
        student: "Soy Estudiante",
      },
      ko: {
        title: "한 가지 더",
        subtitle: "교사이신가요, 학생이신가요?",
        teacher: "교사입니다",
        student: "학생입니다",
      },
    };
    const trp = i18nRP[lang] || i18nRP.en;
    const btnBase = {
      width: "100%",
      padding: "14px 18px",
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "'Outfit', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    };
    return (
      <div style={{
        minHeight: "100vh",
        background: C.bgSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <LogoMark size={48} />
          </div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 24, fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}>{trp.title}</h1>
          <p style={{
            color: C.textSecondary,
            fontSize: 15,
            marginBottom: 28,
          }}>{trp.subtitle}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => completeProfileCreation("teacher")}
              style={{
                ...btnBase,
                background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
                color: "#fff",
                border: "none",
              }}
            ><TeacherInline size={20} /> {trp.teacher}</button>
            <button
              onClick={() => completeProfileCreation("student")}
              style={{
                ...btnBase,
                background: C.bg,
                color: C.text,
                border: `1px solid ${C.border}`,
              }}
            ><StudentInline size={20} /> {trp.student}</button>
          </div>
        </div>
      </div>
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
    /* PR 23.4: sidebar height with dvh fallback. Older browsers
       (and Safari < 15.4) ignore the dvh rule and keep vh. Newer
       browsers use dvh which is browser-chrome-aware. */
    .cl-sidebar-root { height: 100vh; height: 100dvh; }
    .cl-signout { transition: all .15s ease; }
    .cl-signout:hover { color: ${C.red} !important; }
    .cl-collapse { transition: all .15s ease; }
    .cl-collapse:hover { background: ${C.accentSoft} !important; color: ${C.accent} !important; }
    .cl-profile-chip { transition: all .15s ease; }
    .cl-profile-chip:hover { background: ${C.accentSoft} !important; }
    .cl-profile-chip:active { transform: scale(.98); }
    /* PR 23.13: pulsing dot for the active-session button */
    @keyframes cl-pulse {
      0%, 100% { box-shadow: 0 0 0 0 ${C.red}88; }
      50%      { box-shadow: 0 0 0 6px ${C.red}00; }
    }
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
        activeSessionId={activeSessionId}
      />
      <div style={{ marginLeft: isMobile ? 0 : (open ? 210 : 56), flex: 1, transition: "margin-left .2s", minHeight: "100vh", background: C.bgSoft }}>
        <Suspense fallback={<PageSuspenseFallback />}>
          {/* PR 28.17.2: phone (mobile) blocker for landscape-only flows.
              The themed quiz UI in StudentJoin assumes a wide viewport
              (240px right rail + question panel). Phones can browse the
              rest of the app, but joining sessions and practicing decks
              are blocked. Tablets are fine (above 768px threshold). */}
          {isMobile && (inPractice || page === "studentJoin") ? (
            <MobileBlockedScreen
              lang={lang}
              onBack={() => {
                if (inPractice) setPracticeDeck(null);
                navigate(profile ? defaultRouteForRole(profile.role) : ROUTES.HOME);
              }}
            />
          ) : inPractice ? (
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
              // PR 26.2 + 26.3: bumped when student membership changes
              // (joins via modal OR leaves via class detail page). Student-
              // facing pages include it in useEffect deps so they re-fetch
              // immediately. Pages that allow leaving a class can also
              // call notifyMembershipChanged() below to force a re-check
              // of the gating modal.
              studentMembershipTick={studentMembershipTick}
              notifyMembershipChanged={() => setStudentMembershipTick(n => n + 1)}
              // PR 23.13.1: pages that mutate the teacher's active session
              // (SessionFlow on cancel/end) call this so the sidebar's
              // "Active session" badge updates immediately without
              // requiring a page navigation.
              notifyActiveSessionChanged={() => setActiveSessionTick(n => n + 1)}
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

      {/* PR 26: gating modal for students with no class membership.
          Renders on top of the dimmed app shell — the student CAN see
          the platform behind, but can't interact with it until they
          join a class or sign out. studentHasClass starts null while
          we check, false after we confirm "no membership"; the modal
          opens only when false. */}
      {profile?.role === "student" && studentHasClass === false && (
        <ClassCodeModal
          profile={profile}
          lang={lang}
          onJoined={() => {
            // PR 26.2 + 26.3: flip the gate AND bump the membership
            // tick. Flipping unblocks the UI immediately; the tick
            // tells student pages (MyClasses) to re-fetch so the
            // freshly-joined class appears without a manual reload,
            // and re-runs App's own check so the gate state stays
            // consistent.
            setStudentHasClass(true);
            setStudentMembershipTick(n => n + 1);
          }}
        />
      )}

      {/* PR 28.7: realtime "removed from class" toast. Fixed bottom-right
          (mobile: bottom-center via media query in inline style). Auto
          disappears after 3s and the navigate-to-classes effect fires
          at the same time. Color is orange (informational, not alarming
          — could be a teacher mistake). */}
      {removedToast && (() => {
        const i18n = {
          en: {
            withClass: "You were removed from {class}",
            withoutClass: "You were removed from this class",
          },
          es: {
            withClass: "Te removieron de {class}",
            withoutClass: "Te removieron de esta clase",
          },
          ko: {
            withClass: "{class}에서 제거되었습니다",
            withoutClass: "이 수업에서 제거되었습니다",
          },
        };
        const tt = i18n[lang] || i18n.en;
        const msg = removedToast.className
          ? tt.withClass.replace("{class}", removedToast.className)
          : tt.withoutClass;
        return (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 2000,
              maxWidth: "calc(100vw - 48px)",
              background: C.orange,
              color: "#fff",
              padding: "12px 18px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Outfit',sans-serif",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {msg}
          </div>
        );
      })()}
    </div>
  );
}
