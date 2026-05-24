import { C } from "../../../components/tokens";
import Cleo from "../../../components/Cleo";
import { useReveal } from "../useReveal";

export default function FinalCTA({ t, onSignUp }) {
  const [ref, visible] = useReveal();

  return (
    <section id="start" className="ph-section ph-anchor ph-final-cta" style={{
      padding: "130px 32px",
      position: "relative",
      overflow: "hidden",
      // Warm, reserved close: an accent glow rising from the base into bgSoft —
      // calmer and more premium than the old flat 135° diagonal ramp.
      background: `radial-gradient(ellipse 82% 70% at 50% 118%, ${C.accentSoft} 0%, transparent 56%), ${C.bgSoft}`,
      textAlign: "center",
    }}>
      <div ref={ref} className={`ph-reveal ${visible ? "is-visible" : ""}`} style={{ position: "relative", zIndex: 1 }}>
        {/* Cleo's one punctual moment on the page — she cheers you into signing
            up. Self-animating (motion/react), inert under reduced-motion. */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Cleo size={104} expression="cheer" />
        </div>
        <h2 className="ph-final-h2" style={{
          fontSize: 60, fontWeight: 700, color: C.text,
          margin: "0 0 16px", letterSpacing: "-0.02em", lineHeight: 1.08,
        }}>{t.finalTitle}</h2>
        <p className="ph-final-sub" style={{
          fontSize: 28, color: C.textSecondary,
          margin: "0 0 40px", lineHeight: 1.3,
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
