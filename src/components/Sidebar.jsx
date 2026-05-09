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
//   ⚙  AI stats     — admin only, settings adjacent

// Teacher nav. Order matches the redesign:
//   Today is the daily landing.
//   Classes → Decks → To review is the "preparing the next class" flow.
//   Community / Notifications / Settings are utility, lower priority.
const TEACHER_NAV = [
  { id: "sessions",      glyph: "●", label: "Today" },
  { id: "myClasses",     glyph: "▤", label: "My Classes" },
  { id: "decks",         glyph: "▥", label: "Decks" },
  { id: "review",        glyph: "✎", label: "To review", showBadge: "review" },
  { id: "community",     glyph: "◇", label: "Community" },
  { id: "notifications", glyph: "○", label: "Notifications", showBadge: "notifs" },
  { id: "settings",      glyph: "⚙", label: "Settings" },
];

// Student nav. Different shape — students join sessions, don't run them.
const STUDENT_NAV = [
  { id: "myClasses",     glyph: "▤", label: "My Classes" },
  { id: "studentJoin",   glyph: "⊕", label: "Join Session" },
  { id: "achievements",  glyph: "★", label: "Achievements" },
  { id: "community",     glyph: "◇", label: "Community" },
  { id: "notifications", glyph: "○", label: "Notifications", showBadge: "notifs" },
  { id: "settings",      glyph: "⚙", label: "Settings" },
];

// Admin extras. Appended to whichever role-nav the user has.
const ADMIN_EXTRAS = [
  { id: "adminAIStats", glyph: "⚡", label: "AI Stats" },
];

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
        padding: showLabels ? "7px 10px" : "9px 0",
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
        marginBottom: 1,
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
function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: C.textMuted,
        fontWeight: 600,
        padding: "12px 10px 4px",
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
}) {
  // Same role-defaulting logic as before — assume teacher unless the
  // profile says student. This avoids a sidebar-flicker during token
  // refresh when profile is briefly null.
  const isTeacher = profile
    ? profile.role === "teacher"
    : (page === "sessions" || page === "decks" || page === "director");
  const isAdmin = profile?.is_admin === true;

  const baseNav = isTeacher ? TEACHER_NAV : STUDENT_NAV;
  const nav = isAdmin ? [...baseNav, ...ADMIN_EXTRAS] : baseNav;

  // Width math: identical to the previous version so App.jsx's marginLeft
  // calculation doesn't need to change.
  const sidebarWidth = isMobile ? 240 : (open ? 210 : 56);
  const showLabels = isMobile ? true : open;
  const sidebarTransform = isMobile && !mobileDrawerOpen ? "translateX(-100%)" : "translateX(0)";

  // Mobile drawer: every nav action also closes the drawer so the user
  // doesn't have to tap × after picking a destination.
  const handleNav = (id) => {
    setPage(id);
    if (onNavClick) onNavClick();
    if (isMobile) setMobileDrawerOpen(false);
  };

  const badgeFor = (key) => {
    if (key === "review") return reviewBadgeCount;
    if (key === "notifs") return notifsCount;
    return 0;
  };

  return (
    <div
      style={{
        width: sidebarWidth,
        background: C.bgSoft,
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
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 6px" }}>
        {showLabels && (
          <SectionTitle>{isTeacher ? "Workspace" : "Learning"}</SectionTitle>
        )}
        {nav.map((item) => (
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

      {/* ─── Footer: language + profile + signout ─────────────── */}
      <div style={{ padding: "10px 10px 12px", borderTop: `1px solid ${C.border}` }}>
        {showLabels ? (
          <>
            {/* Language selector (preserved from previous sidebar — Jota
                deliberately moved this here so it lives with user-prefs,
                not page chrome). */}
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
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
                padding: "6px 8px",
                borderRadius: 7,
                background: page === "settings" ? C.accentSoft : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Outfit', sans-serif",
                marginBottom: 6,
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
                fontSize: 11,
                color: C.textMuted,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.textSecondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
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
