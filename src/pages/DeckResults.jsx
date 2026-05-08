// ─── /decks/:id/results — Per-question aggregate stats for a deck ───────
// Teachers see, per question of the deck:
//   - % correct (counts partial as 0.5 toward the percentage)
//   - distribution of answers (bars sorted by frequency)
//   - average response time
//   - pending teacher review count (free-text), with CTA to /review
//
// Aggregation is across ALL sessions the deck has been used in, with an
// optional class filter to focus on one classroom. Students are NOT
// surfaced individually — the page is for the teacher to see what to
// re-teach, not to grade individuals.
//
// The aggregation runs in Postgres via deck_question_stats() so we don't
// download every response. RLS already restricts what the teacher sees
// to their own sessions.

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { C, MONO } from "../components/tokens";
import PageHeader from "../components/PageHeader";
import { ROUTES, buildRoute } from "../routes";
import {
  fetchDeckQuestionStats,
  pctCorrect,
  pctColor,
  labelForAnswerKey,
  sortedDistribution,
  correctKeysForQuestion,
  formatAvgTime,
} from "../lib/deck-stats";

// ─── i18n ────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    title: "Deck results",
    backToDecks: "Back to decks",
    loading: "Loading results…",
    error: "Could not load results.",
    deckNotFound: "Deck not found.",
    noResultsTitle: "No data yet",
    noResultsHint: "Once students complete this deck, results will appear here.",
    filterAllClasses: "All classes",
    filterByClass: "Class",
    questionLabel: "Question {n}",
    totalResponses: "{n} responses",
    avgTime: "Avg {t}",
    correctLabel: "correct",
    partialLabel: "partial",
    incorrectLabel: "incorrect",
    pendingLabel: "pending review",
    pendingCta: "Go to To Review",
    noResponsesYet: "No responses yet for this question.",
    distributionTitle: "How students answered",
    free: "Free response",
    open: "Open response",
    overviewTitle: "Overview",
    overviewQuestions: "{n} questions with responses",
    overviewSessions: "{n} total responses",
  },
  es: {
    title: "Resultados del deck",
    backToDecks: "Volver a decks",
    loading: "Cargando resultados…",
    error: "No se pudieron cargar los resultados.",
    deckNotFound: "Deck no encontrado.",
    noResultsTitle: "Aún no hay datos",
    noResultsHint: "Cuando los estudiantes completen este deck, los resultados aparecerán acá.",
    filterAllClasses: "Todas las clases",
    filterByClass: "Clase",
    questionLabel: "Pregunta {n}",
    totalResponses: "{n} respuestas",
    avgTime: "Prom. {t}",
    correctLabel: "correctas",
    partialLabel: "parciales",
    incorrectLabel: "incorrectas",
    pendingLabel: "pendientes",
    pendingCta: "Ir a Por revisar",
    noResponsesYet: "Aún no hay respuestas para esta pregunta.",
    distributionTitle: "Cómo respondieron",
    free: "Respuesta libre",
    open: "Respuesta abierta",
    overviewTitle: "Resumen",
    overviewQuestions: "{n} preguntas con respuestas",
    overviewSessions: "{n} respuestas totales",
  },
  ko: {
    title: "덱 결과",
    backToDecks: "덱으로 돌아가기",
    loading: "결과 불러오는 중…",
    error: "결과를 불러올 수 없습니다.",
    deckNotFound: "덱을 찾을 수 없습니다.",
    noResultsTitle: "아직 데이터가 없습니다",
    noResultsHint: "학생들이 이 덱을 완료하면 결과가 여기에 표시됩니다.",
    filterAllClasses: "모든 수업",
    filterByClass: "수업",
    questionLabel: "{n}번 문제",
    totalResponses: "{n}개 응답",
    avgTime: "평균 {t}",
    correctLabel: "정답",
    partialLabel: "부분 정답",
    incorrectLabel: "오답",
    pendingLabel: "검토 대기",
    pendingCta: "검토 페이지로",
    noResponsesYet: "이 문제에 대한 응답이 아직 없습니다.",
    distributionTitle: "응답 분포",
    free: "자유 응답",
    open: "개방형 응답",
    overviewTitle: "개요",
    overviewQuestions: "응답이 있는 문제 {n}개",
    overviewSessions: "총 응답 {n}개",
  },
};

