import { useEffect, useState } from "react";
import { C, MONO } from "../../../components/tokens";
import { useReveal } from "../useReveal";

// ─── QuestionTypes ─────────────────────────────────────────────────────────
// Interactive showcase of the 9 question types. Clicking/hovering a pill (or
// the gentle auto-cycle) swaps a small, language-neutral mini-preview of how
// that type looks. Auto-cycle pauses on hover and is disabled under
// prefers-reduced-motion.

const Bar = ({ w = "100%", h = 8, c = C.textMuted, o = 0.45, r = 4 }) => (
  <span style={{ display: "block", width: typeof w === "number" ? `${w}px` : w, height: h, borderRadius: r, background: c, opacity: o }} />
);

// Each preview is keyed by the type's accent color `c`.
const PREVIEWS = {
  mcq: (c) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, width: 240 }}>
      {[0, 1, 2].map((i) => {
        const ok = i === 1;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 9, border: `1.5px solid ${ok ? c : C.border}`, background: ok ? c + "12" : C.bg }}>
            <span style={{ width: 15, height: 15, borderRadius: "50%", border: `2px solid ${ok ? c : C.textMuted}`, background: ok ? c : "transparent", flexShrink: 0 }} />
            <Bar w={["68%", "54%", "60%"][i]} />
            {ok && <span style={{ marginLeft: "auto", color: c, fontWeight: 800, fontSize: 13 }}>✓</span>}
          </div>
        );
      })}
    </div>
  ),
  tf: (c) => (
    <div style={{ display: "flex", gap: 14, width: 250 }}>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "20px 0", borderRadius: 12, border: `1.5px solid ${C.green}`, background: C.green + "12", color: C.green, fontSize: 26, fontWeight: 800 }}>✓</div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "20px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bg, color: C.textMuted, fontSize: 26, fontWeight: 800 }}>✕</div>
    </div>
  ),
  fill: (c) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 250, alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
        <Bar w={36} /><Bar w={24} />
        <span style={{ width: 58, height: 16, borderBottom: `2px dashed ${c}` }} />
        <Bar w={20} /><Bar w={30} />
      </div>
      <span style={{ display: "inline-flex", padding: "8px 16px", borderRadius: 8, background: c + "16", border: `1.5px solid ${c}` }}><Bar w={44} c={c} o={0.9} /></span>
    </div>
  ),
  order: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, width: 240 }}>
      {[1, 2, 3].map((n, i) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, marginLeft: i === 1 ? 16 : 0, boxShadow: i === 1 ? "0 3px 10px rgba(0,0,0,0.08)" : "none" }}>
          <span style={{ color: C.textMuted, letterSpacing: "-3px", fontSize: 15 }}>⋮⋮</span>
          <span style={{ width: 19, height: 19, borderRadius: 5, background: C.bgSoft, color: C.textSecondary, display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700, fontFamily: MONO, flexShrink: 0 }}>{n}</span>
          <Bar w={["58%", "66%", "50%"][i]} />
        </div>
      ))}
    </div>
  ),
  match: () => {
    const L = [C.accent, C.purple], R = [C.green, C.orange];
    return (
      <svg width="250" height="118" viewBox="0 0 250 118" aria-hidden="true">
        {[28, 90].map((y, i) => (<g key={`l${i}`}><circle cx="34" cy={y} r="9" fill={L[i] + "22"} stroke={L[i]} strokeWidth="2" /><rect x="50" y={y - 4} width="48" height="8" rx="4" fill={C.textMuted} opacity="0.4" /></g>))}
        {[28, 90].map((y, i) => (<g key={`r${i}`}><circle cx="216" cy={y} r="9" fill={R[i] + "22"} stroke={R[i]} strokeWidth="2" /><rect x="152" y={y - 4} width="48" height="8" rx="4" fill={C.textMuted} opacity="0.4" /></g>))}
        <path d="M43,28 C110,28 140,90 207,90" fill="none" stroke={L[0]} strokeWidth="2.2" />
        <path d="M43,90 C110,90 140,28 207,28" fill="none" stroke={L[1]} strokeWidth="2.2" />
      </svg>
    );
  },
  open: (c) => (
    <div style={{ width: 250, border: `1.5px solid ${C.border}`, borderRadius: 11, padding: 16, background: C.bg }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Bar w="92%" /><Bar w="78%" />
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}><Bar w="42%" /><span style={{ width: 2, height: 14, background: c, borderRadius: 1, marginLeft: 3 }} /></div>
      </div>
    </div>
  ),
  sentence: (c) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: 250, justifyContent: "center" }}>
      {[42, 30, 54, 36].map((w, i) => (
        <span key={i} style={{ display: "inline-flex", padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg }}><Bar w={w} /></span>
      ))}
      <span style={{ display: "inline-flex", padding: "7px 12px", borderRadius: 8, border: `1.5px dashed ${c}`, background: c + "0D", minWidth: 46 }} />
    </div>
  ),
  slider: (c) => (
    <div style={{ width: 250, paddingTop: 26 }}>
      <div style={{ position: "relative", height: 8, borderRadius: 5, background: C.bgSoft }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "62%", borderRadius: 5, background: c }} />
        <div style={{ position: "absolute", left: "62%", top: "50%", transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%", background: "#fff", border: `3px solid ${c}`, boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }} />
        <div style={{ position: "absolute", left: "62%", top: -28, transform: "translateX(-50%)", padding: "2px 8px", borderRadius: 6, background: c, color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: MONO }}>62</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.textMuted, fontFamily: MONO }}><span>0</span><span>100</span></div>
    </div>
  ),
  poll: (c) => {
    const bars = [{ h: 64, col: C.accent }, { h: 100, col: c }, { h: 42, col: C.green }];
    return (
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 18, height: 120 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: b.col, fontFamily: MONO }}>{[34, 52, 14][i]}%</span>
            <span style={{ width: 30, height: b.h, borderRadius: 6, background: b.col, opacity: i === 1 ? 1 : 0.55 }} />
          </div>
        ))}
      </div>
    );
  },
};

