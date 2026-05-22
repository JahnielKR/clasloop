import { C } from "../../../components/tokens";
import { useReveal } from "../useReveal";

export default function FinalCTA({ t, onSignUp }) {
  const [ref, visible] = useReveal();

  return (
    <section id="start" className="ph-section ph-anchor" style={{
      padding: "120px 32px",
      background: `linear-gradient(135deg, ${C.accentSoft} 0%, ${C.bgSoft} 100%)`,
      textAlign: "center",
    }}>
      <div ref={ref} className={`ph-reveal ${visible ? "is-visible" : ""}`}>
        <h2 className="ph-final-h2" style={{
          fontSize: 60, fontWeight: 700, color: C.text,
          margin: "0 0 18px", letterSpacing: "-0.02em",
        }}>{t.finalTitle}</h2>
        <p className="ph-final-sub" style={{
          fontSize: 28, color: C.textSecondary,
          margin: "0 0 44px",
        }}>{t.finalSub}</p>
        <button
          className="ph-cta-primary ph-btn-primary"
          onClick={() => onSignUp?.()}
          style={{
            background: C.accent, color: "#fff",
            padding: "20px 48px", borderRadius: 12,
            fontSize: 21, fontWeight: 600,
            border: "none", cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
          }}
        >{t.ctaPrimary}</button>
        <p style={{
          fontSize: 17, color: C.textMuted,
          margin: "18px 0 0",
        }}>{t.ctaSubtext}</p>
      </div>
    </section>
  );
}
