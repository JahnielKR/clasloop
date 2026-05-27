// ─── Scoring — single source of truth for per-question grading ──────────
// Used by StudentJoin (when the student submits an answer), by the
// teacher's To Review page (when grading free-text), and by the per-deck
// analytics view (when computing class averages).
//
// PR 83: migrado a TypeScript. La lógica de scoring no cambió — solo
// agregamos tipos para que el compilador atrape errores cuando otro
// código llame estas funciones con datos mal formados.
//
// SCORING POLICY (decided with the teacher):
//   - MCQ / TF / Slider / Fill   → 1 point if correct, else 0.       max=1
//   - Match  (N pairs)            → 1 point per correct pair.         max=N
//   - Order  (N items)            → 1 point per item in correct slot. max=N
//   - Sentence                    → 1 point if all checks pass.       max=1
//   - Free / Open                 → needs teacher review:             max=2
//                                     correct=2, partial=1, incorrect=0
//
// No negative points, no fractions. Match/Order minimum is 0 even if
// every item is wrong — wrong feedback ≠ punishment.

// ─── Types ──────────────────────────────────────────────────────────────

/** All question types supported by Clasloop. */
export type QuestionType =
  | "mcq"
  | "tf"
  | "fill"
  | "order"
  | "match"
  | "free"
  | "open"
  | "sentence"
  | "slider";

/**
 * Shape of a question object. Fields are optional because each type uses
 * only a subset (mcq uses correct+options; match uses pairs; etc).
 *
 * Marked loosely on purpose: questions come from a JSON column in
 * Supabase, so we can't promise more structure than this at the type
 * level. evaluateAnswer + describeCorrectAnswer narrow per-type with
 * Array.isArray / typeof checks at runtime.
 */
export interface Question {
  /** MCQ: index (number) or set of indices (number[]) of correct option(s). TF: boolean. Slider: number. */
  correct?: unknown;
  /** MCQ options. Plain string OR {text, image_url}. */
  options?: Array<string | { text?: string; image_url?: string }>;
  /** Fill-in-the-blank canonical answer. */
  answer?: string;
  /** Fill alternatives accepted as correct (string list). */
  alternatives?: string[];
  /** Order: canonical correct order. */
  items?: string[];
  /** Match: array of {left, right} canonical pairs. */
  pairs?: Array<{ left: string; right: string }>;
  /** Sentence: required word the student must include. */
  required_word?: string;
  /** Sentence: minimum word count to be considered valid. Defaults to 3. */
  min_words?: number;
  /** Slider: tolerance (±) for considering the student's value correct. */
  tolerance?: number;
}

/** Result of evaluating a student's answer to a single question. */
export interface EvaluationResult {
  /** Earned points. For Match/Order this is per-pair/per-position. */
  points: number;
  /** Maximum possible points for this question. */
  maxPoints: number;
  /**
   * Whether the student got the WHOLE question right.
   * `null` only for free/open answers awaiting teacher review.
   */
  isCorrect: boolean | null;
  /** What to persist to the DB (jsonb-safe; never null/undefined). */
  stored: unknown;
  /** True if a teacher must manually grade this answer. */
  needsReview: boolean;
}

/** Teacher's manual grade choice for free/open answers. */
export type TeacherGrade = "correct" | "partial" | "incorrect";

/** Result of converting a teacher grade to points. */
export interface TeacherGradeResult {
  points: number;
  isCorrect: boolean;
}

/**
 * Local-state record from StudentJoin's answers array. Includes the
 * raw input value the student actually saw on screen.
 */
