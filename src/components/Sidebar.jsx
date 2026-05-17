// ─── Sidebar ────────────────────────────────────────────────────────────
// Refactored from the inline Sidebar that used to live in App.jsx.
//
// Same external contract as before — same props, same setPage(id) calls —
// so App.jsx imports this and nothing else changes. The visual language is
// where it differs:
//
//   Before: each nav item had a custom illustrated SVG icon with rounded
//           soft-color backgrounds (active state lit up in pastel). It
//           worked, but it competed with the content for attention and
//           gave the app a slightly playful / "for-kids" feel that didn't
//           match the seriousness of the work teachers do here.
//
//   After:  typography-first. Items are labels with subtle leading dots
//           (filled = active), grouped under small section headers
//           ("Class · Spanish 9th"). The accent color appears on the
//           active item background only. Cleaner, calmer, and gets out
//           of the way of the deck cards which ARE supposed to be
//           visually loud.
//
// Note on responsive behavior: this sidebar keeps the same three modes
// the original had — desktop expanded (210px wide, labels visible),
// desktop collapsed (56px wide, icons-only-glyph), mobile drawer
// (240px wide, slides in from the left). Width math is exactly the
// same as before so App.jsx's marginLeft calc doesn't change.
//
// Why ASCII/Unicode glyphs instead of the old SVG icons:
//   1. They scale with font-size automatically — one knob to tune.
//   2. They're already legible in the collapsed (56px) mode without any
//      extra container/padding gymnastics.
//   3. The old icons are still exported from Icons.jsx and used in deck
//      covers, achievement screens, etc. — we don't lose them, we just
//      stop using them in the sidebar.

import { LogoMark, TeacherAvatar, StudentAvatar } from "./Icons";
import { Avatar as ProfileAvatar } from "./Avatars";
import { C } from "./tokens";
import { useNavigate } from "react-router-dom";
import { buildRoute } from "../routes";

// ─── Nav config ────────────────────────────────────────────────────────
// Glyph chosen per role: each is a single Unicode char that reads at any
// size. Picked for distinctiveness (you don't want two items that look
// alike in the collapsed view).
//
//   ●  Today        — solid dot. The "now" item.
//   ▥  Decks        — book / file
//   ▤  Classes      — table / grid
//   ✎  To review    — pencil (grading)
//   ◇  Community    — open diamond (loose, unowned content)
//   ○  Notifs       — open circle (event)
//   ⚙  Settings     — gear (universal)
//   ★  Achievements — star (student-side gamification)
//   ⊕  Join         — circled plus (join action)
//   ⚡  AI stats     — admin only
//
// The nav is structured as GROUPS, not a flat list. Each group reflects
// a different mental mode the teacher is in:
//
//   TODAY    — "what does today need from me"
//              Today + To review. Sustains the daily rhythm.
//   TEACH    — "where I prepare and review my material"
//              My Classes + Decks. The doors to all teaching content.
//              When PR4 (Plan view) lands, Classes becomes the entry
//              into unit planning — keeping it grouped with Decks here
//              already nudges toward "this is where the work lives".
//   DISCOVER — "what others are doing", non-urgent exploration
//              Community.
//   ACCOUNT  — "personal settings + system pings"
//              Notifications + Settings.
//
// Grouping by frequency-of-use means a teacher's eye lands on TODAY first
// (where they are 80% of the time) and never has to scan past 7 items to
// find what they need. The visual breathing between groups also fixes
// the "everything packed under one header" feel of the v1 sidebar.

// Teacher nav groups
//
// PR 56 fix 5: las labels son CLAVES, no texto literal. Se traducen al
// render con el i18n abajo. Antes estaba hardcoded en inglés y nunca
// pasaba por traducción.
const TEACHER_NAV_GROUPS = [
  {
    title: "today",
    items: [
      { id: "sessions", glyph: "●", label: "today" },
      { id: "review",   glyph: "✎", label: "toReview", showBadge: "review" },
    ],
  },
  {
    title: "teach",
    items: [
      { id: "myClasses", glyph: "▤", label: "myClasses" },
      { id: "decks",     glyph: "▥", label: "library" },
      // PR 57.3: reactivado. El scanner ahora corre con ML Kit nativo.
      // En web muestra banner "Descargá la app", en native abre la cámara
      // ML Kit del sistema.
      { id: "scan",      glyph: "▢", label: "scanner" },
    ],
  },
  {
    title: "discover",
    items: [
      { id: "community", glyph: "◇", label: "community" },
    ],
  },
  {
    title: "account",
    divided: true,
    items: [
      { id: "notifications", glyph: "○", label: "notifications", showBadge: "notifs" },
      { id: "settings",      glyph: "⚙", label: "settings" },
    ],
  },
];

