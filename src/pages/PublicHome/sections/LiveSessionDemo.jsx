import { useEffect, useRef, useState } from "react";
import { C, MONO } from "../../../components/tokens";
import { getTheme } from "../../../lib/themes";
import { getSectionLabel } from "../../../lib/section-theme";
import { useReveal } from "../useReveal";

// ─── LiveSessionDemo ───────────────────────────────────────────────────────
// The shared wow: a real session as it's projected — a landscape "tablet"
// running the live question screen, cycling through the actual lobby themes
// (calm / ocean / pop / mono) so visitors see they can set the room's vibe.
// Colors come straight from lib/themes (the in-app source of truth).

const txt = (v, lang) => (typeof v === "string" ? v : v[lang] || v.en);

const QUESTION = { en: "Which organelle powers the cell?", es: "¿Qué orgánulo da energía a la célula?", ko: "세포에 에너지를 공급하는 소기관은?" };
const OPTIONS = [
  { en: "Mitochondria", es: "Mitocondria", ko: "미토콘드리아" },
  { en: "Nucleus", es: "Núcleo", ko: "핵" },
  { en: "Ribosome", es: "Ribosoma", ko: "리보솜" },
  { en: "Golgi body", es: "Aparato de Golgi", ko: "골지체" },
];
const LETTERS = ["A", "B", "C", "D"];
const THEME_ORDER = ["calm", "ocean", "pop", "mono"];

// The session screen is laid out at a fixed design size and then scaled to fit
// the device width (like a real screenshot), so it never overflows on mobile.
const BASE_W = 600;
const BASE_H = 375; // 16:10

// Mirror of LobbyThemeSelector's swatch backgrounds for the picker chips.
const SWATCH = {
  calm: "#FAFAF8",
  ocean: "linear-gradient(160deg, #1A3D6B 0%, #0A1F3F 55%, #050E20 100%)",
  pop: "linear-gradient(165deg, #FFD93D 0%, #FF6B9D 60%, #C147FF 100%)",
  mono: "#000000",
};

// ─── The projected session screen, themed via getTheme(id) ──────────────────
function SessionScreen({ themeId, lang }) {
  const th = getTheme(themeId);
  const tileBorderW = th.surfaceBorderWidth || "1px";
  const tileRadius = th.surfaceRadius || "12px";

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: th.background,
      color: th.text,
      fontFamily: th.fonts.body,
      padding: "20px 24px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: th.fonts.display, fontWeight: 700, fontSize: 15, color: th.text }}>Clasloop</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
            padding: "3px 9px", borderRadius: 999,
            background: th.accentTint, color: th.accent,
          }}>
            <span aria-hidden="true">☀</span> {getSectionLabel("warmup", lang)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: th.textSoft, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5A5A", boxShadow: "0 0 0 3px rgba(255,90,90,0.2)" }} className="ph-pulse-dot" />
          <span style={{ fontWeight: 700, color: th.text }}>LIVE</span>
          <span>· 28</span>
        </div>
      </div>

      {/* Question counter + progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: th.fonts.mono, fontSize: 11, color: th.textSoft }}>
          <strong style={{ color: th.text }}>4</strong> / 8
        </span>
        <span style={{ flex: 1, height: 4, borderRadius: 3, background: th.accentTint, overflow: "hidden" }}>
          <span style={{ display: "block", width: "50%", height: "100%", background: th.accent, borderRadius: 3 }} />
        </span>
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
        <div style={{ fontFamily: th.fonts.display, fontWeight: 700, fontSize: 22, lineHeight: 1.25, color: th.text }}>
          {txt(QUESTION, lang)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
          {OPTIONS.map((o, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px",
              background: th.surface,
              border: `${tileBorderW} ${th.chipBorderStyle || "solid"} ${th.surfaceBorder}`,
              borderRadius: tileRadius,
              boxShadow: th.surfaceShadow || "none",
              backdropFilter: th.chipBlur ? "blur(6px)" : undefined,
              color: th.text,
            }}>
              <span style={{
                width: 24, height: 24, flexShrink: 0,
                borderRadius: th.surfaceRadius === "0px" ? 0 : 6,
                background: th.accentTint, color: th.accent,
                display: "grid", placeItems: "center",
                fontFamily: th.fonts.mono, fontSize: 12, fontWeight: 700,
              }}>{LETTERS[i]}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{txt(o, lang)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer rail: timer + score */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{
            width: 30, height: 30, borderRadius: "50%",
            border: `3px solid ${th.accent}`, color: th.text,
            display: "grid", placeItems: "center",
            fontFamily: th.fonts.mono, fontSize: 12, fontWeight: 700,
          }}>12</span>
          <span style={{ fontSize: 12, color: th.textSoft }}>{getSectionLabel("warmup", lang)} · Spanish 9th</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: th.textMuted }}>Score</div>
          <div style={{ fontFamily: th.fonts.mono, fontSize: 16, fontWeight: 700, color: th.text }}>2,710</div>
        </div>
      </div>
    </div>
  );
}

