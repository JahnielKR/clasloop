import { C } from "../../../components/tokens";
import { CIcon } from "../../../components/Icons";
import { useReveal } from "../useReveal";

export default function WhyDaily({ t }) {
  const [headRef, headVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();

  const whys = [
    { title: t.why1Title, body: t.why1Body, icon: "spaced" },
    { title: t.why2Title, body: t.why2Body, icon: "library" },
    { title: t.why3Title, body: t.why3Body, icon: "subjects" },
  ];

  return (
    <section id="why" className="ph-section ph-anchor" style={{ padding: "120px 32px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", textAlign: "center" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`}>
          <h2 className="ph-section-h2" style={{
            fontSize: 52, fontWeight: 700, color: C.text,
            margin: "0 0 20px", letterSpacing: "-0.02em",
          }}>{t.whyTitle}</h2>
          <p className="ph-section-sub" style={{
            fontSize: 22, color: C.textSecondary,
            margin: "0 0 70px", maxWidth: 820,
            marginLeft: "auto", marginRight: "auto", lineHeight: 1.5,
          }}>{t.whySub}</p>
        </div>
        <div ref={gridRef} className={`ph-why-grid ph-stagger ${gridVisible ? "is-visible" : ""}`} style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 36, textAlign: "left",
        }}>
          {whys.map(w => (
            <div key={w.title} style={{ padding: 8 }}>
              <div style={{ marginBottom: 18 }}><CIcon name={w.icon} size={58} /></div>
              <h3 className="ph-why-title" style={{
                fontSize: 26, fontWeight: 600, color: C.text,
                margin: "0 0 12px",
              }}>{w.title}</h3>
              <p className="ph-why-body" style={{
                fontSize: 18, color: C.textSecondary,
                lineHeight: 1.55, margin: 0,
              }}>{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
