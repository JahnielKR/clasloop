// ─── CleoGuide ───────────────────────────────────────────────────────────────
// Cleo as a public landing tour guide: a small floating mascot that greets
// visitors and narrates each section as they scroll — before any signup/login.
// The same Cleo that greets teachers in onboarding, so the brand loop closes
// (outside → inside). Driven by the `active` section id from useActiveSection
// (computed once in index.jsx, also used for the nav highlight).
//
// She sits in ONE fixed corner (bottom-left) and gently bobs; only her speech
// bubble updates per section as you scroll. Tasteful + non-intrusive:
// dismissible (persisted) and honors reduced-motion. (She used to hop between
// corners, but that was distracting — she stays put now.)
import { useState } from "react";
import Cleo from "../../components/Cleo";
import { C } from "../../components/tokens";
import { useT } from "../../i18n";
import { safeGetJSON, safeSetJSON } from "../../lib/safe-storage";

const DISMISS_KEY = "clasloop_cleo_guide_dismissed";

// Section ids (document order) that have a narration line. Anything else
// (or null = hero/top) shows the greeting.
const SECTION_KEYS = ["generate", "print", "live", "types", "insights", "why", "start"];

// Fixed bottom-left anchor. The bubble points toward the center (right) so it
// stays on-screen and clears the centered content.
const POS = { bottom: 20, left: 20 };

const css = `
  @keyframes clg-in   { from { opacity:0; transform:scale(.82) } to { opacity:1; transform:scale(1) } }
  @keyframes clg-bob  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-5px) } }
  @keyframes clg-fade { from { opacity:0 } to { opacity:1 } }
  .clg-wrap { animation: clg-in .42s cubic-bezier(.16,1,.3,1) both; }
  .clg-cleo { animation: clg-bob 3s ease-in-out infinite; }
  .clg-line { animation: clg-fade .28s ease both; }
  .clg-x { transition: background .15s, color .15s; }
  .clg-x:hover { background: ${C.bgSoft}; color: ${C.text}; }
  @media (max-width: 640px) {
    .clg-bubble { padding: 10px 30px 10px 12px !important; }
    .clg-line { font-size: 12.5px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .clg-wrap, .clg-cleo, .clg-line { animation: none !important; }
  }
`;

export default function CleoGuide({ lang = "en", active }) {
  const t = useT("cleoGuide", lang);
  const [dismissed, setDismissed] = useState(() => safeGetJSON(DISMISS_KEY, false) === true);

  if (dismissed) return null;

  const key = active && SECTION_KEYS.includes(active) ? active : null;
  const line = (key && t[key]) || t.greeting;

  const dismiss = () => {
    setDismissed(true);
    safeSetJSON(DISMISS_KEY, true);
  };

  return (
    <>
      <style>{css}</style>
      <div
        className="clg-wrap"
        style={{
          position: "fixed", zIndex: 40,
          bottom: POS.bottom, left: POS.left,
          display: "flex", alignItems: "flex-end", gap: 10,
          maxWidth: 340, fontFamily: "'Outfit', sans-serif",
          pointerEvents: "none",
        }}
      >
      <div className="clg-cleo" aria-hidden="true" style={{ flexShrink: 0 }}>
        <Cleo size={60} />
      </div>

      <div
        className="clg-bubble"
        style={{
          position: "relative",
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 16,
          // Tail corner points toward Cleo (bottom-left).
          borderBottomLeftRadius: 4,
          padding: "12px 32px 12px 14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={dismiss}
          aria-label={t.dismiss}
          className="clg-x"
          style={{
            position: "absolute", top: 6, right: 6,
            width: 20, height: 20, borderRadius: 6,
            display: "grid", placeItems: "center",
            background: "transparent", color: C.textMuted,
            border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1,
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          ×
        </button>
        {/* key={line} re-mounts the text so each new line gently fades in. */}
        <div
          key={line}
          className="clg-line"
          aria-live="polite"
          style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.45 }}
        >
          {line}
        </div>
      </div>
      </div>
    </>
  );
}