export default function DeckResults({ profile, lang = "en", setLang, onOpenMobileMenu }) {
  // App.jsx renders pages by mapping pathToPage(pathname) → component, but
  // it doesn't register react-router <Route>s, so useParams() returns
  // empty for nested patterns like /decks/:deckId/results. We extract
  // the id from the pathname directly. Same trick the rest of the app
  // uses for similar cases.
  const location = useLocation();
  const deckId = useMemo(() => {
    const m = location.pathname.match(/^\/decks\/([^/]+)\/results\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [location.pathname]);
  const navigate = useNavigate();
  const t = i18n[lang] || i18n.en;

  // ── State ─────────────────────────────────────────────────────────────
  const [deck, setDeck] = useState(null);
  const [classes, setClasses] = useState([]); // classes the deck has been used with
  const [classFilter, setClassFilter] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Track whether we've already pre-selected the deck's home class on
  // first mount. We pre-select once (not on every fetch) so if the
  // teacher manually picks "All classes" it stays that way.
  const [didPreselect, setDidPreselect] = useState(false);

  // ── Fetch deck + the classes it was used in ──────────────────────────
  // We need the deck's questions array to render prompts; we need the
  // list of distinct classes (across sessions of this deck) to populate
  // the filter dropdown. Both come in parallel with the stats RPC so
  // the page settles quickly.
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [deckRes, sessionsRes, statsRes] = await Promise.all([
        supabase.from("decks").select("id, title, questions, class_id").eq("id", deckId).maybeSingle(),
        // Distinct class_ids for sessions of this deck. RLS on sessions
        // ensures only the owning teacher gets results. We fetch the
        // class names via a join so the filter dropdown shows readable
        // labels.
        supabase
          .from("sessions")
          .select("class_id, class:classes(id, name)")
          .eq("deck_id", deckId),
        fetchDeckQuestionStats({ deckId, classId: classFilter }),
      ]);

      if (deckRes.error || !deckRes.data) {
        setError(t.deckNotFound);
        setDeck(null);
        return;
      }
      setDeck(deckRes.data);

      // Dedupe classes by id for the dropdown.
      if (sessionsRes.data) {
        const seen = new Map();
        for (const row of sessionsRes.data) {
          const c = row.class;
          if (c && c.id && !seen.has(c.id)) seen.set(c.id, c.name || "");
        }
        setClasses(Array.from(seen, ([id, name]) => ({ id, name })));
      }

      if (statsRes.error) {
        setError(statsRes.error);
      } else {
        setStats(statsRes.rows);
      }
    } catch (e) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [deckId, classFilter, t.error, t.deckNotFound]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Pre-select the deck's home class (deck.class_id) the first time we
  // load the deck. This is a UX choice: when a teacher opens a deck
  // that lives in a class, they almost always want that class's results
  // first — not an aggregate across all classes the deck has been used
  // in. They can still pick "All classes" from the dropdown to see the
  // wider view; we only pre-select once so manual changes stick.
  useEffect(() => {
    if (didPreselect) return;
    if (!deck || !deck.class_id) return;
    setClassFilter(deck.class_id);
    setDidPreselect(true);
  }, [deck, didPreselect]);

  // Map stats by questionIndex for quick lookup when iterating questions.
  const statsByIndex = useMemo(() => {
    const m = new Map();
    for (const s of stats) m.set(s.questionIndex, s);
    return m;
  }, [stats]);

  const totalResponses = useMemo(
    () => stats.reduce((acc, s) => acc + s.totalResponses, 0),
    [stats]
  );

  const questionsWithResponses = stats.length;
  const totalPending = useMemo(
    () => stats.reduce((acc, s) => acc + s.pendingReviewCount, 0),
    [stats]
  );

  const hasAnyData = !loading && !error && deck && totalResponses > 0;

  return (
    <div style={{
      padding: "28px 20px 80px",
      fontFamily: "'Outfit',sans-serif",
    }}>
      <style>{`
        @keyframes ds-fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .ds-card { animation: ds-fadeUp .25s ease both; }
        @keyframes ds-grow { from { width: 0; } }
        .ds-bar { animation: ds-grow .55s cubic-bezier(0.18, 0.67, 0.6, 1.22) both; }
      `}</style>

      {/* Shared PageHeader — same chrome as the rest of the app. */}
      <PageHeader
        title={t.title}
        lang={lang}
        setLang={setLang}
        maxWidth={820}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Back to decks */}
        <button
          onClick={() => navigate(ROUTES.DECKS)}
          style={{
            marginBottom: 14,
            padding: "6px 10px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            background: "transparent",
            color: C.textSecondary,
            border: `1px solid ${C.border}`,
            cursor: "pointer",
            fontFamily: "'Outfit',sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t.backToDecks}
        </button>

        {deck && (
          <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 18px", lineHeight: 1.5 }}>
            {deck.title}
          </p>
        )}

      {/* Loading / error */}
      {loading && (
        <div style={{ textAlign: "center", color: C.textMuted, padding: "40px 0", fontSize: 14 }}>
          {t.loading}
        </div>
      )}
      {!loading && error && (
        <div style={{
          background: C.redSoft, color: C.red, padding: "10px 14px",
          borderRadius: 8, fontSize: 13, marginBottom: 14, lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      {/* Empty state — no responses across all sessions */}
      {!loading && !error && deck && totalResponses === 0 && (
        <div className="ds-card" style={{
          textAlign: "center", padding: "60px 20px",
          background: C.bg, border: `1px dashed ${C.border}`,
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: C.text }}>
            {t.noResultsTitle}
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {t.noResultsHint}
          </p>
        </div>
      )}

      {/* Filter row + overview */}
      {hasAnyData && (
        <>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, marginBottom: 16, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
                {t.filterByClass}:
              </span>
              <select
                value={classFilter || ""}
                onChange={(e) => setClassFilter(e.target.value || null)}
                style={selStyle}
              >
                <option value="">{t.filterAllClasses}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, textAlign: "right" }}>
              <div>{t.overviewQuestions.replace("{n}", String(questionsWithResponses))}</div>
              <div>{t.overviewSessions.replace("{n}", String(totalResponses))}</div>
            </div>
          </div>

          {/* CTA when there's pending review across this deck */}
          {totalPending > 0 && (
            <div className="ds-card" style={{
              background: C.accentSoft, border: `1px solid ${C.accent}55`,
              padding: "12px 14px", borderRadius: 10, marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 13, color: C.text }}>
                <strong>{totalPending}</strong>&nbsp;
                {t.pendingLabel}
              </span>
              <button
                onClick={() => navigate(ROUTES.REVIEW)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                {t.pendingCta}
              </button>
            </div>
          )}
        </>
      )}

      {/* Per-question cards. We iterate the deck's questions array (not
          stats array) so we render every question — even those with no
          data — in deck order. Questions with data get the full breakdown;
          questions without get a "no responses yet" placeholder. */}
      {hasAnyData && Array.isArray(deck.questions) && deck.questions.map((q, i) => {
        const row = statsByIndex.get(i);
        const qType = q?.type || "mcq";
        const pct = pctCorrect(row);
        const color = pctColor(pct, C);
        const correctKeys = correctKeysForQuestion(q, qType);
        const dist = row ? sortedDistribution(row.answerDistribution, correctKeys) : [];

        return (
          <div
            key={i}
            className="ds-card"
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            {/* Top row: question label + percentage circle */}
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 12, marginBottom: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, color: C.textMuted, fontWeight: 600,
                  letterSpacing: ".03em", marginBottom: 4,
                }}>
                  {t.questionLabel.replace("{n}", String(i + 1))}
                  {(qType === "free" || qType === "open") && (
                    <span style={{
                      marginLeft: 8, padding: "1px 6px",
                      background: C.accentSoft, color: C.accent,
                      borderRadius: 4, fontSize: 10, fontWeight: 700,
                    }}>
                      {qType === "free" ? t.free : t.open}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 14, color: C.text, fontWeight: 600,
                  lineHeight: 1.45,
                }}>
                  {q?.q || q?.prompt || ""}
                </div>
              </div>

              {/* Percentage badge — green / orange / red */}
              {pct != null && (
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: color + "14", border: `2px solid ${color}33`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: MONO, lineHeight: 1 }}>
                    {pct}%
                  </span>
                </div>
              )}
            </div>

            {/* Body: counts and distribution OR no-data placeholder */}
            {!row ? (
              <div style={{
                fontSize: 12, color: C.textMuted, fontStyle: "italic",
                padding: "10px 0",
              }}>
                {t.noResponsesYet}
              </div>
            ) : (
              <>
                {/* Counts row */}
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 14,
                  fontSize: 12, color: C.textMuted, marginBottom: 12,
                }}>
                  <span>
                    <strong style={{ color: C.text, fontFamily: MONO }}>{row.totalResponses}</strong> {t.totalResponses.replace("{n}", "").trim() || "responses"}
                  </span>
                  {row.correctCount > 0 && (
                    <span style={{ color: C.green }}>
                      ✓ {row.correctCount} {t.correctLabel}
                    </span>
                  )}
                  {row.partialCount > 0 && (
                    <span style={{ color: C.orange }}>
                      ~ {row.partialCount} {t.partialLabel}
                    </span>
                  )}
                  {row.incorrectCount > 0 && (
                    <span style={{ color: C.red }}>
                      ✗ {row.incorrectCount} {t.incorrectLabel}
                    </span>
                  )}
                  {row.pendingReviewCount > 0 && (
                    <span style={{ color: C.accent }}>
                      ⏱ {row.pendingReviewCount} {t.pendingLabel}
                    </span>
                  )}
                  {row.avgTimeMs > 0 && (
                    <span style={{ marginLeft: "auto" }}>
                      {t.avgTime.replace("{t}", formatAvgTime(row.avgTimeMs))}
                    </span>
                  )}
                </div>

                {/* Distribution bars — only meaningful for MCQ/TF where the
                    answer key maps to an option label. For other types
                    we hide the distribution since the keys would be opaque
                    (free-text shows the raw text, which is too varied to
                    be useful as bars; match/order serialize to JSON
                    blobs). */}
                {(qType === "mcq" || qType === "tf") && dist.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: 11, color: C.textMuted, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: ".05em",
                      marginBottom: 6,
                    }}>
                      {t.distributionTitle}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {dist.map((d, di) => {
                        const label = labelForAnswerKey(d.key, q, qType) || d.key;
                        // Color coding: green if it's the correct answer,
                        // muted otherwise. We don't paint wrong answers
                        // red because some of them have only 1-2 picks
                        // — red would over-dramatize.
                        const barColor = d.isCorrect === true
                          ? C.green
                          : d.isCorrect === false
                            ? C.textMuted
                            : C.accent;
                        return (
                          <div key={di} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              flex: "0 0 40%",
                              fontSize: 12, color: C.text,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontWeight: d.isCorrect ? 600 : 500,
                            }}>
                              {d.isCorrect && <span style={{ color: C.green, marginRight: 4 }}>✓</span>}
                              {label}
                            </div>
                            <div style={{
                              flex: 1, position: "relative",
                              height: 8, background: C.bgSoft,
                              borderRadius: 4, overflow: "hidden",
                            }}>
                              <div
                                className="ds-bar"
                                style={{
                                  position: "absolute", inset: 0,
                                  width: `${d.percent}%`,
                                  background: barColor,
                                  opacity: d.isCorrect === false ? 0.5 : 0.85,
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                            <div style={{
                              flex: "0 0 60px",
                              fontSize: 11,
                              color: C.textMuted,
                              fontFamily: MONO,
                              textAlign: "right",
                            }}>
                              {d.count} ({d.percent}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

const selStyle = {
  fontFamily: "'Outfit',sans-serif",
  fontSize: 13,
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.text,
  padding: "6px 28px 6px 10px",
  borderRadius: 7,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239B9B9B' stroke-width='1.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
};
