// ─── Scoring — single source of truth for per-question grading ──────────
// Used by StudentJoin (when the student submits an answer), by the
// teacher's To Review page (when grading free-text), and by the per-deck
// analytics view (when computing class averages).
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
//
// `evaluateAnswer` returns:
//   { points, maxPoints, isCorrect, stored, needsReview }
//
// `isCorrect` (boolean) is kept for backwards compatibility with code
// that hasn't migrated to points yet (spaced-repetition, live session
// percentage display). For graded types it equals (points === maxPoints).
// For needsReview types, isCorrect is `null` until the teacher decides
// — call sites that need a boolean treat null as "ungraded, count as
// participation" (StudentJoin's existing pattern).

// Normalization helper for fill-in-the-blank — strips accents, lowers
// case, collapses whitespace. Same logic that lived in StudentJoin.
function normFill(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function evaluateAnswer(q, type, raw) {
  // Empty submission. Free-text still counts as submitted (ungraded);
  // everything else is a 0/maxPoints depending on the type's max.
  if (raw === null || raw === undefined || (Array.isArray(raw) && raw.length === 0)) {
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
    const maxForEmpty = (type === "match" || type === "order")
      ? Math.max((q.pairs?.length || q.items?.length || 1), 1)
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
      return { points: ok ? 1 : 0, maxPoints: 1, isCorrect: ok, stored: raw, needsReview: false };
    }

    case "fill": {
      const candidates = [q.answer, ...(Array.isArray(q.alternatives) ? q.alternatives : [])]
        .filter(Boolean)
        .map(normFill);
      const ok = candidates.includes(normFill(raw));
      return { points: ok ? 1 : 0, maxPoints: 1, isCorrect: ok, stored: String(raw), needsReview: false };
    }

    case "order": {
      // Per-position scoring: 1 point per item in the correct slot. The
      // order question stores `items` as the canonical correct order.
      const items = q.items || [];
      const arr = Array.isArray(raw) ? raw : [];
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
      // Per-pair scoring: 1 point per pair where the student's left → right
      // mapping matches the canonical pair.
      const pairs = q.pairs || [];
      let correctPairs = 0;
      if (raw && typeof raw === "object") {
        for (const p of pairs) {
          if (raw[p.left] === p.right) correctPairs++;
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
      // meets the min word count. All-or-nothing for now (1 point or 0).
      const text = String(raw || "");
      const required = String(q.required_word || "").trim().toLowerCase();
      const minWords = Number.isFinite(q.min_words) ? q.min_words : 3;
      const wordCount = (text.trim().match(/\S+/g) || []).length;
      const containsRequired = required ? text.toLowerCase().includes(required) : true;
      const ok = containsRequired && wordCount >= minWords;
      return { points: ok ? 1 : 0, maxPoints: 1, isCorrect: ok, stored: text, needsReview: false };
    }

    case "slider": {
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        return { points: 0, maxPoints: 1, isCorrect: false, stored: null, needsReview: false };
      }
      const target = Number(q.correct);
      const tol = Math.max(0, Number(q.tolerance) || 0);
      const ok = Math.abs(value - target) <= tol;
      return { points: ok ? 1 : 0, maxPoints: 1, isCorrect: ok, stored: value, needsReview: false };
    }

    case "mcq":
    default: {
      // Multi-correct: q.correct is an array → require exact set match
      // (no partial credit on multi-MCQ — pedagogically common).
      if (Array.isArray(q.correct)) {
        const got = Array.isArray(raw) ? raw : [raw];
        const need = q.correct;
        const ok = got.length === need.length && got.every(v => need.includes(v));
        return { points: ok ? 1 : 0, maxPoints: 1, isCorrect: ok, stored: got, needsReview: false };
      }
      const ok = raw === q.correct;
      return { points: ok ? 1 : 0, maxPoints: 1, isCorrect: ok, stored: raw, needsReview: false };
    }
  }
}

// ─── Teacher grade → points ─────────────────────────────────────────────
// Used by the To Review page (next turn) to convert the teacher's
// 3-button choice into the (points, isCorrect) pair we persist. Kept
// here so the policy lives next to evaluateAnswer.
export function teacherGradeToPoints(grade) {
  switch (grade) {
    case "correct":   return { points: 2, isCorrect: true };
    case "partial":   return { points: 1, isCorrect: true };  // partial counts as participation
    case "incorrect": return { points: 0, isCorrect: false };
    default:          return null; // ungraded
  }
}

// ─── Build the canonical "correct answer" view for the review screen ────
// The student's end-of-session "see correct answers" view needs a
// human-readable representation of what the right answer was for each
// question type. Returns a string the UI can render directly. Returns
// null for types that need teacher review (UI shows "pending review"
// instead of a correct answer).
export function describeCorrectAnswer(q, type) {
  switch (type) {
    case "mcq": {
      const opts = Array.isArray(q.options) ? q.options : [];
      if (Array.isArray(q.correct)) {
        return q.correct.map(i => stringifyOption(opts[i])).filter(Boolean).join(", ");
      }
      return stringifyOption(opts[q.correct]) || String(q.correct ?? "");
    }
    case "tf":
      return q.correct === true ? "True" : (q.correct === false ? "False" : String(q.correct ?? ""));
    case "fill":
      return [q.answer, ...(Array.isArray(q.alternatives) ? q.alternatives : [])]
        .filter(Boolean)
        .join(" / ");
    case "order":
      return Array.isArray(q.items) ? q.items.join(" → ") : "";
    case "match":
      return Array.isArray(q.pairs)
        ? q.pairs.map(p => `${p.left} → ${p.right}`).join(", ")
        : "";
    case "sentence":
      return q.required_word ? `(must include "${q.required_word}")` : "(open sentence)";
    case "slider": {
      const t = Number(q.correct);
      const tol = Number(q.tolerance) || 0;
      return tol > 0 ? `${t} (±${tol})` : String(t);
    }
    case "free":
    case "open":
    default:
      return null;
  }
}

// MCQ options can be plain strings or {text, image_url} objects. Render
// the text part. Image-only options fall back to a pseudo "(image)" tag
// so the review screen still says something instead of nothing.
function stringifyOption(opt) {
  if (opt == null) return "";
  if (typeof opt === "string") return opt;
  if (typeof opt === "object") {
    if (opt.text) return opt.text;
    if (opt.image_url) return "(image)";
  }
  return String(opt);
}

// ─── Format the student's answer for the review screen ──────────────────
// `answer` here is what comes out of evaluateAnswer's `stored` field
// (sometimes an index, sometimes a string, sometimes an object). We
// render it the same way correct answers are rendered so the visual
// comparison is intuitive.
//
// `answerEntry` is the local-state record from the answers array:
// { isCorrect, raw, points, maxPoints, needsReview }. We use raw because
// it's what the student actually saw on screen — `stored` may have been
// post-processed slightly.
//
// Returns a string. Empty string ("") means "no answer was submitted"
// and the UI should render its placeholder ("(no answer)").
export function formatStudentAnswer(q, type, answerEntry) {
  if (!answerEntry) return "";
  const raw = answerEntry.raw;
  if (raw === null || raw === undefined) return "";
  if (Array.isArray(raw) && raw.length === 0) return "";

  switch (type) {
    case "mcq": {
      const opts = Array.isArray(q.options) ? q.options : [];
      if (Array.isArray(raw)) {
        return raw.map(i => stringifyOption(opts[i])).filter(Boolean).join(", ");
      }
      return stringifyOption(opts[raw]) || String(raw);
    }
    case "tf":
      return raw === true ? "True" : (raw === false ? "False" : String(raw));
    case "fill":
    case "free":
    case "open":
    case "sentence":
      return String(raw);
    case "order":
      return Array.isArray(raw) ? raw.join(" → ") : "";
    case "match":
      return raw && typeof raw === "object"
        ? Object.entries(raw).map(([l, r]) => `${l} → ${r}`).join(", ")
        : "";
    case "slider":
      return String(raw);
    default:
      return typeof raw === "string" ? raw : JSON.stringify(raw);
  }
}
