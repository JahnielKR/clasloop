// ─── /review — Teacher's "To Review" queue ──────────────────────────────
// Lists every response that needs the teacher's eyes (currently: free-text
// and open answers). Single feed across all classes, oldest first, so
// students don't wait for ages.
//
// One-keystroke grading: 1 = correct, 2 = partial, 3 = incorrect.
// Optional feedback textarea — if the teacher typed something, it gets
// saved with the grade. Click on a button = immediate save → response
// slides up out of the feed. A toast lets them undo the last action for
// 5 seconds.
//
// We DO NOT filter by deck this turn. Adding deck filter is trivial when
// asked. Class filter is the one most likely to matter (a teacher with
// 3 classes can focus on Math 6th).
//
// Realtime is intentionally OFF in this turn. If the teacher has /review
// open in two tabs the second tab will see stale data — annoying but
// rare; can be added later if it actually bites.
//
// RLS at the DB level enforces ownership. Even if a non-owner teacher
// loads /review and gets results from a query, the responses table's
// new SELECT policy ("Teachers can read their session responses") will
// return zero rows for them. The page query relies on that.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CIcon } from "../components/Icons";
import PageHeader from "../components/PageHeader";
import { C } from "../components/tokens";
import { ROUTES } from "../routes";
import { teacherGradeToPoints, describeCorrectAnswer } from "../lib/scoring";

// ─── i18n ────────────────────────────────────────────────────────────────
const i18n = {
  en: {
    title: "To review",
    subtitle: "Free-text answers waiting for your input",
    backToHome: "Back",
    loading: "Loading…",
    emptyTitle: "All caught up",
    emptyHint: "Now go and enjoy the coffee you deserve.",
    filterAllClasses: "All classes",
    filterByClass: "Class",
    pendingCount: "{n} pending",
    pendingCountOne: "1 pending",
    // PR 28.4: student-grouped review
    studentListSubtitle: "Pick a student to see their pending answers",
    studentListEmpty: "Nobody waiting for feedback right now.",
    studentItemCount: "{n} answers",
    studentItemCountOne: "1 answer",
    backToList: "← All students",
    studentLabel: "Student",
    classLabel: "Class",
    deckLabel: "Deck",
    submittedLabel: "Submitted",
    questionLabel: "Question",
    studentAnswer: "Student's answer",
    expectedAnswer: "Expected",
    feedbackPlaceholder: "Optional feedback for the student…",
    btnCorrect: "Correct",
    btnPartial: "Partial",
    btnIncorrect: "Incorrect",
    shortcutHint: "Tip: press 1, 2 or 3 to grade quickly",
    undoToast: "Marked as {grade} — undo",
    undo: "Undo",
    saveError: "Could not save. Try again.",
    fetchError: "Could not load pending reviews.",
    minutesAgo: "{n} min ago",
    hoursAgo: "{n} h ago",
    daysAgo: "{n} d ago",
    justNow: "just now",
    gradeCorrect: "correct",
    gradePartial: "partial",
    gradeIncorrect: "incorrect",
    noAnswer: "(no answer submitted)",
  },
  es: {
    title: "Por revisar",
    subtitle: "Respuestas libres esperando tu revisión",
    backToHome: "Atrás",
    loading: "Cargando…",
    emptyTitle: "Todo al día",
    emptyHint: "Ahora ve y disfruta el café que te mereces.",
    filterAllClasses: "Todas las clases",
    filterByClass: "Clase",
    pendingCount: "{n} pendientes",
    pendingCountOne: "1 pendiente",
    // PR 28.4: student-grouped review
    studentListSubtitle: "Elegí un estudiante para ver sus respuestas pendientes",
    studentListEmpty: "Nadie esperando feedback ahora.",
    studentItemCount: "{n} respuestas",
    studentItemCountOne: "1 respuesta",
    backToList: "← Todos los estudiantes",
    studentLabel: "Estudiante",
    classLabel: "Clase",
    deckLabel: "Deck",
    submittedLabel: "Enviado",
    questionLabel: "Pregunta",
    studentAnswer: "Respuesta del estudiante",
    expectedAnswer: "Esperada",
    feedbackPlaceholder: "Feedback opcional para el estudiante…",
    btnCorrect: "Correcta",
    btnPartial: "Parcial",
    btnIncorrect: "Incorrecta",
    shortcutHint: "Tip: presiona 1, 2 o 3 para calificar rápido",
    undoToast: "Marcada como {grade} — deshacer",
    undo: "Deshacer",
    saveError: "No se pudo guardar. Probá de nuevo.",
    fetchError: "No se pudieron cargar las pendientes.",
    minutesAgo: "hace {n} min",
    hoursAgo: "hace {n} h",
    daysAgo: "hace {n} d",
    justNow: "recién",
    gradeCorrect: "correcta",
    gradePartial: "parcial",
    gradeIncorrect: "incorrecta",
    noAnswer: "(sin respuesta)",
  },
  ko: {
    title: "검토할 항목",
    subtitle: "확인이 필요한 자유 응답",
    backToHome: "뒤로",
    loading: "불러오는 중…",
    emptyTitle: "모두 완료",
    emptyHint: "이제 누리세요 — 잘 받은 커피 한 잔의 여유를.",
    filterAllClasses: "모든 수업",
    filterByClass: "수업",
    pendingCount: "{n}개 대기",
    pendingCountOne: "1개 대기",
    // PR 28.4: student-grouped review
    studentListSubtitle: "학생을 선택하면 대기 중인 답변이 표시됩니다",
    studentListEmpty: "지금 피드백을 기다리는 학생이 없습니다.",
    studentItemCount: "답변 {n}개",
    studentItemCountOne: "답변 1개",
    backToList: "← 모든 학생",
    studentLabel: "학생",
    classLabel: "수업",
    deckLabel: "덱",
    submittedLabel: "제출",
    questionLabel: "문제",
    studentAnswer: "학생 답변",
    expectedAnswer: "예상 답변",
    feedbackPlaceholder: "학생을 위한 선택적 피드백…",
    btnCorrect: "정답",
    btnPartial: "부분 정답",
    btnIncorrect: "오답",
    shortcutHint: "팁: 1, 2, 3 키로 빠르게 채점하세요",
    undoToast: "{grade}(으)로 표시됨 — 실행 취소",
    undo: "실행 취소",
    saveError: "저장할 수 없습니다. 다시 시도하세요.",
    fetchError: "대기 중인 검토 항목을 불러올 수 없습니다.",
    minutesAgo: "{n}분 전",
    hoursAgo: "{n}시간 전",
    daysAgo: "{n}일 전",
    justNow: "방금",
    gradeCorrect: "정답",
    gradePartial: "부분 정답",
    gradeIncorrect: "오답",
    noAnswer: "(답변 없음)",
  },
};

