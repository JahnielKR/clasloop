// ─── OnboardingCoach ───────────────────────────────────────────────────────
// Cleo + a speech bubble that guides a brand-new teacher through their first
// run (create a class → build a warmup). Presentational only — the caller owns
// the flow state. Two layouts:
//   - floating: fixed top-center, sits ABOVE a modal (z-index 101 > Modal's
//     100). Used over CreateClassModal in the "create your first class" step.
//   - inline:   a banner in normal flow. Used at the top of the deck editor in
//     the "build your first warmup" step.
import Cleo from "./Cleo";
import { C } from "./tokens";

const css = `
  @keyframes oc-rise { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
  @keyframes oc-bob  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-4px) } }
  .oc-wrap { animation: oc-rise .35s ease both }
  .oc-cleo { animation: oc-bob 3s ease-in-out infinite }
  @media (prefers-reduced-motion: reduce) {
    .oc-wrap, .oc-cleo { animation: none !important }
  }
`;

export default function OnboardingCoach({ title, body, floating = false, onDismiss, dismissLabel }) {
  const bubble = (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "14px 18px",
      boxShadow: floating ? "0 12px 36px rgba(0,0,0,0.16)" : "0 2px 10px rgba(0,0,0,0.05)",
      maxWidth: 460,
    }}>
      <div className="oc-cleo" aria-hidden="true" style={{ flexShrink: 0 }}>
        <Cleo size={floating ? 56 : 48} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2, fontFamily: "'Outfit',sans-serif" }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.45, fontFamily: "'Outfit',sans-serif" }}>
          {body}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              marginTop: 8, padding: "5px 12px", borderRadius: 8,
              fontSize: 12.5, fontWeight: 600, color: C.accent,
              background: C.accentSoft, border: "none", cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {dismissLabel || "OK"}
          </button>
        )}
      </div>
    </div>
  );

  if (!floating) {
    return (
      <div className="oc-wrap" style={{ marginBottom: 16 }}>
        <style>{css}</style>
        {bubble}
      </div>
    );
  }

  return (
    <div
      className="oc-wrap"
      role="status"
      style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 101, width: "calc(100% - 32px)", maxWidth: 460,
        pointerEvents: "none",
      }}
    >
      <style>{css}</style>
      {bubble}
    </div>
  );
}
