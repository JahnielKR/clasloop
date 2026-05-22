import { C, MONO } from "../../../components/tokens";
import { CIcon } from "../../../components/Icons";
import { useReveal } from "../useReveal";
// Real retention thresholds (green ≥70, orange ≥40, else red) so the bars are
// colored exactly like the in-app class views.
import { retentionTier } from "../../../lib/scoring-thresholds";

// ─── InsightsDemo ──────────────────────────────────────────────────────────
// The teacher payoff — the "after" of the loop (replaces the old redundant
// "Three steps" how-it-works). Mirrors the real SessionInsightBar (orange
// left-border weak-points card) + a per-student retention read using the
// app's actual retentionTier() colors. Sample data only; no live calls.

const TIER_COLOR = { green: C.green, orange: C.orange, red: C.red };
const txt = (v, lang) => (typeof v === "string" ? v : v[lang] || v.en);

const TOPIC = { en: "Mitosis: the 4 phases", es: "Mitosis: las 4 fases", ko: "유사분열: 4단계" };
const FAIL_PCT = 62;
const STUDENTS = [
  { name: "Maya R.", pct: 92 },
  { name: "Liam K.", pct: 78 },
  { name: "Sofía D.", pct: 54 },
  { name: "Noah T.", pct: 38 },
];

const CIRC = 2 * Math.PI * 15; // circumference for the r=15 fail-% ring

function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function InsightsDemo({ t, lang }) {
  const [headRef, headVisible] = useReveal();
  const [bodyRef, bodyVisible] = useReveal({ threshold: 0.2 });

  return (
    <section id="insights" className="ph-section ph-anchor" style={{ padding: "110px 32px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div ref={headRef} className={`ph-reveal ${headVisible ? "is-visible" : ""}`} style={{ textAlign: "center" }}>
          <h2 className="ph-section-h2" style={{ fontSize: 52, fontWeight: 700, color: C.text, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            {t.insTitle}
          </h2>
          <p className="ph-section-sub" style={{ fontSize: 21, color: C.textSecondary, margin: "0 auto 56px", maxWidth: 740, lineHeight: 1.5 }}>
            {t.insSub}
          </p>
        </div>

        <div
          ref={bodyRef}
          className={`ph-ins-grid ph-reveal ${bodyVisible ? "is-visible" : ""}`}
          style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 22, alignItems: "start", textAlign: "left" }}
        >
          {/* Weak-point insight bar — mirrors SessionInsightBar */}
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.orange}`,
            borderRadius: 12, padding: "20px 22px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.orangeSoft, color: C.orange, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 9v4" /><path d="M12 17h.01" /><circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.orange, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                  {t.insMostMissed}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.35 }}>{txt(TOPIC, lang)}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ position: "relative", width: 36, height: 36 }}>
                      <svg width="36" height="36" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke={C.border} strokeWidth="4" />
                        <circle
                          cx="18" cy="18" r="15" fill="none" stroke={C.orange} strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={`${(FAIL_PCT / 100) * CIRC} ${CIRC}`} transform="rotate(-90 18 18)"
                        />
                      </svg>
                      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color: C.text, fontFamily: MONO }}>
                        {FAIL_PCT}%
                      </span>
                    </span>
                    <span style={{ fontSize: 12.5, color: C.textSecondary, fontWeight: 500 }}>{t.insFailed}</span>
                  </span>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.accentSoft, color: C.accent, borderRadius: 100, padding: "6px 13px", fontSize: 12.5, fontWeight: 600 }}>
                  <CIcon name="spaced" inline size={14} /> {t.insResurface}
                </span>
              </div>
            </div>
          </div>

          {/* Per-student retention — real tier colors */}
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
              {t.insRetention}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {STUDENTS.map((s, i) => {
                const col = TIER_COLOR[retentionTier(s.pct)];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: C.accentSoft, color: C.accent, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {initials(s.name)}
                    </span>
                    <span style={{ width: 60, fontSize: 13, color: C.text, fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.name}
                    </span>
                    <span style={{ flex: 1, height: 8, borderRadius: 4, background: C.bgSoft, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${s.pct}%`, background: col, borderRadius: 4 }} />
                    </span>
                    <span style={{ width: 38, textAlign: "right", fontSize: 12.5, fontWeight: 700, color: col, fontFamily: MONO, flexShrink: 0 }}>
                      {s.pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
