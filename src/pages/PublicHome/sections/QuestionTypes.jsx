import { useEffect, useState } from "react";
import { C, MONO } from "../../../components/tokens";
import { useReveal } from "../useReveal";
import SectionHeader from "./SectionHeader";

// ─── QuestionTypes ─────────────────────────────────────────────────────────
// Interactive showcase of the 9 question types. Clicking/hovering a pill (or
// the gentle auto-cycle) swaps a REAL, themed mini-question for that type — not
// abstract grey bars — so visitors see exactly what each type looks like. Each
// preview is bilingual (en/es/ko, the in-app pattern) and tinted with the
// type's accent. Auto-cycle pauses on hover, off under prefers-reduced-motion.

const txt = (v, lang) => (typeof v === "string" ? v : v[lang] || v.en);

// Real question content per type (kept inline + language-aware, matching the
// pattern in GenerationDemo / LiveSessionDemo).
const Q = {
  mcq: {
    q: { en: "Which organelle powers the cell?", es: "¿Qué orgánulo da energía a la célula?", ko: "세포에 에너지를 공급하는 소기관은?" },
    opts: [
      { t: { en: "Mitochondria", es: "Mitocondria", ko: "미토콘드리아" }, ok: true },
      { t: { en: "Nucleus", es: "Núcleo", ko: "핵" } },
      { t: { en: "Ribosome", es: "Ribosoma", ko: "리보솜" } },
    ],
  },
  tf: { q: { en: "Photosynthesis happens in the mitochondria.", es: "La fotosíntesis ocurre en la mitocondria.", ko: "광합성은 미토콘드리아에서 일어난다." } },
  fill: {
    pre: { en: "The powerhouse of the cell is the", es: "La central energética de la célula es la", ko: "세포의 발전소는" },
    post: { en: "", es: "", ko: "입니다" },
    ans: { en: "mitochondria", es: "mitocondria", ko: "미토콘드리아" },
  },
  order: {
    q: { en: "Order the phases of mitosis", es: "Ordena las fases de la mitosis", ko: "유사분열 단계를 순서대로 놓으세요" },
    steps: [
      { en: "Prophase", es: "Profase", ko: "전기" },
      { en: "Metaphase", es: "Metafase", ko: "중기" },
      { en: "Anaphase", es: "Anafase", ko: "후기" },
    ],
  },
  match: {
    q: { en: "Match each part to its job", es: "Empareja cada parte con su función", ko: "각 부분을 기능과 짝지으세요" },
    left: [{ en: "Mitochondria", es: "Mitocondria", ko: "미토콘드리아" }, { en: "Nucleus", es: "Núcleo", ko: "핵" }],
    right: [{ en: "Energy", es: "Energía", ko: "에너지" }, { en: "DNA", es: "ADN", ko: "DNA" }],
  },
  open: { q: { en: "Explain why cells divide.", es: "Explica por qué las células se dividen.", ko: "세포가 분열하는 이유를 설명하세요." } },
  sentence: {
    q: { en: "Build the sentence", es: "Construye la oración", ko: "문장을 완성하세요" },
    words: [{ en: "Cells", es: "Las células", ko: "세포는" }, { en: "divide", es: "se dividen", ko: "분열하여" }, { en: "to grow", es: "para crecer", ko: "성장합니다" }],
  },
  slider: { q: { en: "How confident are you?", es: "¿Qué tan seguro estás?", ko: "얼마나 확신하나요?" } },
  poll: {
    q: { en: "Which topic was hardest?", es: "¿Qué tema fue el más difícil?", ko: "어떤 주제가 가장 어려웠나요?" },
    bars: [
      { label: { en: "Mitosis", es: "Mitosis", ko: "유사분열" }, pct: 52 },
      { label: { en: "Osmosis", es: "Ósmosis", ko: "삼투" }, pct: 34 },
      { label: { en: "DNA", es: "ADN", ko: "DNA" }, pct: 14 },
    ],
  },
};

// Shared question-stem line above each answer UI.
const Stem = ({ children }) => (
  <div style={{ fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 18, textAlign: "center", maxWidth: 420 }}>
    {children}
  </div>
);