// Relative time helper. Avoids Intl.RelativeTimeFormat (browser quirks)
// — bucketed minutes/hours/days is enough for this UX.
function relativeTime(iso, t) {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutesAgo.replace("{n}", String(min));
  const hours = Math.floor(min / 60);
  if (hours < 24) return t.hoursAgo.replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  return t.daysAgo.replace("{n}", String(days));
}

// Build a string preview of the student's raw answer. Free-text always
// arrives as a string in `answer` jsonb. Open could be slightly different
// — defensively handle non-strings just in case.
function previewStudentAnswer(answer, t) {
  if (answer === null || answer === undefined) return t.noAnswer;
  if (typeof answer === "string") return answer.trim() ? answer : t.noAnswer;
  return JSON.stringify(answer);
}

// Lookup the question object given an index from a deck's questions array.
// Defensive against malformed decks (questions might be null/array-shaped
// differently). Returns null if not found.
function pickQuestion(deckQuestions, index) {
  if (!Array.isArray(deckQuestions)) return null;
  return deckQuestions[index] || null;
}

export default function Review({ profile, lang = "en", onOpenMobileMenu }) {
  const navigate = useNavigate();
  const t = i18n[lang] || i18n.en;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Each item: { response, session, deck, participant, question }
  // We hydrate it via one query with FK joins; see fetchPending below.
  const [items, setItems] = useState([]);
  // Per-row scratch state: feedback text the teacher has been typing,
  // keyed by response.id. Lives outside `items` so re-fetches don't blow
  // away half-typed feedback.
  const [feedbackById, setFeedbackById] = useState({});
  // Class filter: null = all, otherwise the class id.
  const [classFilter, setClassFilter] = useState(null);
  // Toast for the last grade — { id, grade, undoFn } or null.
  const [toast, setToast] = useState(null);
  // Anim hint per row when leaving the feed (0 → 1 → fade).
  const [leavingIds, setLeavingIds] = useState({});
  // Auto-scroll target: when we grade a card, the next one should come
  // into view. We track a ref by index so keyboard shortcuts can scroll.
  const cardRefs = useRef({});
  // Index of the "active" card for keyboard shortcuts. Defaults to 0
  // (the topmost / oldest pending). Updated when the user clicks a row.
  const [activeIdx, setActiveIdx] = useState(0);

  // PR 28.4: which student's responses are we drilling into?
  //
  // Synced with ?student=<participantId> in the URL so:
  //   - F5 keeps you in the same student's queue (consistent with
  //     SessionFlow's other URL-driven steps).
  //   - Browser back from the drilldown returns to the list.
  //
  // null = list view (show all students with pending counts).
  // string = detail view (show that student's pending cards).
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStudentId = searchParams.get("student") || null;
  const setSelectedStudentId = useCallback((id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("student", id);
    else next.delete("student");
    setSearchParams(next, { replace: false });
  }, [searchParams, setSearchParams]);

  // ── Fetch pending reviews ─────────────────────────────────────────────
  // The query: every responses row WHERE needs_review=true AND
  // teacher_grade IS NULL, joined to sessions (for class_id + deck_id),
  // session_participants (for student_name), decks (for title +
  // questions[]), and classes (for name). RLS filters automatically to
  // sessions owned by this teacher.
  //
  // We sort by created_at ascending so the oldest (= waiting longest)
  // bubbles to the top. Cap at 200 — anything more is a usage problem
  // we'd discover before solving here.
  const fetchPending = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("responses")
        .select(`
          id,
          session_id,
          participant_id,
          question_index,
          answer,
          created_at,
          session:sessions!inner (
            id,
            teacher_id,
            class_id,
            deck_id,
            class:classes ( id, name ),
            deck:decks ( id, title, questions )
          ),
          participant:session_participants!inner (
            id,
            student_name,
            guest_name,
            is_guest
          )
        `)
        .eq("needs_review", true)
        .is("teacher_grade", null)
        .order("created_at", { ascending: true })
        .limit(200);
      if (err) {
        setError(t.fetchError + " " + err.message);
        setItems([]);
        return;
      }
      const hydrated = (data || []).map((row) => {
        const q = pickQuestion(row.session?.deck?.questions, row.question_index);
        return {
          id: row.id,
          createdAt: row.created_at,
          answerRaw: row.answer,
          questionIndex: row.question_index,
          // The session may be null in pathological cases (RLS hid it).
          // We skip those rather than crash.
          sessionId: row.session_id,
          participantId: row.participant_id,
          studentName:
            (row.participant?.is_guest
              ? row.participant?.guest_name
              : row.participant?.student_name) || row.participant?.student_name || "",
          isGuest: !!row.participant?.is_guest,
          className: row.session?.class?.name || "",
          classId: row.session?.class?.id || null,
          deckTitle: row.session?.deck?.title || "",
          deckId: row.session?.deck?.id || null,
          question: q,
          questionType: q?.type || "free",
        };
      });
      setItems(hydrated);
    } catch (e) {
      setError(t.fetchError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t.fetchError]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // ── Class filter computed list ────────────────────────────────────────
  // PR 28.4: filteredItems is now downstream of TWO filters:
  //   1. classFilter (class dropdown, top of page)
  //   2. selectedStudentId (drilldown into one student)
  //
  // The list view ignores selectedStudentId — it groups across all
  // matching items into per-student buckets. The drilldown view uses
  // both filters together.
  const classFilteredItems = useMemo(() => {
    if (!classFilter) return items;
    return items.filter((it) => it.classId === classFilter);
  }, [items, classFilter]);

  const filteredItems = useMemo(() => {
    if (!selectedStudentId) return classFilteredItems;
    return classFilteredItems.filter((it) => it.participantId === selectedStudentId);
  }, [classFilteredItems, selectedStudentId]);

  // PR 28.4: per-student buckets for the list view. Keyed by
  // participant_id (which is unique per session participant — note
  // that the same physical student in two different sessions counts
  // as two separate "students" here; not ideal but matches how RLS
  // and the rest of the page already treat them).
  //
  // Sort order:
  //   1. By pending count, descending (more pending = higher in list)
  //   2. Tie-break: oldest waiting response first (keeps the spirit
  //      of the original "don't leave students hanging" feed)
  const studentGroups = useMemo(() => {
    const m = new Map();
    for (const it of classFilteredItems) {
      const key = it.participantId;
      if (!key) continue;
      if (!m.has(key)) {
        m.set(key, {
          participantId: key,
          studentName: it.studentName || t.studentLabel,
          isGuest: !!it.isGuest,
          className: it.className,
          items: [],
          oldestCreatedAt: it.createdAt,
        });
      }
      const g = m.get(key);
      g.items.push(it);
      // Track the earliest createdAt across the bucket for tie-break sorting
      if (it.createdAt < g.oldestCreatedAt) g.oldestCreatedAt = it.createdAt;
    }
    return Array.from(m.values()).sort((a, b) => {
      const byCount = b.items.length - a.items.length;
      if (byCount !== 0) return byCount;
      // Older oldestCreatedAt → bubble up
      return a.oldestCreatedAt < b.oldestCreatedAt ? -1 : 1;
    });
  }, [classFilteredItems, t.studentLabel]);

  // Set of classes seen in the data — populates the filter dropdown.
  const classOptions = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      if (it.classId && it.className && !m.has(it.classId)) {
        m.set(it.classId, it.className);
      }
    }
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // PR 28.4 (X): when the drilled-into student runs out of pending
  // responses, auto-return to the list view.
  //
  // We DON'T gate this on the undo toast — the toast is a fixed
  // overlay, it stays reachable whether we're in the list or the
  // detail view. Staying in an empty student detail view would be
  // confusing ("why am I looking at nothing?"), so we always go back.
  //
  // Also: if the selectedStudentId doesn't match any group at all (the
  // teacher reloaded after the student's queue was cleared, or the URL
  // was bookmarked), bounce back so the page doesn't render an empty
  // detail view permanently.
  useEffect(() => {
    if (!selectedStudentId) return;
    if (loading) return; // wait for data; don't bounce mid-fetch
    const stillHasItems = studentGroups.some(
      (g) => g.participantId === selectedStudentId && g.items.length > 0
    );
    if (!stillHasItems) {
      setSelectedStudentId(null);
    }
  }, [selectedStudentId, studentGroups, loading, setSelectedStudentId]);

  // ── Grade handler ─────────────────────────────────────────────────────
  // Takes a response id + a 'correct'|'partial'|'incorrect' grade.
  // 1) Optimistic UI: mark the row as leaving (200ms slide-up) then
  //    remove from items.
  // 2) DB update with the grade + feedback.
  // 3) Toast with undo for 5s. Undo restores the row to the feed.
  // 4) On error, refetch (keeps state honest).
  const gradeResponse = async (item, grade) => {
    const points = teacherGradeToPoints(grade);
    if (!points) return; // unknown grade, defensive
    const feedbackText = (feedbackById[item.id] || "").trim() || null;

    // Optimistic remove with a quick slide-up animation.
    setLeavingIds((p) => ({ ...p, [item.id]: true }));
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      setLeavingIds((p) => {
        const { [item.id]: _, ...rest } = p;
        return rest;
      });
    }, 220);

    // Remember the previous values so we can undo cleanly.
    const undoSnapshot = { item, prevFeedback: feedbackById[item.id] || "" };

    // DB update. We write teacher_grade + teacher_feedback + points +
    // is_correct (synced) + graded_at + graded_by. Spaced-repetition
    // reads is_correct so this keeps that working.
    const { error: updErr } = await supabase
      .from("responses")
      .update({
        teacher_grade: grade,
        teacher_feedback: feedbackText,
        points: points.points,
        is_correct: points.isCorrect,
        graded_at: new Date().toISOString(),
        graded_by: profile?.id || null,
      })
      .eq("id", item.id);

    if (updErr) {
      // Revert: refetch to be safe.
      setError(t.saveError);
      fetchPending();
      return;
    }

    // Setup the undo toast.
    const gradeLabel =
      grade === "correct"
        ? t.gradeCorrect
        : grade === "partial"
        ? t.gradePartial
        : t.gradeIncorrect;
    const undoFn = async () => {
      // Re-insert into the local list (re-fetch is cleanest because we
      // need it sorted properly).
      const { error: undoErr } = await supabase
        .from("responses")
        .update({
          teacher_grade: null,
          teacher_feedback: null,
          points: 0,
          // Reset is_correct to true (the "ungraded counts as
          // participation" default we use everywhere else).
          is_correct: true,
          graded_at: null,
          graded_by: null,
        })
        .eq("id", item.id);
      if (undoErr) {
        setError(t.saveError);
        return;
      }
      // Restore the feedback text the teacher had typed.
      setFeedbackById((p) => ({ ...p, [item.id]: undoSnapshot.prevFeedback }));
      fetchPending();
      setToast(null);
    };
    setToast({ id: item.id, grade: gradeLabel, undoFn, shownAt: Date.now() });
    // Auto-dismiss toast after 5s. We compare shownAt to avoid clobbering
    // a newer toast that arrived in the meantime.
    setTimeout(() => {
      setToast((curr) => (curr && curr.shownAt === undoSnapshot.shownAt ? null : curr));
    }, 5000);
  };

  // ── Keyboard shortcuts: 1 / 2 / 3 grade the active card ───────────────
  useEffect(() => {
    const onKey = (e) => {
      // Ignore keypresses while typing in inputs/textareas.
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if (filteredItems.length === 0) return;
      const idx = Math.min(activeIdx, filteredItems.length - 1);
      const item = filteredItems[idx];
      if (!item) return;
      if (e.key === "1") {
        e.preventDefault();
        gradeResponse(item, "correct");
      } else if (e.key === "2") {
        e.preventDefault();
        gradeResponse(item, "partial");
      } else if (e.key === "3") {
        e.preventDefault();
        gradeResponse(item, "incorrect");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredItems, activeIdx]); // gradeResponse closes over these

  // ── Render ────────────────────────────────────────────────────────────
  // PR 28.4: two notions of "pending total":
  //   - globalPending: across the class filter, ignoring drilldown.
  //     Used by the ☕ empty state ("nothing to do at all").
  //   - pendingTotal: post-drilldown count. Used by the count badge
  //     in the filter row.
  const globalPending = classFilteredItems.length;
  const pendingTotal = filteredItems.length;

  return (
    <div style={{ padding: "28px 20px 80px", fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @keyframes rv-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rv-slideUp { from { opacity: 1; transform: translateY(0); max-height: 600px; } to { opacity: 0; transform: translateY(-12px); max-height: 0; padding: 0; margin: 0; } }
        .rv-card { animation: rv-fadeUp .25s ease both; }
        .rv-leaving { animation: rv-slideUp .22s ease forwards; overflow: hidden; }
      `}</style>

      <PageHeader
        title={t.title}
        lang={lang}
        maxWidth={760}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* PR 28.4: subtitle reads differently in list vs drilldown.
            In list mode it's a CTA ("pick a student"); in drilldown
            it stays out of the way (the cards carry the meaning). */}
        <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 18px", lineHeight: 1.5 }}>
          {selectedStudentId ? t.subtitle : t.studentListSubtitle}
        </p>

        {/* PR 28.4: back-to-list button + selected student header,
            only when drilled into a student. */}
        {selectedStudentId && (() => {
          const currentGroup = studentGroups.find(g => g.participantId === selectedStudentId);
          const studentName = currentGroup?.studentName || t.studentLabel;
          const className = currentGroup?.className || "";
          return (
            <div style={{ marginBottom: 14 }}>
              <button
                onClick={() => setSelectedStudentId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 0",
                  fontFamily: "'Outfit',sans-serif",
                  marginBottom: 8,
                }}
              >
                {t.backToList}
              </button>
              <div style={{
                fontSize: 18, fontWeight: 700, color: C.text,
                display: "flex", alignItems: "center", gap: 10,
                flexWrap: "wrap",
              }}>
                <CIcon name="student" size={20} inline />
                {studentName}
                {className && (
                  <span style={{
                    fontSize: 12, fontWeight: 500, color: C.textMuted,
                    background: C.bgSoft, padding: "2px 8px",
                    borderRadius: 999,
                  }}>
                    {className}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Filter row + count */}
        <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 18, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{t.filterByClass}:</span>
          <select
            value={classFilter || ""}
            onChange={(e) => setClassFilter(e.target.value || null)}
            style={{
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
            }}
          >
            <option value="">{t.filterAllClasses}</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {pendingTotal > 0 && (
          <span style={{
            fontSize: 12, color: C.accent, background: C.accentSoft,
            padding: "4px 10px", borderRadius: 999, fontWeight: 600,
          }}>
            {pendingTotal === 1
              ? t.pendingCountOne
              : t.pendingCount.replace("{n}", String(pendingTotal))}
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", color: C.textMuted, padding: "40px 0", fontSize: 14 }}>
          {t.loading}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{
          background: C.redSoft, color: C.red, padding: "10px 14px",
          borderRadius: 8, fontSize: 13, marginBottom: 14, lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      {/* Empty state — only when there's truly nothing to grade across
          the whole filtered scope. PR 28.4: uses globalPending (not
          pendingTotal) so we don't flash "all caught up" the instant
          a student's last response is graded — the useEffect will
          bounce us back to the list and the user sees the list with
          one fewer student instead. */}
      {!loading && !error && globalPending === 0 && (
        <div className="rv-card" style={{
          textAlign: "center", padding: "60px 20px",
          background: C.bg, border: `1px dashed ${C.border}`,
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>☕</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: C.text }}>
            {t.emptyTitle}
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {t.emptyHint}
          </p>
        </div>
      )}

      {/* PR 28.4: student list view (no drilldown selected).
          One row per student with their pending count badge.
          Click → ?student=<id> → drilldown into their cards. */}
      {!loading && !error && !selectedStudentId && globalPending > 0 && (
        <div>
          {studentGroups.map((g) => (
            <button
              key={g.participantId}
              onClick={() => setSelectedStudentId(g.participantId)}
              className="rv-card"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                marginBottom: 10,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Outfit',sans-serif",
                transition: "border-color .15s ease, background .15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.accent + "66";
                e.currentTarget.style.background = C.bgSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = C.bg;
              }}
            >
              <CIcon name="student" size={20} inline />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: C.text,
                  marginBottom: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {g.studentName}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {g.className}
                </div>
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 28, height: 24, padding: "0 9px",
                background: C.accent, color: "#fff",
                borderRadius: 999,
                fontSize: 12, fontWeight: 700,
              }}>
                {g.items.length === 1
                  ? t.studentItemCountOne
                  : t.studentItemCount.replace("{n}", String(g.items.length))}
              </span>
              <span style={{ fontSize: 18, color: C.textMuted, marginLeft: 2 }}>›</span>
            </button>
          ))}
        </div>
      )}

      {/* Cards — only shown in drilldown view. PR 28.4: gated on
          selectedStudentId; before it ran any time there were items. */}
      {!loading && !error && selectedStudentId && filteredItems.map((item, idx) => {
        const expected = describeCorrectAnswer(item.question, item.questionType);
        const isLeaving = !!leavingIds[item.id];
        const isActive = idx === activeIdx;
        return (
          <div
            key={item.id}
            ref={(el) => { cardRefs.current[item.id] = el; }}
            onClick={() => setActiveIdx(idx)}
            className={`rv-card ${isLeaving ? "rv-leaving" : ""}`}
            style={{
              background: C.bg,
              border: `1px solid ${isActive ? C.accent + "55" : C.border}`,
              borderLeft: `3px solid ${C.accent}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              boxShadow: isActive ? `0 0 0 2px ${C.accent}1a` : "none",
              transition: "border-color .15s ease, box-shadow .15s ease",
            }}
          >
            {/* Top meta row: class · deck · student · time */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
              fontSize: 11, color: C.textMuted, marginBottom: 10,
            }}>
              {item.className && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CIcon name="study" size={14} inline /> {item.className}
                </span>
              )}
              {item.deckTitle && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CIcon name="book" size={14} inline /> {item.deckTitle}
                </span>
              )}
              {item.studentName && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.text, fontWeight: 600 }}>
                  <CIcon name="student" size={14} inline /> {item.studentName}
                </span>
              )}
              <span style={{ marginLeft: "auto" }}>
                {relativeTime(item.createdAt, t)}
              </span>
            </div>

            {/* The question */}
            {item.question && (
              <div style={{
                fontSize: 14, color: C.text, fontWeight: 600,
                lineHeight: 1.45, marginBottom: 10,
              }}>
                {item.question.q || item.question.prompt || ""}
              </div>
            )}

            {/* Optional expected answer (rare for free-text but possible
                if the teacher wrote one in the deck editor). Helps the
                teacher remember what they were aiming for. */}
            {expected && (
              <div style={{
                fontSize: 12, color: C.textMuted, marginBottom: 10,
                padding: "6px 10px", background: C.bgSoft,
                borderRadius: 6,
              }}>
                <strong style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 6 }}>
                  {t.expectedAnswer}:
                </strong>
                {expected}
              </div>
            )}

            {/* Student's answer — the actual content to grade */}
            <div style={{
              padding: "10px 12px",
              background: C.bgSoft,
              borderRadius: 8,
              fontSize: 13.5,
              color: C.text,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              marginBottom: 12,
              minHeight: 40,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: C.textMuted, marginBottom: 4,
              }}>
                {t.studentAnswer}
              </div>
              {previewStudentAnswer(item.answerRaw, t)}
            </div>

            {/* Feedback textarea */}
            <textarea
              value={feedbackById[item.id] || ""}
              onChange={(e) => setFeedbackById((p) => ({ ...p, [item.id]: e.target.value }))}
              placeholder={t.feedbackPlaceholder}
              rows={2}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontFamily: "'Outfit',sans-serif",
                fontSize: 13,
                background: C.bg,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                outline: "none",
                resize: "vertical",
                marginBottom: 12,
                boxSizing: "border-box",
              }}
            />

            {/* Action buttons — 3 colored CTAs.
                On mobile they wrap; on desktop they stay in a row.
                Keyboard shortcuts (1/2/3) still work but they're not
                advertised in the UI — the colors and labels carry the
                meaning, no need to clutter the buttons with kbd badges. */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => gradeResponse(item, "correct")}
                style={{
                  flex: 1, minWidth: 100,
                  padding: "10px 14px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  background: C.green, color: "#fff",
                  border: "none", cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                ✓ {t.btnCorrect}
              </button>
              <button
                onClick={() => gradeResponse(item, "partial")}
                style={{
                  flex: 1, minWidth: 100,
                  padding: "10px 14px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  background: C.orange, color: "#fff",
                  border: "none", cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                ~ {t.btnPartial}
              </button>
              <button
                onClick={() => gradeResponse(item, "incorrect")}
                style={{
                  flex: 1, minWidth: 100,
                  padding: "10px 14px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  background: C.red, color: "#fff",
                  border: "none", cursor: "pointer",
                  fontFamily: "'Outfit',sans-serif",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                ✗ {t.btnIncorrect}
              </button>
            </div>
          </div>
        );
      })}

      {/* Undo toast — fixed bottom-right on desktop, full-width on mobile */}
      {toast && (
        <div
          className="rv-card"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.text,
            color: C.bg,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 8px 24px rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 1000,
            maxWidth: "calc(100vw - 32px)",
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          <span>{t.undoToast.replace("{grade}", toast.grade)}</span>
          <button
            onClick={() => toast.undoFn && toast.undoFn()}
            style={{
              background: "transparent",
              color: C.accent,
              border: "none",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {t.undo}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

// (kbdStyle removed — keyboard shortcuts still work in the keydown
// handler but are no longer advertised in the UI per design feedback.
// Colors + ✓ ~ ✗ symbols carry enough meaning.)
