import { C, MONO } from "../../../components/tokens";
import { Avatar } from "../../../components/Avatars";
import { getSectionTheme, getSectionLabel } from "../../../lib/section-theme";
import { useReveal } from "../useReveal";

// ─── LiveSessionDemo ───────────────────────────────────────────────────────
// The shared wow (loved by students, run by teachers): project the leaderboard,
// students answer on their phones. A composed scene — a "projector" screen with
// a live leaderboard (real Clasloop <Avatar>s, seeded) + a phone showing the
// student answering a warmup question (themed with the real warmup section
// theme). Reveals on scroll; the LIVE dot pulses and the "+100" pops in.

const txt = (v, lang) => (typeof v === "string" ? v : v[lang] || v.en);

const QUESTION = { en: "Which organelle powers the cell?", es: "¿Qué orgánulo da energía a la célula?", ko: "세포에 에너지를 공급하는 소기관은?" };
const OPTIONS = [
  { label: { en: "Mitochondria", es: "Mitocondria", ko: "미토콘드리아" }, correct: true },
  { label: { en: "Nucleus", es: "Núcleo", ko: "핵" } },
  { label: { en: "Ribosome", es: "Ribosoma", ko: "리보솜" } },
  { label: { en: "Golgi body", es: "Aparato de Golgi", ko: "골지체" } },
];
const OPT_LETTERS = ["A", "B", "C", "D"];

const LEADERS = [
  { name: "Maya R.", score: 2840 },
  { name: "Liam K.", score: 2610 },
  { name: "Sofía D.", score: 2390 },
  { name: "Noah T.", score: 2120 },
];
const MAX_SCORE = LEADERS[0].score;

export default function LiveSessionDemo({ t, lang }) {
  const [headRef, headVisible] = useReveal();
  const [bodyRef, bodyVisible] = useReveal({ threshold: 0.2 });
  const wt = getSectionTheme("warmup", false); // warmup theme (light)

  return (
    <section id="live" className="ph-section ph-anchor" style={{ padding: "110px 32px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`} style={{ textAlign: "center" }}>
          <h2 className="ph-section-h2" style={{ fontSize: 52, fontWeight: 700, color: C.text, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            {t.liveTitle}
          </h2>
          <p className="ph-section-sub" style={{ fontSize: 21, color: C.textSecondary, margin: "0 auto 56px", maxWidth: 740, lineHeight: 1.5 }}>
            {t.liveSub}
          </p>
        </div>

        <div
          ref={bodyRef}
          className={`ph-live-grid ph-reveal ${bodyVisible ? "is-visible" : ""}`}
          style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr", gap: 32, alignItems: "center" }}
        >
          {/* Projector screen — live leaderboard */}
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: "20px 22px", boxShadow: "0 14px 40px rgba(0,0,0,0.10)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <span className="ph-pulse-dot" style={{ width: 9, height: 9, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.red, letterSpacing: "0.08em" }}>LIVE</span>
              <span style={{ fontSize: 12.5, color: C.textMuted }}>· 12 {t.livePlaying}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textMuted }}>
                {t.liveLeaderboard}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {LEADERS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 16, textAlign: "center", fontSize: 13, fontWeight: 700, color: i === 0 ? C.yellow : C.textMuted, fontFamily: MONO, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <Avatar seed={s.name} size={30} />
                  <span style={{ width: 64, fontSize: 13.5, fontWeight: 500, color: C.text, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </span>
                  <span style={{ flex: 1, height: 9, borderRadius: 5, background: C.bgSoft, overflow: "hidden" }}>
                    <span style={{
                      display: "block", height: "100%", borderRadius: 5,
                      width: `${Math.round((s.score / MAX_SCORE) * 100)}%`,
                      background: i === 0 ? `linear-gradient(90deg, ${C.accent}, ${C.purple})` : C.accent,
                      opacity: i === 0 ? 1 : 0.55 + (LEADERS.length - i) * 0.05,
                    }} />
                  </span>
                  <span style={{ width: 46, textAlign: "right", fontSize: 13, fontWeight: 700, color: C.text, fontFamily: MONO, flexShrink: 0 }}>
                    {s.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone — student answering (warmup themed) */}
          <div style={{ justifySelf: "center", width: "100%", maxWidth: 232 }}>
            <div style={{
              background: wt.bg, borderRadius: 30, border: "8px solid #20242B",
              boxShadow: "0 18px 44px rgba(0,0,0,0.22)", padding: "16px 14px 18px",
              position: "relative", overflow: "hidden",
            }}>
              {/* notch */}
              <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 54, height: 5, borderRadius: 3, background: "#20242B" }} />

              {/* section badge */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 8, marginBottom: 12 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: wt.iconBg, color: wt.iconFg, borderRadius: 5, padding: "3px 9px",
                  fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                }}>
                  <span aria-hidden="true" style={{ fontSize: 11, lineHeight: 1 }}>☀</span>
                  {getSectionLabel("warmup", lang)}
                </span>
              </div>

              <div style={{ fontSize: 14.5, fontWeight: 600, color: wt.onTint, lineHeight: 1.35, textAlign: "center", marginBottom: 14, minHeight: 40 }}>
                {txt(QUESTION, lang)}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {OPTIONS.map((o, i) => {
                  const sel = o.correct;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "9px 11px", borderRadius: 10,
                      background: sel ? wt.accent : C.bg,
                      border: `1.5px solid ${sel ? wt.accent : C.border}`,
                      color: sel ? wt.onAccent : wt.onTint,
                      fontWeight: sel ? 700 : 500, fontSize: 13,
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, fontFamily: MONO,
                        background: sel ? "rgba(255,255,255,0.25)" : wt.iconBg,
                        color: sel ? wt.onAccent : wt.iconFg,
                      }}>{OPT_LETTERS[i]}</span>
                      <span style={{ flex: 1 }}>{txt(o.label, lang)}</span>
                      {sel && <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 800 }}>✓</span>}
                    </div>
                  );
                })}
              </div>

              {/* +100 / correct pop */}
              <div className="ph-pop-in" style={{
                animationDelay: "0.4s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                marginTop: 14, padding: "8px", borderRadius: 10,
                background: wt.accentSoft, color: wt.iconFg, fontWeight: 700, fontSize: 13.5,
              }}>
                <span>{t.liveCorrect}</span>
                <span style={{ fontFamily: MONO, color: wt.accent }}>+100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