export default function LiveSessionDemo({ t, lang }) {
  const [headRef, headVisible] = useReveal();
  const [bodyRef, bodyVisible] = useReveal({ threshold: 0.2 });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Scale the fixed-size session screen to the device width.
  const screenRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const node = screenRef.current;
    if (!node) return undefined;
    const update = () => setScale(node.clientWidth / BASE_W);
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Auto-cycle the theme (paused on hover, off under reduced-motion).
  useEffect(() => {
    if (paused) return undefined;
    const reduce = typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % THEME_ORDER.length), 3200);
    return () => clearInterval(id);
  }, [paused]);

  const activeId = THEME_ORDER[active];

  return (
    <section id="live" className="ph-section ph-anchor" style={{ padding: "110px 32px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`}>
          <h2 className="ph-section-h2" style={{ fontSize: 52, fontWeight: 700, color: C.text, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            {t.liveTitle}
          </h2>
          <p className="ph-section-sub" style={{ fontSize: 21, color: C.textSecondary, margin: "0 auto 48px", maxWidth: 720, lineHeight: 1.5 }}>
            {t.liveSub}
          </p>
        </div>

        <div ref={bodyRef} className={`ph-reveal ${bodyVisible ? "is-visible" : ""}`}>
          {/* Landscape tablet */}
          <div style={{
            maxWidth: 680, margin: "0 auto",
            background: "#1B1E26", borderRadius: 26, padding: 12,
            boxShadow: "0 26px 60px rgba(0,0,0,0.26)",
          }}>
            <div ref={screenRef} style={{ position: "relative", borderRadius: 14, overflow: "hidden", width: "100%", aspectRatio: `${BASE_W} / ${BASE_H}`, background: "#000" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <SessionScreen themeId={activeId} lang={lang} />
              </div>
            </div>
          </div>

          {/* Theme picker */}
          <div
            style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}
            onMouseLeave={() => setPaused(false)}
          >
            {THEME_ORDER.map((id, i) => {
              const on = i === active;
              const th = getTheme(id);
              return (
                <button
                  key={id}
                  onMouseEnter={() => { setActive(i); setPaused(true); }}
                  onFocus={() => { setActive(i); setPaused(true); }}
                  onClick={() => { setActive(i); setPaused(true); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 14px 8px 8px", borderRadius: 100, cursor: "pointer",
                    border: `1.5px solid ${on ? C.accent : C.border}`,
                    background: on ? C.accentSoft : C.bg,
                    color: on ? C.accent : C.textSecondary,
                    fontSize: 14, fontWeight: on ? 700 : 500, fontFamily: "'Outfit',sans-serif",
                    transition: "border-color .15s, background .15s, color .15s",
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: SWATCH[id],
                    border: id === "calm" ? `1px solid ${C.border}` : "none",
                    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.6)",
                  }} />
                  {th.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