export interface AnswerEntry {
  isCorrect: boolean | null;
  raw: unknown;
  points?: number;
  maxPoints?: number;
  needsReview?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Normalize a fill-in-the-blank string for comparison: strip accents,
 * lowercase, collapse whitespace.
 */
function normFill(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * MCQ options can be plain strings or `{text, image_url}` objects.
 * Render the text part. Image-only options fall back to `"(image)"`.
 */
function stringifyOption(opt: unknown): string {
  if (opt == null) return "";
  if (typeof opt === "string") return opt;
  if (typeof opt === "object") {
    const o = opt as { text?: unknown; image_url?: unknown };
    if (o.text) return String(o.text);
    if (o.image_url) return "(image)";
  }
  return String(opt);
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Evaluate a student's raw answer against the canonical question.
 *
 * `isCorrect` (boolean) is kept for backwards compatibility with code
 * that hasn't migrated to points yet (spaced-repetition, live session
 * percentage display). For graded types it equals (points === maxPoints).
 * For needsReview types, isCorrect is `null` until the teacher decides
 * — call sites that need a boolean treat null as "ungraded, count as
 * participation" (StudentJoin's existing pattern).
 */
export function evaluateAnswer(
  q: Question,
  type: QuestionType | string,
  raw: unknown,
): EvaluationResult {
  // Empty submission. Free-text still counts as submitted (ungraded);
  // everything else is a 0/maxPoints depending on the type's max.
  if (
    raw === null ||
    raw === undefined ||
    (Array.isArray(raw) && raw.length === 0)
  ) {
    if (type === "free" || type === "open") {
      return {
        points: 0,
        maxPoints: 2,
        isCorrect: null,
        stored: "",
        needsReview: true,
      };
    }
    // For all other types, an empty submission is wrong. Max stays at 1
    // for simple types; Match/Order keep their full max so 0/4 is honest.
    const maxForEmpty =
      type === "match" || type === "order"
        ? Math.max(q.pairs?.length || q.items?.length || 1, 1)
        : 1;
    return {
      points: 0,
      maxPoints: maxForEmpty,
      isCorrect: false,
      // PR 24.4.5: was `null`, which serializes to SQL NULL via
      // supabase-js and violates the `answer jsonb NOT NULL` constraint
      // on responses. Result: 400 (Bad Request) on every timer-expiry
      // submit. Use empty string so the upsert succeeds while still
      // signaling "no submission" to the teacher review screen.
      stored: "",
      needsReview: false,
    };
  }

  switch (type) {
    case "tf": {
      const ok = raw === q.correct;
      return {
        points: ok ? 1 : 0,
        maxPoints: 1,
        isCorrect: ok,
        stored: raw,
        needsReview: false,
      };
    }

    case "fill": {
      const candidates = [
        q.answer,
        ...(Array.isArray(q.alternatives) ? q.alternatives : []),
      ]
        .filter(Boolean)
        .map(normFill);
      const ok = candidates.includes(normFill(raw));
      return {
        points: ok ? 1 : 0,
        maxPoints: 1,
        isCorrect: ok,
        stored: String(raw),
        needsReview: false,
      };
    }

    case "order": {
      // Per-position scoring: 1 point per item in the correct slot.
      const items = q.items || [];
      const arr: unknown[] = Array.isArray(raw) ? raw : [];
      let correctSlots = 0;
      for (let i = 0; i < items.length; i++) {
        if (arr[i] === items[i]) correctSlots++;
      }
      const max = Math.max(items.length, 1);
      const ok = correctSlots === max && arr.length === max;
      return {
        points: correctSlots,
        maxPoints: max,
        isCorrect: ok,
        stored: arr,
        needsReview: false,
      };
    }

    case "match": {
      // Per-pair scoring: 1 point per pair where left → right matches.
      const pairs = q.pairs || [];
      let correctPairs = 0;
      if (raw && typeof raw === "object") {
        const rawObj = raw as Record<string, unknown>;
        for (const p of pairs) {
          if (rawObj[p.left] === p.right) correctPairs++;
        }
      }
      const max = Math.max(pairs.length, 1);
      const ok = correctPairs === max && pairs.length > 0;
      return {
        points: correctPairs,
        maxPoints: max,
        isCorrect: ok,
        stored: raw,
        needsReview: false,
      };
    }

    case "free":
    case "open": {
      // Teacher reviews these. We store the answer and mark it pending —
      // points stay at 0/2 until the teacher grades. isCorrect is null
      // (not false!) so the existing "ungraded counts as participation"
      // logic in spaced-repetition + UI still works.
      return {
        points: 0,
        maxPoints: 2,
        isCorrect: null,
        stored: String(raw),
        needsReview: true,
      };
    }

    case "sentence": {
      // Sentence Builder: pass if it contains the required word AND
      // meets the min word count. All-or-nothing for now.
      const text = String(raw || "");
      const required = String(q.required_word || "").trim().toLowerCase();
      // Coerce min_words (may arrive as a numeric string from a JSON column or
      // AI output), the way the slider case coerces its numbers; fall back to 3.
      const mw = Number(q.min_words);
      const minWords = Number.isFinite(mw) ? mw : 3;
      const wordCount = (text.trim().match(/\S+/g) || []).length;
      const containsRequired = required
        ? text.toLowerCase().includes(required)
        : true;
      const ok = containsRequired && wordCount >= minWords;
      return {
        points: ok ? 1 : 0,
        maxPoints: 1,
        isCorrect: ok,
        stored: text,
        needsReview: false,
      };
    }

    case "slider": {
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        return {
          points: 0,
          maxPoints: 1,
          isCorrect: false,
          stored: null,
          needsReview: false,
        };
      }
      const target = Number(q.correct);
      const tol = Math.max(0, Number(q.tolerance) || 0);
      const ok = Math.abs(value - target) <= tol;
      return {
        points: ok ? 1 : 0,
        maxPoints: 1,
        isCorrect: ok,
        stored: value,
        needsReview: false,
      };
    }

    case "mcq":
    default: {
      // Multi-correct: q.correct is an array → require exact set match
      // (no partial credit on multi-MCQ — pedagogically common).
      if (Array.isArray(q.correct)) {
        const got: unknown[] = Array.isArray(raw) ? raw : [raw];
        const need = q.correct;
        const ok =
          got.length === need.length && got.every((v) => need.includes(v));
        return {
          points: ok ? 1 : 0,
          maxPoints: 1,
          isCorrect: ok,
          stored: got,
          needsReview: false,
        };
      }
      const ok = raw === q.correct;
      return {
        points: ok ? 1 : 0,
        maxPoints: 1,
        isCorrect: ok,
        stored: raw,
        needsReview: false,
      };
    }
  }
}

// ─── Teacher grade → points ─────────────────────────────────────────────
// Used by the To Review page to convert the teacher's 3-button choice
// into the (points, isCorrect) pair we persist.

export function teacherGradeToPoints(
  grade: TeacherGrade | string,
): TeacherGradeResult | null {
  switch (grade) {
    case "correct":
      return { points: 2, isCorrect: true };
    case "partial":
      return { points: 1, isCorrect: true }; // partial counts as participation
    case "incorrect":
      return { points: 0, isCorrect: false };
    default:
      return null; // ungraded
  }
}

// ─── Build the canonical "correct answer" view for the review screen ────
// The student's end-of-session "see correct answers" view needs a
// human-readable representation of what the right answer was for each
// question type. Returns null for types that need teacher review (UI
// shows "pending review" instead of a correct answer).

export function describeCorrectAnswer(
  q: Question,
  type: QuestionType | string,
): string | null {
  switch (type) {
    case "mcq": {
      const opts = Array.isArray(q.options) ? q.options : [];
      if (Array.isArray(q.correct)) {
        return q.correct
          .map((i) => stringifyOption(opts[i as number]))
          .filter(Boolean)
          .join(", ");
      }
      return (
        stringifyOption(opts[q.correct as number]) || String(q.correct ?? "")
      );
    }
    case "tf":
      return q.correct === true
        ? "True"
        : q.correct === false
          ? "False"
          : String(q.correct ?? "");
    case "fill":
      return [q.answer, ...(Array.isArray(q.alternatives) ? q.alternatives : [])]
        .filter(Boolean)
        .join(" / ");
    case "order":
      return Array.isArray(q.items) ? q.items.join(" \u2192 ") : "";
    case "match":
      return Array.isArray(q.pairs)
        ? q.pairs.map((p) => `${p.left} \u2192 ${p.right}`).join(", ")
        : "";
    case "sentence":
      return q.required_word
        ? `(must include "${q.required_word}")`
        : "(open sentence)";
    case "slider": {
      const t = Number(q.correct);
      const tol = Number(q.tolerance) || 0;
      return tol > 0 ? `${t} (\u00B1${tol})` : String(t);
    }
    case "free":
    case "open":
    default:
      return null;
  }
}

// ─── Format the student's answer for the review screen ──────────────────
// `answerEntry` is the local-state record from the answers array:
// { isCorrect, raw, points, maxPoints, needsReview }. We use `raw` because
// it's what the student actually saw on screen — `stored` may have been
// post-processed slightly.
//
// Returns a string. Empty string ("") means "no answer was submitted"
// and the UI should render its placeholder ("(no answer)").

export function formatStudentAnswer(
  q: Question,
  type: QuestionType | string,
  answerEntry: AnswerEntry | null | undefined,
): string {
  if (!answerEntry) return "";
  const raw = answerEntry.raw;
  if (raw === null || raw === undefined) return "";
  if (Array.isArray(raw) && raw.length === 0) return "";

  switch (type) {
    case "mcq": {
      const opts = Array.isArray(q.options) ? q.options : [];
      if (Array.isArray(raw)) {
        return raw
          .map((i) => stringifyOption(opts[i as number]))
          .filter(Boolean)
          .join(", ");
      }
      return stringifyOption(opts[raw as number]) || String(raw);
    }
    case "tf":
      return raw === true ? "True" : raw === false ? "False" : String(raw);
    case "fill":
    case "free":
    case "open":
    case "sentence":
      return String(raw);
    case "order":
      return Array.isArray(raw) ? raw.join(" \u2192 ") : "";
    case "match":
      return raw && typeof raw === "object"
        ? Object.entries(raw as Record<string, unknown>)
            .map(([l, r]) => `${l} \u2192 ${r}`)
            .join(", ")
        : "";
    case "slider":
      return String(raw);
    default:
      return typeof raw === "string" ? raw : JSON.stringify(raw);
  }
}