// Student nav groups
const STUDENT_NAV_GROUPS = [
  {
    title: "learn",
    items: [
      { id: "myClasses",   glyph: "▤", label: "myClasses" },
      { id: "studentJoin", glyph: "⊕", label: "joinSession" },
    ],
  },
  {
    title: "progress",
    items: [
      { id: "achievements", glyph: "★", label: "achievements" },
    ],
  },
  {
    title: "discover",
    items: [
      { id: "community", glyph: "◇", label: "community" },
    ],
  },
  {
    title: "account",
    divided: true,
    items: [
      { id: "notifications", glyph: "○", label: "notifications", showBadge: "notifs" },
      { id: "settings",      glyph: "⚙", label: "settings" },
    ],
  },
];

// Admin extras. Appended as its own group after the role's groups so it
// reads as "you're a power user, here's the extra stuff" rather than
// inserted somewhere weird.
const ADMIN_GROUP = {
  title: "admin",
  divided: true,
  items: [
    { id: "adminAIStats", glyph: "⚡", label: "aiStats" },
  ],
};

// PR 56 fix 5: i18n para todas las labels y group titles del sidebar.
// Single source of truth — agregar nuevo nav item = agregar key acá.
const SIDEBAR_I18N = {
  en: {
    today: "Today", toReview: "To review",
    teach: "Teach", myClasses: "My Classes", library: "Library", scanner: "Scanner",
    discover: "Discover", community: "Community",
    account: "Account", notifications: "Notifications", settings: "Settings",
    learn: "Learn", joinSession: "Join Session",
    progress: "Progress", achievements: "Achievements",
    admin: "Admin", aiStats: "AI Stats",
  },
  es: {
    today: "Hoy", toReview: "Por revisar",
    teach: "Enseñar", myClasses: "Mis Clases", library: "Biblioteca", scanner: "Escáner",
    discover: "Descubrir", community: "Comunidad",
    account: "Cuenta", notifications: "Notificaciones", settings: "Ajustes",
    learn: "Aprender", joinSession: "Unirse a Sesión",
    progress: "Progreso", achievements: "Logros",
    admin: "Admin", aiStats: "Estadísticas IA",
  },
  ko: {
    today: "오늘", toReview: "복습할 항목",
    teach: "수업", myClasses: "내 수업", library: "라이브러리", scanner: "스캐너",
    discover: "둘러보기", community: "커뮤니티",
    account: "계정", notifications: "알림", settings: "설정",
    learn: "학습", joinSession: "세션 참여",
    progress: "진행 상황", achievements: "업적",
    admin: "관리자", aiStats: "AI 통계",
  },
};

// ─── Subcomponents ─────────────────────────────────────────────────────

