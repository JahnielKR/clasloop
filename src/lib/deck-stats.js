// ─── Deck stats — RPC wrapper + UI helpers ─────────────────────────────
// Powers /decks/:id/results. The heavy aggregation runs server-side via
// the deck_question_stats() Postgres function (see migration file).
// Here we just call it, normalize the result a bit, and provide UI-only
// helpers (sorting MCQ distribution by frequency, picking the dominant
// wrong answer, etc.).

import { supabase } from "./supabase";

// Fetch aggregated stats for a deck, optionally filtered by class.
//
// Returns { rows, error }:
//   rows: array of { questionIndex, totalResponses, correctCount,
//                    partialCount, incorrectCount, pendingReviewCount,
//                    avgTimeMs, answerDistribution }
//         — one entry per question_index that has responses.
//   error: string error message, or null on success.
//
// Questions with zero responses are NOT in the array — the page renders
// them with a "no data yet" placeholder.
export async function fetchDeckQuestionStats({ deckId, classId = null }) {
  if (!deckId) return { rows: [], error: "Missing deck id" };

  const { data, error } = await supabase.rpc("deck_question_stats", {
    p_deck_id: deckId,
    p_class_id: classId,
  });

  if (error) {
    return { rows: [], error: error.message || "Failed to load stats" };
  }

  // Normalize key names to camelCase for the UI.
  const rows = (data || []).map((r) => ({
    questionIndex: r.question_index,
    totalResponses: r.total_responses,
    correctCount: r.correct_count,
    partialCount: r.partial_count,
    incorrectCount: r.incorrect_count,
    pendingReviewCount: r.pending_review_count,
    avgTimeMs: r.avg_time_ms || 0,
    answerDistribution: r.answer_distribution || {},
  }));

  return { rows, error: null };
}

// ─── Helpers for the UI ─────────────────────────────────────────────────

// Compute % correct from a stat row. Counts ungraded pending answers as
// "not correct yet" for the percentage — we don't want to inflate a
// score with answers the teacher hasn't reviewed. The page surfaces
// pendingReviewCount separately so the teacher can see "78% correct,
// 5 pending" rather than "78% with 5 unrelated mystery answers".
//
// Returns a number 0..100, or null if no responses at all.
export function pctCorrect(row) {
  if (!row || !row.totalResponses) return null;
  // partial counts as half-credit toward % correct, since pedagogically
  // it's "kind of got it". Tweak this if the teacher prefers a stricter
  // "only full credit counts" calculation.
  const credited = row.correctCount + row.partialCount * 0.5;
  return Math.round((credited / row.totalResponses) * 100);
}

// Color the percentage circle by tier — same thresholds the rest of the
// app uses for retention scores.
//   ≥80 green : the class got it
//   ≥50 orange: mixed, worth re-teaching some
//   <50 red   : needs serious re-teaching
export function pctColor(pct, palette) {
  if (pct == null) return palette.textMuted;
  if (pct >= 80) return palette.green;
  if (pct >= 50) return palette.orange;
  return palette.red;
}

// Turn an MCQ/TF answer key into a display label using the question's
// own option list. For MCQ: "0" → options[0].text. For TF: "true"/"false".
// Returns the original key as fallback when nothing better is available.
export function labelForAnswerKey(key, question, type) {
  if (key == null) return "";
  if (type === "mcq") {
    const opts = Array.isArray(question?.options) ? question.options : [];
    const idx = parseInt(key, 10);
    if (!Number.isNaN(idx) && opts[idx] != null) {
      const o = opts[idx];
      if (typeof o === "string") return o;
      if (typeof o === "object") return o.text || "(image)";
    }
    return String(key);
  }
  if (type === "tf") {
    if (key === "true") return "True";
    if (key === "false") return "False";
    return String(key);
  }
  return String(key);
}

// Sort distribution entries by count descending. Returns
// [{ key, count, percent, isCorrect }].
//
// `correctKeys` is a Set of the keys (as strings) that count as correct
// for this question. The UI uses `isCorrect` to color the bar green vs
// red. For MCQ with q.correct=2, the set is {"2"}; for multi-correct
// MCQ where q.correct=[0,2], we don't try to mark the correct keys (the
// ground truth is the SET, not any single option index seen in
// distribution). In that case we just leave isCorrect=null and the UI
// renders neutral bars.
export function sortedDistribution(distribution, correctKeys) {
  const entries = Object.entries(distribution || {});
  if (entries.length === 0) return [];
  const total = entries.reduce((a, [, c]) => a + c, 0);
  const sorted = entries
    .map(([key, count]) => ({
      key,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
      isCorrect: correctKeys ? correctKeys.has(String(key)) : null,
    }))
    .sort((a, b) => b.count - a.count);
  return sorted;
}

// Convenience: build the correctKeys Set for the simple cases the UI
// can reason about (MCQ single, TF). Returns null when we can't easily
// derive a single-option correct set (multi-correct MCQ, free-text,
// match, order, etc.) — the UI will render neutral bars.
export function correctKeysForQuestion(question, type) {
  if (!question) return null;
  if (type === "mcq" && !Array.isArray(question.correct)) {
    return new Set([String(question.correct)]);
  }
  if (type === "tf") {
    return new Set([String(question.correct === true)]);
  }
  return null;
}

// Format an avg ms as "X.Xs" or "Xs". For brief glances; the precision
// doesn't matter beyond a tenth of a second.
export function formatAvgTime(ms) {
  if (!ms || ms <= 0) return "—";
  const sec = ms / 1000;
  if (sec < 10) return sec.toFixed(1) + "s";
  return Math.round(sec) + "s";
}
