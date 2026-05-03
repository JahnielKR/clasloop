import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Icon, { LogoMark, SessionsIcon, AIGenIcon, SchoolIcon, CommunityIcon, NotificationsIcon, SettingsIcon, JoinSessionIcon, ProgressIcon, AchievementsIcon, ActivitiesIcon, TeacherInline, StudentInline, TeacherAvatar, StudentAvatar, BackArrow } from './components/Icons';
import SessionFlow from './pages/SessionFlow';
import StudentJoin from './pages/StudentJoin';
import MainApp from './pages/MainApp';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Community from './pages/Community';
import Achievements from './pages/Achievements';
import Activities from './pages/Activities';
import Settings from './pages/Settings';
import Director from './pages/Director';
import Notifications from './pages/Notifications';
import Decks from './pages/Decks';

const C = {
  bg: "#FFFFFF", bgSoft: "#F7F7F5", accent: "#2383E2", accentSoft: "#E8F0FE",
  green: "#0F7B6C", greenSoft: "#EEFBF5", orange: "#D9730D",
  red: "#E03E3E", redSoft: "#FDECEC", purple: "#6940A5", purpleSoft: "#F3EEFB",
  text: "#191919", textSecondary: "#6B6B6B", textMuted: "#9B9B9B", border: "#E8E8E4",
};
const COMPONENTS = { sessions: SessionFlow, studentJoin: StudentJoin, mainApp: MainApp, landing: Landing, onboarding: Onboarding, community: Community, achievements: Achievements, activities: Activities, settings: Settings, director: Director, notifications: Notifications, decks: Decks };

