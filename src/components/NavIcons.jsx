// ─── NavIcons ────────────────────────────────────────────────────────────────
// Monochrome line icons for the sidebar nav — ONE consistent voice
// (currentColor, 1.8 stroke, round joins). Replaces the ad-hoc Unicode glyphs
// (●▥▤✎◇○⚙★⊕⚡▢) where ▥/▤/▢ were nearly indistinguishable.
//
// Deliberately separate from the colorful CIcon set: CIcon stays for
// decorative / feature marks, while the chrome/nav is intentionally monochrome
// (Notion-calm). These inherit the nav item's color via currentColor — accent
// when active, muted otherwise.

const PATHS = {
  // Today — calendar with a "today" dot
  today: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  // To review — pencil
  review: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  // Classes — people / group
  classes: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  // Library / decks — stacked layers
  library: (
    <>
      <path d="M12 2.5 2.5 7 12 11.5 21.5 7 12 2.5Z" />
      <path d="m2.5 16.5 9.5 4.5 9.5-4.5" />
      <path d="m2.5 11.75 9.5 4.5 9.5-4.5" />
    </>
  ),
  // Scanner — scan frame + line
  scanner: (
    <>
      <path d="M3 7.5V5.5a2 2 0 0 1 2-2h2" />
      <path d="M17 3.5h2a2 2 0 0 1 2 2v2" />
      <path d="M21 16.5v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 20.5H5a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" />
    </>
  ),
  // Community — globe
  community: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </>
  ),
  // Notifications — bell
  notifications: (
    <>
      <path d="M6 8.5a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8H3.5s2.5-2 2.5-8" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  // Settings — sliders (cleaner than a gear at small sizes)
  settings: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="9" cy="7" r="2.3" fill="var(--c-bg-soft)" />
      <circle cx="15" cy="12" r="2.3" fill="var(--c-bg-soft)" />
      <circle cx="11" cy="17" r="2.3" fill="var(--c-bg-soft)" />
    </>
  ),
  // Join session — log-in (arrow entering a door)
  join: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
  // Achievements — trophy
  achievements: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.6V17c0 .8-.6 1.2-1.2 1.5C7.6 19.1 7 20.4 7 22" />
      <path d="M14 14.6V17c0 .8.6 1.2 1.2 1.5C16.4 19.1 17 20.4 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  // AI stats (admin) — bar chart
  aiStats: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16V8" />
      <path d="M17 16v-3" />
    </>
  ),
};

export default function NavGlyph({ name, size = 18 }) {
  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {content}
    </svg>
  );
}
