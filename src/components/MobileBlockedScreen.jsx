// ─────────────────────────────────────────────────────────────────────────────
// MobileBlockedScreen — shown when a mobile (phone) user tries to enter a
// flow that requires landscape space (quiz sessions, practice mode).
//
// Clasloop is a classroom tool — students typically use tablets or
// computers in class. Building a phone-friendly quiz UI would be 30+
// hours of theme rework. Instead phones can browse the app (MyClasses,
// Favorites, Settings) but get blocked from interactive flows.
//
// PR 28.17.2 added this inline in App.jsx; PR 28.17.3 extracts it to a
// shared component so GuestJoin (which renders OUTSIDE the App shell
// via /join in main.jsx) can use the same blocker without duplication.
//
// Three entry points block:
//   - App.jsx              (logged-in)            page === "studentJoin" or inPractice
//   - GuestJoin            (no-auth /join + QR)   any time
//
// `onBack` is optional — supply a handler when there's somewhere
// sensible to send the user (default route for their role, or "/").
// ─────────────────────────────────────────────────────────────────────────────
import { C } from "./tokens";
import { useT } from "../i18n";

export default function MobileBlockedScreen({ lang = "en", onBack }) {
  // PR 147 (M17): strings moved to the centralized i18n (namespace
  // "mobileBlocked"); getStrings falls back to EN for unknown langs.
  const txt = useT("mobileBlocked", lang);

  return (
    <div style={{
      // Was `minHeight: "100vh", minHeight: "100dvh"` (duplicate key — the
      // second silently won and esbuild warned every build). 100dvh is the
      // dynamic viewport height, which on mobile excludes the browser chrome
      // (better than 100vh). Browsers without dvh support (Safari < 15.4)
      // fall back to natural sizing, fine for this blocking screen.
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px",
      gap: 18,
      boxSizing: "border-box",
      textAlign: "center",
    }}>
      {/* Tablet + phone icons side by side — visual cue for "switch to this" */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 18, marginBottom: 4, color: C.accent,
      }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="2" width="18" height="20" rx="2" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      <h2 style={{
        fontFamily: "'Outfit',sans-serif",
        fontSize: 20, fontWeight: 700, lineHeight: 1.25,
        margin: 0, color: C.text, maxWidth: 320,
      }}>{txt.title}</h2>
      <p style={{
        fontSize: 14, lineHeight: 1.55,
        color: C.textSecondary, fontFamily: "'Outfit',sans-serif",
        margin: 0, maxWidth: 320,
      }}>{txt.body}</p>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            marginTop: 6,
            padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: C.accent, color: "#fff",
            border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}
        >{txt.cta}</button>
      )}
    </div>
  );
}