const PREVIEWS = {
  mcq: (c, lang) => (
    <div style={{ width: 360, maxWidth: "100%" }}>
      <Stem>{txt(Q.mcq.q, lang)}</Stem>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {Q.mcq.opts.map((o, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${o.ok ? c : C.border}`, background: o.ok ? c + "12" : C.bg }}>
            <span style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${o.ok ? c : C.textMuted}`, background: o.ok ? c : "transparent", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{txt(o.t, lang)}</span>
            {o.ok && <span style={{ marginLeft: "auto", color: c, fontWeight: 800, fontSize: 14 }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  ),
  tf: (c, lang) => (
    <div style={{ width: 360, maxWidth: "100%" }}>
      <Stem>{txt(Q.tf.q, lang)}</Stem>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bg, color: C.textMuted }}>
          <span style={{ fontSize: 24, fontWeight: 800 }}>✓</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{txt({ en: "True", es: "Verdadero", ko: "참" }, lang)}</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 0", borderRadius: 12, border: `1.5px solid ${C.green}`, background: "#E1F5EE", color: C.green }}>
          <span style={{ fontSize: 24, fontWeight: 800 }}>✕</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{txt({ en: "False", es: "Falso", ko: "거짓" }, lang)}</span>
        </div>
      </div>
    </div>
  ),
  fill: (c, lang) => (
    <div style={{ width: 380, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: C.text, lineHeight: 1.6, textAlign: "center" }}>
        {txt(Q.fill.pre, lang)}{" "}
        <span style={{ display: "inline-block", minWidth: 96, borderBottom: `2px dashed ${c}`, color: c, fontWeight: 700 }}>&nbsp;</span>
        {txt(Q.fill.post, lang) ? " " + txt(Q.fill.post, lang) : ""}
      </div>
      <span style={{ display: "inline-flex", padding: "9px 18px", borderRadius: 9, background: c + "16", border: `1.5px solid ${c}`, color: c, fontSize: 14, fontWeight: 700 }}>
        {txt(Q.fill.ans, lang)}
      </span>
    </div>
  ),
  order: (c, lang) => (
    <div style={{ width: 340, maxWidth: "100%" }}>
      <Stem>{txt(Q.order.q, lang)}</Stem>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {Q.order.steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, marginLeft: i === 1 ? 18 : 0, boxShadow: i === 1 ? "0 4px 12px rgba(0,0,0,0.08)" : "none" }}>
            <span style={{ color: C.textMuted, letterSpacing: "-3px", fontSize: 16 }}>⋮⋮</span>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: c + "16", color: c, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: MONO, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{txt(s, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  match: (c, lang) => {
    // Hex literals (not C.* vars) — var() doesn't resolve in SVG presentation
    // attributes, and you can't concat an alpha suffix onto a var() string.
    const cols = ["#2383E2", "#6940A5"];
    return (
      <div style={{ width: 360, maxWidth: "100%" }}>
        <Stem>{txt(Q.match.q, lang)}</Stem>
        <svg width="100%" viewBox="0 0 300 110" aria-hidden="true">
          {Q.match.left.map((l, i) => {
            const y = 26 + i * 56;
            return (
              <g key={`l${i}`}>
                <rect x="6" y={y - 15} width="118" height="30" rx="8" fill={cols[i] + "14"} stroke={cols[i]} strokeWidth="1.4" />
                <text x="65" y={y + 4} fill="#191919" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="'Outfit',sans-serif">{txt(l, lang)}</text>
                <circle cx="124" cy={y} r="3.5" fill={cols[i]} />
              </g>
            );
          })}
          {Q.match.right.map((r, i) => {
            const y = 26 + i * 56;
            return (
              <g key={`r${i}`}>
                <circle cx="176" cy={y} r="3.5" fill={cols[i]} />
                <rect x="176" y={y - 15} width="118" height="30" rx="8" fill={cols[i] + "14"} stroke={cols[i]} strokeWidth="1.4" />
                <text x="235" y={y + 4} fill="#191919" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="'Outfit',sans-serif">{txt(r, lang)}</text>
              </g>
            );
          })}
          <path d="M124,26 C150,26 150,82 176,82" fill="none" stroke={cols[0]} strokeWidth="2" />
          <path d="M124,82 C150,82 150,26 176,26" fill="none" stroke={cols[1]} strokeWidth="2" />
        </svg>
      </div>
    );
  },
  open: (c, lang) => (
    <div style={{ width: 380, maxWidth: "100%" }}>
      <Stem>{txt(Q.open.q, lang)}</Stem>
      <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, background: C.bg, minHeight: 92 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <span style={{ height: 7, width: "92%", borderRadius: 4, background: C.bgSoft }} />
          <span style={{ height: 7, width: "78%", borderRadius: 4, background: C.bgSoft }} />
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <span style={{ height: 7, width: "44%", borderRadius: 4, background: C.bgSoft }} />
            <span style={{ width: 2, height: 16, background: c, borderRadius: 1, marginLeft: 4 }} />
          </span>
        </div>
      </div>
    </div>
  ),
  sentence: (c, lang) => (
    <div style={{ width: 360, maxWidth: "100%" }}>
      <Stem>{txt(Q.sentence.q, lang)}</Stem>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: "center" }}>
        {Q.sentence.words.map((w, i) => (
          <span key={i} style={{ display: "inline-flex", padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, fontSize: 14, fontWeight: 600, color: C.text }}>{txt(w, lang)}</span>
        ))}
        <span style={{ display: "inline-flex", minWidth: 52, padding: "9px 14px", borderRadius: 9, border: `1.5px dashed ${c}`, background: c + "0D" }} />
      </div>
    </div>
  ),
  slider: (c, lang) => (
    <div style={{ width: 360, maxWidth: "100%" }}>
      <Stem>{txt(Q.slider.q, lang)}</Stem>
      <div style={{ paddingTop: 30 }}>
        <div style={{ position: "relative", height: 8, borderRadius: 5, background: C.bgSoft }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "62%", borderRadius: 5, background: c }} />
          <div style={{ position: "absolute", left: "62%", top: "50%", transform: "translate(-50%,-50%)", width: 24, height: 24, borderRadius: "50%", background: "#fff", border: `3px solid ${c}`, boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }} />
          <div style={{ position: "absolute", left: "62%", top: -30, transform: "translateX(-50%)", padding: "3px 9px", borderRadius: 6, background: c, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: MONO }}>62</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, fontSize: 11, color: C.textMuted, fontFamily: MONO }}><span>0</span><span>100</span></div>
      </div>
    </div>
  ),
  poll: (c, lang) => (
    <div style={{ width: 380, maxWidth: "100%" }}>
      <Stem>{txt(Q.poll.q, lang)}</Stem>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Q.poll.bars.map((b, i) => {
          const col = [C.accent, c, C.green][i];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 70, fontSize: 12.5, fontWeight: 600, color: C.text, textAlign: "right", flexShrink: 0 }}>{txt(b.label, lang)}</span>
              <span style={{ flex: 1, height: 16, borderRadius: 4, background: C.bgSoft, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${b.pct}%`, background: col, borderRadius: 4 }} />
              </span>
              <span style={{ width: 34, fontSize: 12, fontWeight: 700, color: col, fontFamily: MONO, flexShrink: 0 }}>{b.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  ),
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

export default function QuestionTypes({ t, lang }) {
  const [headRef, headVisible] = useReveal();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Gentle auto-cycle (paused on hover, off under reduced-motion).
  useEffect(() => {
    if (paused) return undefined;
    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % TYPES.length), 3000);
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
          <SectionHeader eyebrow={t.eyebrowTypes} title={t.typesTitle} sub={t.typesSub} subGap={44} />
        </div>

        {/* Preview stage — bigger, accent-topped, with a fade on each swap. */}
        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderTop: `3px solid ${activeType.color}`, borderRadius: 18,
          padding: "36px 28px", minHeight: 300, marginBottom: 26,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24,
          boxShadow: "0 8px 28px rgba(0,0,0,0.06)", transition: "border-color .3s ease",
        }}>
          <div key={activeType.key} className="ph-fade" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {PREVIEWS[activeType.key](activeType.color, lang)}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 700, color: C.text }}>
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
                className="ph-springy"
                style={{
                  padding: "10px 18px", borderRadius: 100, cursor: "pointer",
                  border: `1.5px solid ${on ? p.color : C.border}`,
                  background: on ? p.color + "12" : C.bg,
                  color: on ? p.color : C.textSecondary,
                  fontSize: 15, fontWeight: on ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  display: "flex", alignItems: "center", gap: 9,
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
