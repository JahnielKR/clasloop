// ─── SessionInsightBar ─────────────────────────────────────────────────
//
// The post-session weak-points bar that appears above the leaderboard
// on the recap screen. Polls /api/session-insight every 1.5s until
// the insight is ready (or times out at 15s).
//
// States:
//   pending  → spinner with "Analyzing session..."
//   ready    → render the bar with weak_points + dismiss + expand
//   empty    → render nothing (no weak points means the session went well)
//   failed   → render nothing (silent failure, teacher unaware)
//   dismissed → render nothing (teacher dismissed it earlier)
//
// Edge Function (background) generates this in ~3-8s. Ideally by the time
// the teacher lands on the recap page, status is already 'ready' and the
// bar appears with no spinner. Worst case, brief spinner then it lands.

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { C } from "./tokens";
import PctCircle from "./PctCircle";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15000;

const i18n = {
  en: {
    labelOne: "Weak point",
    labelTwo: "Weak points",
    failed: "failed",
    expand: "view students",
    collapse: "hide",
    dismiss: "hide",
    analyzing: "Analyzing session…",
    repeatedNote: (name) => `**${name}** appears in both points. They're struggling beyond a single topic.`,
    failerSummary: (wrong, total) => `failed ${wrong}/${total}`,
  },
  es: {
    labelOne: "Punto débil",
    labelTwo: "Puntos débiles",
    failed: "fallaron",
    expand: "ver estudiantes",
    collapse: "ocultar",
    dismiss: "ocultar",
    analyzing: "Analizando la sesión…",
    repeatedNote: (name) => `**${name}** aparece en ambos puntos. Está en problemas más allá de un solo tema.`,
    failerSummary: (wrong, total) => `falló ${wrong}/${total}`,
  },
  ko: {
    labelOne: "약점",
    labelTwo: "약점",
    failed: "틀렸어요",
    expand: "학생 보기",
    collapse: "숨기기",
    dismiss: "숨기기",
    analyzing: "세션 분석 중…",
    repeatedNote: (name) => `**${name}**님이 두 항목 모두에 나타납니다. 한 주제 이상에서 어려움을 겪고 있습니다.`,
    failerSummary: (wrong, total) => `${wrong}/${total} 틀림`,
  },
};

