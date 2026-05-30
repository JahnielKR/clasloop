// ─── BottomNav ──────────────────────────────────────────────────────────
// Ola 3: mobile-only bottom tab bar. On phones the sidebar is a drawer, so
// reaching a destination took two taps (hamburger → item). This puts the four
// most-used destinations one tap away, plus a "Más" tab that opens the existing
// drawer for the overflow (To-review / Scanner / Notifications / Settings…), so
// nothing becomes unreachable and we don't rebuild the whole nav.
//
// Role-aware, mirrors the sidebar's ids so navigation goes through the same
// goToPage() path in App.jsx. Reuses the monochrome NavGlyph set.

import NavGlyph from "./NavIcons";
import { C } from "./tokens";

const TEACHER_TABS = [
  { id: "sessions",  icon: "today",     label: "today" },
  { id: "myClasses", icon: "classes",   label: "myClasses" },
  { id: "decks",     icon: "library",   label: "library" },
  { id: "community", icon: "community", label: "community" },
];

const STUDENT_TABS = [
  { id: "myClasses",   icon: "classes",      label: "myClasses" },
  { id: "studentJoin", icon: "join",         label: "joinSession" },
  { id: "achievements",icon: "achievements", label: "achievements" },
  { id: "community",   icon: "community",    label: "community" },
];

// Short tab labels (the sidebar uses longer ones — "Mis Clases" — that don't fit
// a five-up bar). Keyed by the i18n lang code.
const LABELS = {
  en: { today: "Today", myClasses: "Classes", library: "Library", community: "Community", joinSession: "Join", achievements: "Awards", more: "More" },
  es: { today: "Hoy", myClasses: "Clases", library: "Biblioteca", community: "Comunidad", joinSession: "Unirse", achievements: "Logros", more: "Más" },
  ko: { today: "오늘", myClasses: "수업", library: "라이브러리", community: "커뮤니티", joinSession: "참여", achievements: "업적", more: "더보기" },
};

function MoreGlyph({ size = 22 }) {
  // Three stacked lines — the universal "menu/more" affordance.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Tab({ active, label, onClick, children, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "7px 2px 5px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? C.accent : C.textSecondary,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <span style={{ display: "flex", opacity: active ? 1 : 0.75, position: "relative" }}>{children}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: active ? 600 : 500,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomNav({
  role = "teacher",
  page,
  lang = "en",
  onNav,
  onMore,
  reviewBadgeCount = 0,
  notifsCount = 0,
}) {
  const t = LABELS[lang] || LABELS.en;
  const tabs = role === "student" ? STUDENT_TABS : TEACHER_TABS;
  // The overflow (drawer) holds To-review + Notifications; surface a dot on
  // "Más" so the teacher knows something there needs attention.
  const moreHasBadge = reviewBadgeCount + notifsCount > 0;

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        // Above page content, but below the drawer backdrop (z55) + modals
        // (z1000) so opening the drawer or a modal covers it.
        zIndex: 40,
        display: "flex",
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
        // iOS home-indicator safe area so the tabs aren't under the gesture bar.
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 8px rgba(0,0,0,0.04)",
      }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          active={page === tab.id}
          label={t[tab.label] || tab.label}
          onClick={() => onNav?.(tab.id)}
        >
          <NavGlyph name={tab.icon} size={22} />
        </Tab>
      ))}
      <Tab active={false} label={t.more} ariaLabel={t.more} onClick={() => onMore?.()}>
        <MoreGlyph size={22} />
        {moreHasBadge && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -2,
              right: -3,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: C.red,
              border: `1.5px solid ${C.bg}`,
            }}
          />
        )}
      </Tab>
    </nav>
  );
}
