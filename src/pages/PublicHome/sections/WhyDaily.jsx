import { C } from "../../../components/tokens";
import { useReveal } from "../useReveal";
import SectionHeader from "./SectionHeader";

// ─── WhyDaily ──────────────────────────────────────────────────────────────
// "Why daily" — three benefit cards. Each gets a small on-brand mini-visual
// (not a generic icon) that illustrates the benefit: spaced repetition as a
// resurfacing timeline, reuse as a stack of saved warmups, any-subject as a set
// of colorful subject chips. SVG fills use hex literals (var() doesn't resolve
// in SVG presentation attributes; the landing is always light so the light
// palette values are correct).

// 1 — Spaced repetition: the tricky concept resurfaces on widening intervals.
function SpacedVisual() {
  const days = [{ x: 32, label: "D1", r: 7 }, { x: 100, label: "D3", r: 6 }, { x: 188, label: "D7", r: 5 }];
  return (
    <svg viewBox="0 0 220 100" width="100%" style={{ maxWidth: 240, display: "block", margin: "0 auto" }} aria-hidden="true">
      <line x1="22" y1="66" x2="200" y2="66" stroke="#E8E8E4" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 66 Q66 38 100 66" fill="none" stroke="#2383E2" strokeWidth="2" strokeDasharray="3,3" />
      <path d="M100 66 Q144 32 188 66" fill="none" stroke="#2383E2" strokeWidth="2" strokeDasharray="3,3" />
      <text x="144" y="20" fill="#2383E2" fontSize="15" fontWeight="700" textAnchor="middle">↻</text>
      {days.map((d, i) => (
        <g key={d.label}>
          <circle cx={d.x} cy="66" r={d.r} fill="#2383E2" />
          {i === days.length - 1 && (
            <path d={`M${d.x - 2.4} 66 l1.6 1.8 l3.2 -4`} fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <text x={d.x} y="86" fill="#9B9B9B" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

// 2 — Reuse: a stack of saved warmups with a reuse badge.
function ReuseVisual() {
  return (
    <div style={{ position: "relative", width: 130, height: 92, margin: "0 auto" }}>
      {[2, 1, 0].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute", left: i * 11, top: i * 9, width: 98, height: 64,
            background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)", padding: 11, opacity: 1 - i * 0.14,
          }}
        >
          {i === 0 && (
            <>
              <div style={{ height: 5, width: "72%", background: C.bgSoft, borderRadius: 3, marginBottom: 7 }} />
              <div style={{ height: 5, width: "52%", background: C.bgSoft, borderRadius: 3, marginBottom: 7 }} />
              <div style={{ height: 5, width: "64%", background: C.bgSoft, borderRadius: 3 }} />
            </>
          )}
        </div>
      ))}
      <div style={{ position: "absolute", right: 0, bottom: 0, width: 34, height: 34, borderRadius: "50%", background: C.accent, color: "#fff", display: "grid", placeItems: "center", fontSize: 18, boxShadow: "0 6px 16px rgba(35,131,226,0.32)" }}>↻</div>
    </div>
  );
}

// 3 — Any subject: colorful chips spanning disciplines.
function SubjectsVisual() {
  const chips = [
    { g: "∑", c: "#2383E2" },
    { g: "Aa", c: "#D9730D" },
    { g: "H₂O", c: "#0F7B6C" },
    { g: "♪", c: "#6940A5" },
    { g: "1492", c: "#D34185" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 220, margin: "0 auto" }}>
      {chips.map((chip) => (
        <span
          key={chip.g}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 40, height: 40, padding: "0 13px", borderRadius: 11,
            background: chip.c + "14", border: `1.5px solid ${chip.c}`, color: chip.c,
            fontSize: 15, fontWeight: 700, fontFamily: "'Outfit',sans-serif",
          }}
        >{chip.g}</span>
      ))}
    </div>
  );
}

export default function WhyDaily({ t }) {
  const [headRef, headVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();

  const whys = [
    { title: t.why1Title, body: t.why1Body, visual: <SpacedVisual /> },
    { title: t.why2Title, body: t.why2Body, visual: <ReuseVisual /> },
    { title: t.why3Title, body: t.why3Body, visual: <SubjectsVisual /> },
  ];

  return (
    <section id="why" className="ph-section ph-anchor ph-seam-top" style={{ padding: "120px 32px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", textAlign: "center" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`}>
          <SectionHeader eyebrow={t.eyebrowWhy} title={t.whyTitle} sub={t.whySub} subGap={70} />
        </div>
        <div ref={gridRef} className={`ph-why-grid ph-stagger ${gridVisible ? "is-visible" : ""}`} style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28, textAlign: "left",
        }}>
          {whys.map((w) => (
            <div key={w.title} style={{
              padding: "28px 26px", background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 16,
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}>
              <div style={{ height: 108, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
                {w.visual}
              </div>
              <h3 className="ph-why-title" style={{
                fontSize: 24, fontWeight: 600, color: C.text,
                margin: "0 0 12px",
              }}>{w.title}</h3>
              <p className="ph-why-body" style={{
                fontSize: 17, color: C.textSecondary,
                lineHeight: 1.55, margin: 0,
              }}>{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
