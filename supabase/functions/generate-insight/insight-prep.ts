// ─── insight-prep.ts ────────────────────────────────────────────────────
//
// Pure function: takes raw session data, returns weak-point candidates.
// No DB calls, no AI calls. Lives inside the Edge Function so it can
// run in Deno.
//
// Thresholds chosen deliberately:
//   - MIN_FAIL_PCT 30: a question where 30%+ failed is worth surfacing.
//     Below that, it's noise within normal class variance.
//   - MIN_FAIL_COUNT 3: at least 3 students failed (absolute count).
//     A 100% fail rate on a 2-student session is statistical garbage.
//   - MAX_WEAK_POINTS 2: forces priority. If 3+ questions are weak,
//     the close-unit narrative will catch the broader pattern.
//   - MAX_TOP_FAILERS 3: shown in the expand panel, enough for the
//     teacher to know who to follow up with.

const MIN_FAIL_PCT = 30;
const MIN_FAIL_COUNT = 3;
const MAX_WEAK_POINTS = 2;
const MAX_TOP_FAILERS = 3;

export interface Question {
  id: string;
  text: string;
  correct_answer: string | null;
  type: string;
}

export interface Response {
  question_id: string;
  participant_id: string;
  is_correct: boolean | null;
}

export interface Participant {
  id: string;
  name: string;
}

export interface TopFailer {
  participant_id: string;
  name: string;
  wrong: number;
  total: number;
}

export interface Candidate {
  question_id: string;
  question_text: string;
  correct_answer: string | null;
  fail_pct: number;
  fail_count: number;
  total: number;
  top_failers: TopFailer[];
}

/**
 * Build weak-point candidates from raw session data.
 * Returns up to MAX_WEAK_POINTS candidates, sorted by severity (fail_pct desc).
 * Excludes:
 *   - Responses with is_correct = null (free-text not yet graded)
 *   - Questions where fail_pct < threshold or fail_count < min
 */
export function buildCandidates(
  questions: Question[],
  responses: Response[],
  participants: Participant[],
): Candidate[] {
  const participantMap = new Map(participants.map((p) => [p.id, p.name]));

  // Filter out ungraded responses (is_correct === null). Free-text questions
  // not yet graded shouldn't influence the insight. The teacher can grade
  // them later, but this snapshot is from the moment of session close.
  const gradedResponses = responses.filter((r) => r.is_correct !== null);

  const stats: Candidate[] = questions.map((q) => {
    const qResponses = gradedResponses.filter((r) => r.question_id === q.id);
    const wrong = qResponses.filter((r) => r.is_correct === false);
    const total = qResponses.length;
    const failCount = wrong.length;
    const failPct = total > 0 ? Math.round((failCount / total) * 100) : 0;

    // Build per-participant fail tallies. In v1 we assume one response
    // per participant per question; if the quiz allows retries the map
    // accumulates them, which is the right behavior for "who failed most".
    const failersByParticipant = new Map<string, { wrong: number; total: number }>();
    wrong.forEach((r) => {
      const prev = failersByParticipant.get(r.participant_id) ||
        { wrong: 0, total: 0 };
      failersByParticipant.set(r.participant_id, {
        wrong: prev.wrong + 1,
        total: prev.total + 1,
      });
    });

    const topFailers: TopFailer[] = Array.from(failersByParticipant.entries())
      .map(([pid, counts]) => ({
        participant_id: pid,
        name: participantMap.get(pid) || "Unknown",
        wrong: counts.wrong,
        total: counts.total,
      }))
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, MAX_TOP_FAILERS);

    return {
      question_id: q.id,
      question_text: q.text,
      correct_answer: q.correct_answer,
      fail_pct: failPct,
      fail_count: failCount,
      total,
      top_failers: topFailers,
    };
  });

  // Apply thresholds
  const passing = stats.filter(
    (s) => s.fail_pct >= MIN_FAIL_PCT && s.fail_count >= MIN_FAIL_COUNT,
  );

  // Sort by severity: fail_pct desc, fail_count desc as tiebreaker
  passing.sort((a, b) => {
    if (b.fail_pct !== a.fail_pct) return b.fail_pct - a.fail_pct;
    return b.fail_count - a.fail_count;
  });

  return passing.slice(0, MAX_WEAK_POINTS);
}

export { MIN_FAIL_PCT, MIN_FAIL_COUNT, MAX_WEAK_POINTS, MAX_TOP_FAILERS };
