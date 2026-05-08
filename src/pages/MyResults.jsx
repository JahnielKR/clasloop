// ─── /sessions/:sessionId/my-results — Student's own answers + feedback ──
// Lands here from a "Feedback from your teacher" notification. Shows the
// student their own answers for that session, side-by-side with the
// correct answer, and — for free-text answers the teacher graded — the
// teacher's grade and feedback note.
//
// Aggregation note: this is per-student, not per-session-overall. It
// reads from responses filtered by participant.student_id = current user.
// RLS already restricts what the student can see; we still pass the
// filter explicitly for clarity. Guests-without-auth never reach this
// page (no notification, no auth user) — that's a known limitation
// documented in the turn 4 commit.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import { C, MONO } from "../components/tokens";
import { ROUTES } from "../routes";
import PageHeader from "../components/PageHeader";
import {
  describeCorrectAnswer,
  formatStudentAnswer,
} from "../lib/scoring";

// ─── i18n ────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    title: "My results",
    backToNotifs: "Back to notifications",
    loading: "Loading…",
    error: "Could not load results.",
    sessionNotFound: "Session not found.",
    noResponses: "You don't have any answers in this session yet.",
    questionLabel: "Question {n}",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    noAnswer: "(no answer)",
    teacherGrade: "Teacher grade",
    teacherFeedback: "Teacher's feedback",
    pendingReview: "Pending teacher review",
    gradeCorrect: "Correct",
    gradePartial: "Partial",
    gradeIncorrect: "Incorrect",
    pointsLabel: "{p} / {m}",
  },
  es: {
    title: "Mis resultados",
    backToNotifs: "Volver a notificaciones",
    loading: "Cargando…",
    error: "No se pudieron cargar los resultados.",
    sessionNotFound: "Sesión no encontrada.",
    noResponses: "Aún no tienes respuestas en esta sesión.",
    questionLabel: "Pregunta {n}",
    yourAnswer: "Tu respuesta",
    correctAnswer: "Respuesta correcta",
    noAnswer: "(sin respuesta)",
    teacherGrade: "Calificación del profe",
    teacherFeedback: "Feedback del profe",
    pendingReview: "Pendiente de revisión",
    gradeCorrect: "Correcta",
    gradePartial: "Parcial",
    gradeIncorrect: "Incorrecta",
    pointsLabel: "{p} / {m}",
  },
  ko: {
    title: "내 결과",
    backToNotifs: "알림으로 돌아가기",
    loading: "로딩 중…",
    error: "결과를 불러올 수 없습니다.",
    sessionNotFound: "세션을 찾을 수 없습니다.",
    noResponses: "이 세션에 아직 답변이 없습니다.",
    questionLabel: "{n}번 문제",
    yourAnswer: "내 답변",
    correctAnswer: "정답",
    noAnswer: "(답변 없음)",
    teacherGrade: "선생님 평가",
    teacherFeedback: "선생님 피드백",
    pendingReview: "검토 대기 중",
    gradeCorrect: "정답",
    gradePartial: "부분 정답",
    gradeIncorrect: "오답",
    pointsLabel: "{p} / {m}",
  },
};

// Color a grade pill by its kind. Same palette as the rest of the app
// (Review.jsx, DeckResults.jsx).
function gradeColor(grade) {
  if (grade === "correct") return { bg: C.greenSoft, fg: C.green };
  if (grade === "partial") return { bg: C.orangeSoft, fg: C.orange };
  if (grade === "incorrect") return { bg: C.redSoft, fg: C.red };
  return { bg: C.bgSoft, fg: C.textMuted };
}

