// src/pages/analytics/LiveCommandCenter.jsx
//
// F6 Analytics Studio: vista En vivo / Command Center en /school/live.
// - Si hay sesión activa: tiles realtime + alertas accionables.
// - Si no: pulso de hoy expandido + estado vacío calmo.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import LiveTile from "../../components/analytics/LiveTile";
import { useTodayPulse } from "../../hooks/useTodayPulse";
import { useActiveSession } from "../../hooks/useActiveSession";
import { useLiveSession } from "../../hooks/useLiveSession";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { computeTodayPulse } from "../../lib/analytics/pulse-of-today";
import {
  generateClassReviewQuestions,
  saveClassReviewDeck,
} from "../../lib/close-unit-ai";
import { buildRoute, ROUTES } from "../../routes";

const ACCENT = "#7c3aed";

export default function LiveCommandCenter({ profile = null }) {
  const navigate = useNavigate();
  const activeQ = useActiveSession();
  const pulseQ = useTodayPulse();
  const overviewQ = useAnalyticsOverview();

  const sessionId = activeQ.data?.id || null;
  const live = useLiveSession(sessionId);

  // Aggregate live counts
  const counts = useMemo(() => {
    const joined = live.participants.filter((p) => !p.is_kicked).length;
    const done = live.participants.filter((p) => p.completed_at).length;
    const responding = Math.max(0, joined - done);
    let sumPoints = 0;
    let sumMax = 0;
    for (const r of live.responses) {
      if (Number.isFinite(Number(r?.points))) sumPoints += Number(r.points);
      if (Number.isFinite(Number(r?.max_points))) sumMax += Number(r.max_points);
    }
    const pct = sumMax > 0 ? Math.round((sumPoints / sumMax) * 100) : null;
    return { joined, done, responding, pct };
  }, [live.participants, live.responses]);

  // Detect "alert question" = question_index with >= 60% error among >= 3 responders
  const alertQuestions = useMemo(() => {
    const byQ = new Map();
    for (const r of live.responses) {
      const key = r.question_index;
      if (key == null) continue;
      const cur = byQ.get(key) || { wrong: 0, total: 0 };
      cur.total += 1;
      if (!r.is_correct) cur.wrong += 1;
      byQ.set(key, cur);
    }
    return [...byQ.entries()]
      .filter(([, v]) => v.total >= 3 && v.wrong / v.total >= 0.6)
      .map(([qi, v]) => ({
        question_index: qi,
        error_rate: Math.round((v.wrong / v.total) * 100),
      }));
  }, [live.responses]);

  const [generating, setGenerating] = useState(false);

  async function handleQuickReview() {
    if (generating || !activeQ.data?.class_id) return;
    setGenerating(true);
    // Resolve class object for the generator (needs subject/grade).
    const row = (overviewQ.data ?? []).find(
      (r) => r.class_id === activeQ.data.class_id,
    );
    const cObj = row
      ? {
          id: row.class_id,
          name: row.class_name || "",
          subject: row.class_subject || "",
          grade: row.class_grade || "",
        }
      : { id: activeQ.data.class_id, name: "", subject: "", grade: "" };
    // Use the active session topic as the only weak topic seed for the prompt.
    const weakTopics = activeQ.data.topic ? [activeQ.data.topic] : [];
    const gen = await generateClassReviewQuestions({ classObj: cObj, weakTopics, lang: "es" });
    if (!gen.ok) { setGenerating(false); return; }
    const save = await saveClassReviewDeck({
      classObj: cObj,
      questions: gen.questions,
      lang: gen.inferredLang || "es",
      authorId: profile?.id ?? null,
    });
    setGenerating(false);
    if (save.ok) navigate(buildRoute.deckEdit(save.deckId));
  }

  const pulse = pulseQ.data
    ? computeTodayPulse({
        sessions: pulseQ.data.sessions,
        responses: pulseQ.data.responses,
        classes: pulseQ.data.classes,
      })
    : null;

  return (
    <StudioShell view="live" title="En vivo">
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
        {sessionId ? (
          <>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e4e4e7",
                borderLeft: `3px solid ${ACCENT}`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: live.isLive ? "#7c3aed" : "#a1a1aa",
                  display: "inline-block",
                }}
              />
              <b>{activeQ.data?.topic || "Sesión activa"}</b>
              <span style={{ color: "#71717a" }}>
                · {live.isLive ? "recibiendo updates en vivo" : "conectando…"}
              </span>
              <button
                onClick={() => navigate(buildRoute.sessionsLive(sessionId))}
                style={{
                  marginLeft: "auto",
                  border: "1px solid #c4b5fd",
                  background: "#f5f3ff",
                  color: "#5b21b6",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Volver a la sesión
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <LiveTile label="Conectados" value={counts.joined} live={live.isLive} tone="live" />
              <LiveTile label="Respondiendo" value={counts.responding} live={live.isLive} />
              <LiveTile label="Terminaron" value={counts.done} live={live.isLive} tone="good" />
              <LiveTile
                label="% correcto en vivo"
                value={counts.pct != null ? counts.pct : "—"}
                unit={counts.pct != null ? "%" : ""}
                live={live.isLive}
                tone={
                  counts.pct == null
                    ? "default"
                    : counts.pct >= 70
                      ? "good"
                      : counts.pct >= 40
                        ? "warn"
                        : "bad"
                }
              />
            </div>

            {alertQuestions.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e4e4e7",
                  borderLeft: "3px solid #dc2626",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Alertas de la sesión
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, lineHeight: 1.6 }}>
                  {alertQuestions.map((a) => (
                    <li key={a.question_index}>
                      Pregunta {a.question_index + 1}: <b>{a.error_rate}%</b> de error.
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={handleQuickReview}
                    disabled={generating}
                    style={{
                      border: "1px solid #c4b5fd",
                      background: "#f5f3ff",
                      color: "#5b21b6",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: generating ? "wait" : "pointer",
                    }}
                  >
                    {generating ? "Generando repaso…" : "Lanzar repaso"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e4e4e7",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 12,
                fontSize: 14,
                color: "#52525b",
              }}
            >
              Sin sesiones activas ahora mismo. Lanzá una desde{" "}
              <button
                onClick={() => navigate(ROUTES.SESSIONS)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 14,
                }}
              >
                Sesiones
              </button>{" "}
              para ver tiles en vivo acá.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              <LiveTile
                label="Sesiones de hoy"
                value={pulse ? pulse.completed_sessions + pulse.active_sessions : "—"}
              />
              <LiveTile
                label="% correcto hoy"
                value={pulse?.pct_correct_today != null ? pulse.pct_correct_today : "—"}
                unit={pulse?.pct_correct_today != null ? "%" : ""}
                tone={
                  pulse?.pct_correct_today == null
                    ? "default"
                    : pulse.pct_correct_today >= 70
                      ? "good"
                      : pulse.pct_correct_today >= 40
                        ? "warn"
                        : "bad"
                }
              />
              <LiveTile
                label="Top clase"
                value={pulse?.top_class?.name || "—"}
                unit={pulse?.top_class ? `${pulse.top_class.response_count} resp.` : ""}
              />
              <LiveTile
                label="Top alumno"
                value={pulse?.top_student?.name || "—"}
                unit={pulse?.top_student ? `${pulse.top_student.pct_correct}%` : ""}
                tone={pulse?.top_student ? "good" : "default"}
              />
            </div>
          </>
        )}
      </div>
    </StudioShell>
  );
}
