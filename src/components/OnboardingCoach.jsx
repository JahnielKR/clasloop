// ─── OnboardingCoach ───────────────────────────────────────────────────────
// Cleo + a speech bubble that floats at the top of the screen to explain a
// first-run step — used above the create-class modal in the "create my first
// warmup" flow ("first we need a class, then we'll build the warmup"). Sits at
// z-index 1001, just above the Modal (z 1000). Presentational only.
import Cleo from "./Cleo";
import { C } from "./tokens";

const css = `
  @keyframes oc-rise { from { opacity:0; transform:translate(-50%,-8px) } to { opacity:1; transform:translate(-50%,0) } }
  @keyframes oc-bob  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-4px) } }
  .oc-wrap { animation: oc-rise .35s ease both }
  .oc-cleo { animation: oc-bob 3s ease-in-out infinite }
  @media (prefers-reduced-motion: reduce) {
    .oc-wrap, .oc-cleo { animation: none !important }
  }
`;

export default function OnboardingCoach({ title, body }) {
  return (
    <div
      className="oc-wrap"
      role="status"
      style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 1001, width: "calc(100% - 32px)", maxWidth: 460, pointerEvents: "none",
      }}
    >
      <style>{css}</style>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "14px 18px",
        boxShadow: "0 12px 36px rgba(0,0,0,0.16)",
        fontFamily: "'Outfit', sans-serif",
      }}>
        <div className="oc-cleo" aria-hidden="true" style={{ flexShrink: 0 }}>
          <Cleo size={56} expression="encouraging" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              {title}
            </div>
          )}
          <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.45 }}>
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}
