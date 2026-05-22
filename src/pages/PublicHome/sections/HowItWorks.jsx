import { C, MONO } from "../../../components/tokens";
import { useReveal } from "../useReveal";

export default function HowItWorks({ t }) {
  const [headRef, headVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();

  const steps = [
    { num: "1", title: t.step1Title, body: t.step1Body, color: C.accent },
    { num: "2", title: t.step2Title, body: t.step2Body, color: C.purple },
    { num: "3", title: t.step3Title, body: t.step3Body, color: "#1D9E75" },
  ];

  return (
    <section id="how" className="ph-section ph-anchor" style={{
      padding: "120px 32px",
      background: C.bgSoft,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", textAlign: "center" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`}>
          <h2 className="ph-section-h2" style={{
            fontSize: 52, fontWeight: 700, color: C.text,
            margin: "0 0 20px", letterSpacing: "-0.02em",
          }}>{t.howTitle}</h2>
          <p className="ph-section-sub" style={{
            fontSize: 22, color: C.textSecondary,
            margin: "0 0 70px", maxWidth: 760,
            marginLeft: "auto", marginRight: "auto", lineHeight: 1.5,
          }}>{t.howSub}</p>
        </div>
        <div ref={gridRef} className={`ph-how-grid ph-stagger ${gridVisible ? "is-visible" : ""}`} style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 34, textAlign: "left",
        }}>
          {steps.map(s => (
            <div key={s.num} className="ph-step-card" style={{
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 18, padding: 40,
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 54, height: 54, borderRadius: "50%",
                background: `${s.color}1A`, color: s.color,
                fontSize: 22, fontWeight: 700, marginBottom: 22,
                fontFamily: MONO,
              }}>{s.num}</div>
              <h3 className="ph-step-title" style={{
                fontSize: 26, fontWeight: 600, color: C.text,
                margin: "0 0 12px",
              }}>{s.title}</h3>
              <p className="ph-step-body" style={{
                fontSize: 18, color: C.textSecondary,
                lineHeight: 1.55, margin: 0,
              }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