const TYPES = [
  { key: "mcq", color: "#2383E2", labelKey: "typeMcq" },
  { key: "tf", color: "#1D9E75", labelKey: "typeTf" },
  { key: "fill", color: "#D85A30", labelKey: "typeFill" },
  { key: "order", color: "#BA7517", labelKey: "typeOrder" },
  { key: "match", color: "#534AB7", labelKey: "typeMatch" },
  { key: "open", color: "#D4537E", labelKey: "typeOpen" },
  { key: "sentence", color: "#0F7B6C", labelKey: "typeSentence" },
  { key: "slider", color: "#993C1D", labelKey: "typeSlider" },
  { key: "poll", color: "#7F77DD", labelKey: "typePoll" },
];

export default function QuestionTypes({ t }) {
  const [headRef, headVisible] = useReveal();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Gentle auto-cycle (paused on hover, off under reduced-motion).
  useEffect(() => {
    if (paused) return undefined;
    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % TYPES.length), 2600);
    return () => clearInterval(id);
  }, [paused]);

  const activeType = TYPES[active];

  return (
    <section id="types" className="ph-section ph-anchor" style={{
      padding: "110px 32px", background: C.bgSoft,
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`}>
          <h2 className="ph-section-h2" style={{ fontSize: 52, fontWeight: 700, color: C.text, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            {t.typesTitle}
          </h2>
          <p className="ph-section-sub" style={{ fontSize: 21, color: C.textSecondary, margin: "0 auto 44px", maxWidth: 700, lineHeight: 1.5 }}>
            {t.typesSub}
          </p>
        </div>

        {/* Preview stage */}
        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18,
          padding: 28, minHeight: 232, marginBottom: 26,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22,
          boxShadow: "0 6px 24px rgba(0,0,0,0.05)",
        }}>
          <div style={{ minHeight: 124, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {PREVIEWS[activeType.key](activeType.color)}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 600, color: C.text }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: activeType.color }} />
            {t[activeType.labelKey]}
          </div>
        </div>

        {/* Pills — click/hover to preview */}
        <div
          style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}
          onMouseLeave={() => setPaused(false)}
        >
          {TYPES.map((p, i) => {
            const on = i === active;
            return (
              <button
                key={p.key}
                onMouseEnter={() => { setActive(i); setPaused(true); }}
                onFocus={() => { setActive(i); setPaused(true); }}
                onClick={() => { setActive(i); setPaused(true); }}
                style={{
                  padding: "10px 18px", borderRadius: 100, cursor: "pointer",
                  border: `1.5px solid ${on ? p.color : C.border}`,
                  background: on ? p.color + "12" : C.bg,
                  color: on ? p.color : C.textSecondary,
                  fontSize: 15, fontWeight: on ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  display: "flex", alignItems: "center", gap: 9,
                  transition: "border-color .15s, background .15s, color .15s",
                }}
              >
                <span style={{ color: p.color, fontSize: 13 }}>●</span>
                {t[p.labelKey]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