export default function MyResults({ profile, lang = "en", setLang, onOpenMobileMenu }) {
  // useParams() doesn't work in this app (App.jsx maps page via pathToPage,
  // no real <Routes>). Parse sessionId from the pathname directly. Same
  // trick as DeckResults / Review / ClassInsights.
  const location = useLocation();
  const sessionId = useMemo(() => {
    const m = location.pathname.match(/^\/sessions\/([^/]+)\/my-results\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [location.pathname]);
  const navigate = useNavigate();
  const t = i18n[lang] || i18n.en;

  const [session, setSession] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      if (!sessionId || !profile?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        // Session + deck (we need deck.questions to render prompts and to
        // describe the correct answer per question).
        const { data: sess, error: sErr } = await supabase
          .from("sessions")
          .select("id, topic, class_id, deck:decks ( id, title, questions ), classes ( id, name )")
          .eq("id", sessionId)
          .maybeSingle();
        if (cancelled) return;
        if (sErr || !sess) {
          setError(t.sessionNotFound);
          setLoading(false);
          return;
        }
        setSession(sess);

        // Responses for this student in this session. We join through
        // session_participants to filter by student_id = me. Sorting by
        // question_index keeps them in the deck's natural order.
        const { data: resp, error: rErr } = await supabase
          .from("responses")
          .select(`
            id,
            question_index,
            answer,
            is_correct,
            points,
            max_points,
            needs_review,
            teacher_grade,
            teacher_feedback,
            graded_at,
            participant:session_participants!inner ( student_id )
          `)
          .eq("session_id", sessionId)
          .eq("participant.student_id", profile.id)
          .order("question_index", { ascending: true });
        if (cancelled) return;
        if (rErr) {
          setError(t.error);
          setLoading(false);
          return;
        }
        setResponses(resp || []);
      } catch (e) {
        if (!cancelled) setError(t.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [sessionId, profile?.id, t.error, t.sessionNotFound]);

  const questions = session?.deck?.questions || [];

  return (
    <div style={{ padding: "28px 20px 80px", fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @keyframes mr-fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .mr-card { animation: mr-fadeUp .25s ease both; }
      `}</style>

      <PageHeader
        title={t.title}
        icon="check"
        lang={lang}
        setLang={setLang}
        maxWidth={820}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Back to notifications */}
        <button
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
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
          {t.backToNotifs}
        </button>

        {session && (
          <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 20px", lineHeight: 1.5 }}>
            {session.topic}
            {session.classes?.name ? ` · ${session.classes.name}` : ""}
          </p>
        )}

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
        {!loading && !error && session && responses.length === 0 && (
          <div className="mr-card" style={{
            textAlign: "center", padding: "60px 20px",
            background: C.bg, border: `1px dashed ${C.border}`,
            borderRadius: 14,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
              {t.noResponses}
            </p>
          </div>
        )}

        {/* One card per response, sorted by question_index. We render the
            question prompt, the student's answer, the correct answer (if
            knowable for the type), and — for graded free-text — the
            teacher's grade pill plus their feedback note. */}
        {!loading && !error && responses.map((r, i) => {
          const q = questions[r.question_index];
          if (!q) return null;
          const type = q.type || "free";
          const correct = describeCorrectAnswer(q, type);
          const studentAnswer = formatStudentAnswer(q, type, {
            raw: r.answer,
            points: r.points,
            maxPoints: r.max_points,
            needsReview: r.needs_review,
            isCorrect: r.is_correct,
          });
          const isGradedFreeText = r.needs_review && r.teacher_grade != null;
          const isPendingFreeText = r.needs_review && r.teacher_grade == null;
          const grade = isGradedFreeText ? r.teacher_grade : null;
          const gc = gradeColor(grade);

          return (
            <div
              key={r.id}
              className="mr-card"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "16px 18px",
                marginBottom: 12,
                animationDelay: `${i * 0.04}s`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                {t.questionLabel.replace("{n}", String(r.question_index + 1))}
              </div>
              <div style={{ fontSize: 14, color: C.text, marginBottom: 12, lineHeight: 1.5, fontWeight: 500 }}>
                {q.prompt || q.question || ""}
              </div>

              {/* Your answer */}
              <div style={{ marginBottom: correct ? 10 : 0 }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>
                  {t.yourAnswer}
                </div>
                <div style={{
                  fontSize: 13, color: C.text, lineHeight: 1.5,
                  padding: "8px 10px", background: C.bgSoft,
                  borderRadius: 7, border: `1px solid ${C.border}`,
                  fontFamily: type === "free" || type === "open" ? "'Outfit',sans-serif" : MONO,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {studentAnswer || <span style={{ color: C.textMuted, fontStyle: "italic" }}>{t.noAnswer}</span>}
                </div>
              </div>

              {/* Correct answer (when knowable) */}
              {correct && (
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>
                    {t.correctAnswer}
                  </div>
                  <div style={{
                    fontSize: 13, color: C.green, lineHeight: 1.5,
                    padding: "8px 10px", background: C.greenSoft,
                    borderRadius: 7, border: `1px solid ${C.green}33`,
                    fontFamily: MONO,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {correct}
                  </div>
                </div>
              )}

              {/* Teacher grade pill — only for graded free-text */}
              {isGradedFreeText && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>
                    {t.teacherGrade}:
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    padding: "3px 10px", borderRadius: 999,
                    background: gc.bg, color: gc.fg,
                  }}>
                    {grade === "correct" ? t.gradeCorrect
                     : grade === "partial" ? t.gradePartial
                     : t.gradeIncorrect}
                  </span>
                  <span style={{ fontSize: 11, color: C.textMuted, fontFamily: MONO }}>
                    {t.pointsLabel.replace("{p}", String(r.points || 0)).replace("{m}", String(r.max_points || 0))}
                  </span>
                </div>
              )}

              {/* Teacher feedback note — only when present */}
              {isGradedFreeText && r.teacher_feedback && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>
                    {t.teacherFeedback}
                  </div>
                  <div style={{
                    fontSize: 13, color: C.text, lineHeight: 1.5,
                    padding: "10px 12px",
                    background: C.accentSoft,
                    borderRadius: 7,
                    border: `1px solid ${C.accent}33`,
                    borderLeft: `3px solid ${C.accent}`,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {r.teacher_feedback}
                  </div>
                </div>
              )}

              {/* Pending — free-text the teacher hasn't graded yet */}
              {isPendingFreeText && (
                <div style={{
                  marginTop: 12,
                  fontSize: 12, color: C.textMuted,
                  fontStyle: "italic",
                }}>
                  {t.pendingReview}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