export default function SessionInsightBar({ sessionId, lang = "en" }) {
  const t = i18n[lang] || i18n.en;
  const [insight, setInsight] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // tracks elapsed time for the timeout — useRef so it survives re-renders
  // without restarting the timer.
  const startedAt = useRef(Date.now());

  // ── Polling ───────────────────────────────────────────────────────────
  // Poll every 1.5s until status !== 'pending' or until 15s timeout.
  // Cleanup on unmount. The Edge Function should typically finish in
  // 3-8s, so in the best case the FIRST poll already finds 'ready'.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) return;

        const resp = await fetch(`/api/session-insight?sessionId=${encodeURIComponent(sessionId)}`, {
          headers: { authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled) return;
        setInsight(data);
        if (data.dismissed_at) setDismissed(true);
      } catch {
        /* silent — keep polling */
      }
    };

    // Fire once immediately so the user doesn't wait 1.5s for the first check
    fetchOnce();

    const id = setInterval(() => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt.current;
      // Stop if we got a definitive status or timed out
      if (
        (insight && insight.status && insight.status !== "pending") ||
        elapsed > POLL_TIMEOUT_MS
      ) {
        clearInterval(id);
        return;
      }
      fetchOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, insight?.status]);

  // ── Dismiss ───────────────────────────────────────────────────────────
  const handleDismiss = async () => {
    setDismissed(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      await fetch(`/api/session-insight?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ dismiss: true }),
      });
    } catch {
      /* silent — the UI hide already happened, persistence is best-effort */
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (dismissed) return null;
  if (!insight) {
    // First poll hasn't returned. Show a placeholder so the page doesn't
    // jump when the bar appears.
    return <LoadingBar t={t} />;
  }

  if (insight.status === "pending") {
    return <LoadingBar t={t} />;
  }

  if (insight.status === "empty" || insight.status === "failed") {
    return null;
  }

  // status === 'ready'
  const points = Array.isArray(insight.weak_points) ? insight.weak_points : [];
  if (points.length === 0) return null;

  // Find any participant that appears in BOTH weak points (the "repeated"
  // student — they're struggling broadly, not just on one topic).
  const repeatedNames = findRepeatedFailers(points);

  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${C.orange}`,
      borderRadius: 10,
      padding: "14px 18px",
      marginBottom: 24,
      boxShadow: C.shadow,
      transition: "all 0.2s ease",
    }}>
      {/* Header row: icon + label + content */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Alert icon (orange) */}
        <div style={{
          width: 28, height: 28,
          borderRadius: 7,
          background: C.orangeSoft || "#FDF3E8",
          color: C.orange,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          marginTop: 1,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>

        {/* Text content */}
        <div style={{ flex: 1, fontSize: 14, lineHeight: 1.55, color: C.text, minWidth: 0 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: C.orange,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 6,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {points.length === 1 ? t.labelOne : t.labelTwo}
          </div>

          {points.map((p, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: idx < points.length - 1 ? 8 : 0,
            }}>
              {points.length > 1 && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  color: C.textMuted,
                  fontSize: 12,
                  marginRight: 2,
                }}>
                  {idx + 1}.
                </span>
              )}
              <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                {renderLabelWithQuotes(p.label)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <PctCircle pct={p.fail_pct} size="sm" />
                <span style={{
                  fontSize: 12.5,
                  color: C.textSecondary,
                  fontWeight: 500,
                }}>
                  {t.failed}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Side actions: expand + dismiss */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.textSecondary,
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "'Outfit', sans-serif",
              transition: "background .12s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bgSoft; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <span>{expanded ? t.collapse : t.expand}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                 style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s ease" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            onClick={handleDismiss}
            title={t.dismiss}
            aria-label={t.dismiss}
            style={{
              padding: 6,
              borderRadius: 6,
              background: "transparent",
              border: "none",
              color: C.textMuted,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded detail: top failers per weak point */}
      {expanded && (
        <div style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${C.border}`,
        }}>
          {points.map((p, idx) => (
            <div key={idx} style={{ marginBottom: idx < points.length - 1 ? 14 : 0 }}>
              {points.length > 1 && (
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.textMuted,
                  marginBottom: 6,
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}>
                  {idx + 1}. {p.label?.length > 40 ? p.label.slice(0, 40) + "…" : p.label}
                </div>
              )}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 8,
              }}>
                {(p.top_failers || []).map((f, fidx) => (
                  <div key={fidx} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: C.bgSoft,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: C.accentSoft,
                      color: C.accent,
                      display: "grid", placeItems: "center",
                      fontSize: 10.5, fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      {initials(f.name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                        {t.failerSummary(f.wrong, f.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* "Repeated student" note */}
          {repeatedNames.length > 0 && (
            <div style={{
              marginTop: 12,
              padding: "8px 12px",
              background: C.bgSoft,
              border: `1px dashed ${C.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: C.textSecondary,
              lineHeight: 1.5,
            }}>
              {renderRepeatedNote(t.repeatedNote(repeatedNames[0]))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function LoadingBar({ t }) {
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "12px 18px",
      marginBottom: 24,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 13,
      color: C.textMuted,
    }}>
      <div style={{
        width: 14, height: 14, borderRadius: "50%",
        border: `2px solid ${C.border}`,
        borderTopColor: C.accent,
        animation: "sib-spin 0.8s linear infinite",
      }} />
      <span>{t.analyzing}</span>
      <style>{`@keyframes sib-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * Render the AI label, converting backtick-wrapped terms into styled
 * chips. The prompt instructs Haiku to use backticks around specific
 * words (e.g. "Las preguntas con `estar`..."). We split on backticks
 * and style alternating segments.
 */
function renderLabelWithQuotes(label) {
  if (!label) return null;
  const parts = String(label).split("`");
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Odd index = inside backticks
      return (
        <span key={i} style={{
          background: C.bgSoft,
          padding: "1px 6px",
          borderRadius: 4,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12.5,
          color: C.text,
          border: `1px solid ${C.border}`,
          margin: "0 1px",
          display: "inline-block",
        }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Render the "repeated student" note, converting **bold** spans into
 * styled bold elements. (Markdown-lite — we don't need a full parser.)
 */
function renderRepeatedNote(text) {
  const parts = String(text).split("**");
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ color: C.text, fontWeight: 600 }}>{part}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function findRepeatedFailers(points) {
  if (!Array.isArray(points) || points.length < 2) return [];
  const idsInFirst = new Set(
    (points[0].top_failers || []).map(f => f.participant_id),
  );
  const repeated = [];
  for (const f of points[1].top_failers || []) {
    if (idsInFirst.has(f.participant_id)) {
      repeated.push(f.name);
    }
  }
  return repeated;
}

function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