// One nav row. `active` lights the background; `glyph` shows in the small
// 16px gutter on the left so the visual weight is on the label.
//
// In collapsed mode (showLabels=false) we widen the glyph slightly and
// drop the text — the glyph itself becomes the affordance.
function NavItem({ item, active, showLabels, badgeCount, onClick }) {
  const showBadgeNumber = item.showBadge && badgeCount > 0;
  return (
    <button
      onClick={onClick}
      title={!showLabels ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: showLabels ? "6px 10px" : "8px 0",
        borderRadius: 6,
        background: active ? C.accentSoft : "transparent",
        color: active ? C.accent : C.textSecondary,
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        fontFamily: "'Outfit', sans-serif",
        textAlign: "left",
        justifyContent: showLabels ? "flex-start" : "center",
        border: "none",
        cursor: "pointer",
        // 2px between items — small but enough to avoid the "packed" feel
        // the v1 sidebar had. Combined with the 16px between groups, this
        // gives the sidebar a clear visual rhythm: group-cluster-group.
        marginBottom: 2,
        transition: "background .12s ease, color .12s ease",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.035)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          textAlign: "center",
          fontSize: showLabels ? 13 : 16,
          opacity: active ? 1 : 0.75,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {item.glyph}
      </span>
      {showLabels && (
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.label}
        </span>
      )}
      {showBadgeNumber && (
        <span
          style={{
            // In expanded view the badge sits inline at the right of the
            // row. In collapsed view it floats top-right of the glyph
            // so it stays visible without text.
            ...(showLabels
              ? { marginLeft: "auto" }
              : { position: "absolute", top: 4, right: 6 }),
            background: C.red,
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: 8,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.4,
            minWidth: 16,
            textAlign: "center",
          }}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </button>
  );
}

// Section header inside the sidebar — small uppercase label that groups
// items under a heading. Only shown in expanded mode (collapsed mode skips
// it, the whole sidebar is just glyphs).
//
// Padding rationale: more breathing room ABOVE than below — the title
// belongs to the items that follow it, so it sits closer to them. The
// generous top margin (16px on non-first groups) is what gives the
// sidebar its "respira" feel between sections.
function SectionTitle({ children, isFirst = false, divided = false }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        textTransform: "uppercase",
        letterSpacing: "0.09em",     // wider than v1's 0.07 — feels more architectural
        color: C.textMuted,
        fontWeight: 600,
        // First group has no top margin (sits flush with the brand area).
        // Subsequent groups get a generous gap so each block reads as its own.
        // `divided` adds a hairline border above for the Account group, where
        // we want a stronger "this is a different kind of thing" cut.
        padding: divided ? "14px 10px 4px" : "10px 10px 4px",
        marginTop: isFirst ? 0 : 16,
        borderTop: divided ? `1px solid ${C.border}` : "none",
        // When we have a top border, the marginTop above pushes the border
        // down too — that's the desired result. The line ends up visually
        // at the top of the gap, separating clusters cleanly.
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
//
// Props are exactly the same as the previous inline Sidebar so App.jsx
// can swap implementations with a one-line import change.
export default function Sidebar({
  page,
  setPage,
  profile,
  lang,
  setLang,
  open,
  setOpen,
  onSignOut,
  onNavClick,
  isMobile,
  mobileDrawerOpen,
  setMobileDrawerOpen,
  notifsCount = 0,
  reviewBadgeCount = 0,
  activeSessionId = null,
}) {
  // Same role-defaulting logic as before — assume teacher unless the
  // profile says student. This avoids a sidebar-flicker during token
  // refresh when profile is briefly null.
  const isTeacher = profile
    ? profile.role === "teacher"
    : (page === "sessions" || page === "decks" || page === "director");
  const isAdmin = profile?.is_admin === true;

  // Pick the group set for this role and append the admin group if applicable.
  // The result is a list of groups, each with its own title + items.
  const baseGroups = isTeacher ? TEACHER_NAV_GROUPS : STUDENT_NAV_GROUPS;
  const rawGroups = isAdmin ? [...baseGroups, ADMIN_GROUP] : baseGroups;

  // PR 56 fix 5: traducir labels y group titles según el idioma actual.
  // Antes estaban hardcoded en inglés y el sidebar nunca cambiaba al
  // cambiar idioma. Ahora todos los labels son keys, y acá las
  // resolvemos al texto del idioma.
  const tr = SIDEBAR_I18N[lang] || SIDEBAR_I18N.en;
  const navGroups = rawGroups.map(group => ({
    ...group,
    title: tr[group.title] || group.title,
    items: group.items.map(item => ({
      ...item,
      label: tr[item.label] || item.label,
    })),
  }));

  // Width math: identical to the previous version so App.jsx's marginLeft
  // calculation doesn't need to change.
  const sidebarWidth = isMobile ? 240 : (open ? 210 : 56);
  const showLabels = isMobile ? true : open;
  const sidebarTransform = isMobile && !mobileDrawerOpen ? "translateX(-100%)" : "translateX(0)";

  // Mobile drawer: every nav action also closes the drawer so the user
  // doesn't have to tap × after picking a destination.
  const navigate = useNavigate();
  const handleNav = (id) => {
    setPage(id);
    if (onNavClick) onNavClick();
    if (isMobile) setMobileDrawerOpen(false);
  };

  // PR 23.13: click handler for the "Active session" shortcut item.
  // Navigates the teacher straight to the lobby for their open session.
  // SessionFlow will then auto-redirect to /sessions/live/<id> if the
  // session is already in active status.
  const handleActiveSessionNav = () => {
    if (!activeSessionId) return;
    if (onNavClick) onNavClick();
    if (isMobile) setMobileDrawerOpen(false);
    navigate(buildRoute.sessionsLobby(activeSessionId));
  };

  // PR 23.13: i18n for the active session button label
  const activeSessionLabel = lang === "es" ? "Sesión activa"
    : lang === "ko" ? "진행 중인 세션"
    : "Active session";

  const badgeFor = (key) => {
    if (key === "review") return reviewBadgeCount;
    if (key === "notifs") return notifsCount;
    return 0;
  };

  return (
    <div
      className="cl-sidebar-root"
      style={{
        width: sidebarWidth,
        background: C.bgSoft,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        /* PR 23.4: height comes from .cl-sidebar-root class with
           100vh + 100dvh fallback (in App.jsx's sidebarCSS). dvh
           accounts for Safari iOS browser chrome that vh doesn't. */
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 60,
        transition: isMobile ? "transform .25s ease" : "width .2s",
        overflow: "hidden",
        transform: sidebarTransform,
        boxShadow: isMobile && mobileDrawerOpen ? "0 0 24px rgba(0,0,0,.12)" : "none",
      }}
    >
      {/* ─── Top: brand + collapse/close ────────────────────── */}
      <div
        style={{
          padding: "16px 12px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 50,
        }}
      >
        {showLabels ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={24} />
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                fontFamily: "'Outfit', sans-serif",
                color: C.text,
              }}
            >
              clasloop
            </span>
          </div>
        ) : (
          <LogoMark size={24} />
        )}

        {/* Desktop collapse arrow */}
        {!isMobile && open && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Collapse sidebar"
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "transparent",
              color: C.textMuted,
              fontSize: 11,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ◀
          </button>
        )}
        {/* Mobile close × */}
        {isMobile && (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: "transparent",
              color: C.textSecondary,
              fontSize: 18,
              lineHeight: 1,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Desktop expand arrow when collapsed */}
      {!isMobile && !open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Expand sidebar"
          style={{
            margin: "2px 8px 6px",
            padding: "4px",
            borderRadius: 5,
            background: "transparent",
            color: C.textMuted,
            fontSize: 11,
            border: "none",
            cursor: "pointer",
          }}
        >
          ▶
        </button>
      )}

      {/* ─── Nav ─────────────────────────────────────────────── */}
      {/* Padded slightly more than v1 (8 vs 4 top) so the first group's
          title doesn't sit too tight against the brand area. */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 6px" }}>
        {/* PR 23.13: "Active session" shortcut for teachers who closed
            the tab mid-quiz and need to find their way back. Renders
            only when isTeacher AND there's a session in lobby/active
            for this teacher. Sits ABOVE the regular nav groups so
            it's the first thing the eye lands on. Red dot + accent
            color signal urgency. */}
        {isTeacher && activeSessionId && (
          <div style={{ marginBottom: 6 }}>
            <button
              type="button"
              onClick={handleActiveSessionNav}
              className="cl-nav"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: showLabels ? "10px 12px" : "10px 0",
                justifyContent: showLabels ? "flex-start" : "center",
                background: C.redSoft,
                color: C.red,
                border: "none",
                borderRadius: 8,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
              title={showLabels ? undefined : activeSessionLabel}
            >
              {/* Pulsing red dot */}
              <span style={{
                width: 8, height: 8,
                borderRadius: "50%",
                background: C.red,
                flexShrink: 0,
                animation: "cl-pulse 1.4s ease-in-out infinite",
                boxShadow: `0 0 0 0 ${C.red}`,
              }} />
              {showLabels && <span>{activeSessionLabel}</span>}
            </button>
          </div>
        )}

        {navGroups.map((group, gIdx) => (
          // In collapsed mode we drop the title (no room for it) but keep
          // a small visual gap between groups via marginTop on the items
          // wrapper. The Account group still gets a hairline divider in
          // collapsed mode — the cut is visible at-a-glance even when
          // labels are hidden, which preserves the "kinds of things"
          // grouping.
          <div
            key={group.title}
            style={{
              marginTop: !showLabels && gIdx > 0 ? 10 : 0,
              borderTop: !showLabels && group.divided ? `1px solid ${C.border}` : "none",
              paddingTop: !showLabels && group.divided ? 10 : 0,
            }}
          >
            {showLabels && (
              <SectionTitle isFirst={gIdx === 0} divided={group.divided}>
                {group.title}
              </SectionTitle>
            )}
            {group.items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={page === item.id}
                showLabels={showLabels}
                badgeCount={item.showBadge ? badgeFor(item.showBadge) : 0}
                onClick={() => handleNav(item.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ─── Footer: language + profile + signout ─────────────── */}
      {/* PR 23.2: flex-shrink: 0 prevents the footer from being
          squashed when the viewport is short (phones in portrait
          where the available height is small). Without this, the
          sign-out button got pushed off the bottom of the visible
          drawer on small screens. */}
      <div style={{
        padding: isMobile ? "8px 10px 10px" : "10px 10px 12px",
        /* PR 23.4: extra bottom padding for iOS home indicator / Safari
           browser bar. Without this, sign-out gets clipped on iPhones
           with rounded bottom corners. */
        paddingBottom: isMobile ? `max(10px, env(safe-area-inset-bottom))` : "12px",
        borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {showLabels ? (
          <>
            {/* Language selector (preserved from previous sidebar — Jota
                deliberately moved this here so it lives with user-prefs,
                not page chrome). */}
            <div style={{ display: "flex", gap: 4, marginBottom: isMobile ? 6 : 10 }}>
              {[["en", "EN"], ["es", "ES"], ["ko", "한"]].map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    background: lang === code ? C.accentSoft : "transparent",
                    color: lang === code ? C.accent : C.textMuted,
                    border: `1px solid ${lang === code ? C.accent + "33" : C.border}`,
                    cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Profile chip — clicking it opens Settings, matching the
                previous sidebar's behavior. */}
            <button
              onClick={() => handleNav("settings")}
              title="Open Settings"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: isMobile ? "4px 6px" : "6px 8px",
                borderRadius: 7,
                background: page === "settings" ? C.accentSoft : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Outfit', sans-serif",
                marginBottom: isMobile ? 2 : 6,
                transition: "background .12s ease",
              }}
              onMouseEnter={(e) => {
                if (page !== "settings") e.currentTarget.style.background = "rgba(0,0,0,0.035)";
              }}
              onMouseLeave={(e) => {
                if (page !== "settings") e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {profile ? (
                  <ProfileAvatar
                    photoUrl={profile.avatar_url}
                    id={profile.avatar_id}
                    seed={profile.id}
                    size={28}
                  />
                ) : isTeacher ? (
                  <TeacherAvatar size={28} />
                ) : (
                  <StudentAvatar size={28} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: page === "settings" ? C.accent : C.text,
                    lineHeight: 1.3,
                  }}
                >
                  {profile?.full_name || "User"}
                </div>
                <div style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.3 }}>
                  {isTeacher ? "Teacher" : `Lv.${profile?.level || 1}`}
                </div>
              </div>
            </button>

            <button
              onClick={onSignOut}
              style={{
                /* PR 23.3: in mobile, make the sign out a proper
                   visible secondary button instead of a tiny tertiary
                   link. Students need to find it easily on phones. */
                fontSize: isMobile ? 12 : 11,
                color: isMobile ? C.textSecondary : C.textMuted,
                background: "transparent",
                border: isMobile ? `1px solid ${C.border}` : "none",
                borderRadius: isMobile ? 6 : 0,
                cursor: "pointer",
                padding: isMobile ? "6px 10px" : "4px 8px",
                fontFamily: "'Outfit', sans-serif",
                width: isMobile ? "100%" : "auto",
                marginTop: isMobile ? 4 : 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.textSecondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = isMobile ? C.textSecondary : C.textMuted)}
            >
              Sign out
            </button>
          </>
        ) : (
          // Collapsed view: just the avatar circle, click → Settings
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => handleNav("settings")}
              title="Open Settings"
              aria-label="Open Settings"
              style={{
                width: 30,
                height: 30,
                padding: 0,
                borderRadius: "50%",
                background: page === "settings" ? C.accentSoft : "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {profile ? (
                <ProfileAvatar
                  photoUrl={profile.avatar_url}
                  id={profile.avatar_id}
                  seed={profile.id}
                  size={26}
                />
              ) : isTeacher ? (
                <TeacherAvatar size={26} />
              ) : (
                <StudentAvatar size={26} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