function AuthScreen() {
  const [mode, setMode] = useState("select");
  const [role, setRole] = useState("teacher");
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
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const inp = { fontFamily: "'Outfit',sans-serif", background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "11px 14px", borderRadius: 8, fontSize: 14, width: "100%", outline: "none" };
  const btnP = { width: "100%", padding: "12px", borderRadius: 9, fontSize: 15, fontWeight: 600, background: `linear-gradient(135deg,${C.accent},${C.purple})`, color: "#fff", border: "none", cursor: "pointer", opacity: loading ? .5 : 1, fontFamily: "'Outfit',sans-serif" };
  const btnS = { width: "100%", padding: "12px", borderRadius: 9, fontSize: 15, fontWeight: 600, background: C.bg, color: C.text, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "'Outfit',sans-serif" };

  if (mode === "select") return (
    <div style={{ minHeight: "100vh", background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
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
        <button onClick={() => { setMode("select"); setError(""); }} style={{ background: "transparent", border: "none", color: C.textSecondary, fontSize: 13, cursor: "pointer", marginBottom: 16, fontFamily: "'Outfit'" }}>← Back</button>
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

function Sidebar({ page, setPage, profile, lang, setLang, open, setOpen, onSignOut, onNavClick }) {
  // Default to teacher unless we know for sure they're a student
  // This prevents the sidebar from flipping during token refresh
  const isT = profile ? profile.role === "teacher" : (page === "sessions" || page === "decks" || page === "director");
  const nav = isT
    ? [{ id:"sessions",icon:(a)=><SessionsIcon size={28} active={a}/>,l:"Sessions" },{ id:"decks",icon:(a)=><CommunityIcon size={28} active={a}/>,l:"Decks" },{ id:"director",icon:(a)=><SchoolIcon size={28} active={a}/>,l:"School" },{ id:"community",icon:(a)=><CommunityIcon size={28} active={a}/>,l:"Community" },{ id:"notifications",icon:(a)=><NotificationsIcon size={28} active={a}/>,l:"Notifications" },{ id:"settings",icon:(a)=><SettingsIcon size={28} active={a}/>,l:"Settings" }]
    : [{ id:"studentJoin",icon:(a)=><JoinSessionIcon size={28} active={a}/>,l:"Join Session" },{ id:"mainApp",icon:(a)=><ProgressIcon size={28} active={a}/>,l:"My Progress" },{ id:"achievements",icon:(a)=><AchievementsIcon size={28} active={a}/>,l:"Achievements" },{ id:"activities",icon:(a)=><ActivitiesIcon size={28} active={a}/>,l:"Activities" },{ id:"community",icon:(a)=><CommunityIcon size={28} active={a}/>,l:"Community" },{ id:"settings",icon:(a)=><SettingsIcon size={28} active={a}/>,l:"Settings" }];

  return (
    <div style={{ width: open ? 210 : 56, background: C.bg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 50, transition: "width .2s", overflow: "hidden" }}>
      <div style={{ padding: "14px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 50 }}>
        {open && <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <LogoMark size={26} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.03em", fontFamily: "'Outfit',sans-serif" }}>clasloop</span>
        </div>}
        {!open && <LogoMark size={26} />}
        {open && <button className="cl-collapse" onClick={() => setOpen(!open)} style={{ width: 26, height: 26, borderRadius: 6, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.textMuted, flexShrink: 0, border: "none", cursor: "pointer" }}>◀</button>}
      </div>
      {!open && <button className="cl-collapse" onClick={() => setOpen(true)} style={{ margin: "4px 6px", padding: "6px", borderRadius: 6, background: C.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.textMuted, border: "none", cursor: "pointer" }}>▶</button>}
      <div style={{ flex: 1, overflow: "auto", padding: "0 6px" }}>
        {nav.map(n => {
          const isActive = page === n.id;
          return <button key={n.id} className={isActive ? "cl-nav cl-nav-active" : "cl-nav"} onClick={() => { setPage(n.id); if (onNavClick) onNavClick(); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: open?"9px 10px":"9px", borderRadius: 8, width: "100%", background: isActive?C.accentSoft:"transparent", fontSize: 13, fontWeight: isActive?600:500, color: isActive?C.accent:C.textSecondary, marginBottom: 2, textAlign: "left", justifyContent: open?"flex-start":"center", border: "none", cursor: "pointer" }}>
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{n.icon(isActive)}</span>{open && n.l}
          </button>;
        })}
      </div>
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
        {open ? <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{isT?<TeacherAvatar size={30}/>:<StudentAvatar size={30}/>}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.full_name||"User"}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{isT?"Teacher":`Lv.${profile?.level||1}`}</div>
            </div>
          </div>
          <button className="cl-signout" onClick={onSignOut} style={{ fontSize: 11, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>Sign out</button>
        </> : <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{isT?<TeacherAvatar size={26}/>:<StudentAvatar size={26}/>}</div>
        </div>}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("sessions");
  const [pageKey, setPageKey] = useState(0);
  const [lang, setLang] = useState("en");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (u && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        fetchProfile(u.id);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }

      // Clean OAuth hash
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (!error && data) {
        setProfile(data);
        setLang(data.language || "en");
        // Set default page based on role
        if (data.role === "student") {
          setPage("mainApp");
        } else {
          setPage("sessions");
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
        <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="1.8"/><path d="M12 8v4l2.5 2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p style={{ color: C.textMuted, fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  );

  if (!user) return <AuthScreen />;

  const sidebarCSS = `
    .cl-nav { transition: all .15s ease; }
    .cl-nav:hover { background: #E8F0FE !important; color: #2383E2 !important; }
    .cl-nav:active { transform: scale(.97); }
    .cl-nav-active { background: #E8F0FE !important; color: #2383E2 !important; }
    .cl-signout { transition: all .15s ease; }
    .cl-signout:hover { color: #E03E3E !important; }
    .cl-collapse { transition: all .15s ease; }
    .cl-collapse:hover { background: #E8F0FE !important; color: #2383E2 !important; }
  `;

  const P = COMPONENTS[page];
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{sidebarCSS}</style>
      <Sidebar page={page} setPage={setPage} profile={profile} lang={lang} setLang={setLang} open={open} setOpen={setOpen} onSignOut={handleSignOut} onNavClick={() => setPageKey(k => k + 1)} />
      <div style={{ marginLeft: open ? 210 : 56, flex: 1, transition: "margin-left .2s", minHeight: "100vh", background: C.bgSoft }}>
        {P && <P key={pageKey} lang={lang} setLang={setLang} profile={profile} user={user} />}
      </div>
    </div>
  );
}
