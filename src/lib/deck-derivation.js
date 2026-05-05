// ─── Deck similarity / derivation detector ─────────────────────────────────
// Compares a copy's questions against the original's to decide whether the
// copy is essentially the same content, an adaptation, or independent work.
// Used by the publish gate in Decks.jsx to prevent low-effort republishing.
//
// Rules (see analyzeDerivation below):
//   - originalCoverage: % of the original's questions that still exist in the copy
//   - ownContribution:  % of the copy's questions that are new (not in original)
//
// Outcome:
//   - originalCoverage >= 40 AND ownContribution < 40  => "blocked"   (low effort)
//   - originalCoverage >= 40 AND ownContribution >= 40 => "adapted"   (publish with "Adapted from" badge)
//   - originalCoverage < 40                            => "independent" (publish clean)

const COVERAGE_THRESHOLD = 40; // %  — original presence above this = derivative
const CONTRIBUTION_THRESHOLD = 40; // %  — own additions above this = enough effort

// Normalize a question's prompt for comparison. We compare on prompt only
// because it's the strongest signal of "same question". Reordering MCQ options
// or rewording an option doesn't make a new question.
//
// The deck schema in this app stores prompt under `q`. We also check
// alternative names (prompt/question/text) for safety.
function normalizePrompt(question) {
  if (!question) return "";
  const raw = (question.q || question.prompt || question.question || question.text || "").toString();
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Compare a copy's questions to its original's.
 * Returns:
 *   {
 *     originalCount,
 *     copyCount,
 *     samePrompts,        // count of prompts present in BOTH lists
 *     originalCoverage,   // %, how much of the original is still present
 *     ownContribution,    // %, how much of the copy is new
 *     status,             // "identical" | "blocked" | "adapted" | "independent"
 *     canPublish,         // bool
 *     showAdaptedBadge,   // bool — true means the copy should be shown as "Adapted from X"
 *   }
 */
export function analyzeDerivation(originalQuestions, copyQuestions) {
  const orig = (originalQuestions || []).map(normalizePrompt).filter(Boolean);
  const copy = (copyQuestions || []).map(normalizePrompt).filter(Boolean);

  // Use a multi-set so duplicate prompts (rare but possible) don't
  // disproportionately count toward "same".
  const origCounts = new Map();
  orig.forEach(p => origCounts.set(p, (origCounts.get(p) || 0) + 1));

  let samePrompts = 0;
  copy.forEach(p => {
    const c = origCounts.get(p) || 0;
    if (c > 0) {
      samePrompts++;
      origCounts.set(p, c - 1);
    }
  });

  const originalCount = orig.length;
  const copyCount = copy.length;
  const originalCoverage = originalCount > 0 ? Math.round((samePrompts / originalCount) * 100) : 0;
  const ownContribution = copyCount > 0 ? Math.round(((copyCount - samePrompts) / copyCount) * 100) : 0;

  // Identical: every original prompt is present AND copy has no new prompts.
  // (Reordering / cover changes don't count as new content.)
  const identical = originalCount === copyCount && samePrompts === originalCount && originalCount > 0;

  let status, canPublish, showAdaptedBadge;
  if (identical) {
    status = "identical";
    canPublish = false;
    showAdaptedBadge = false;
  } else if (originalCoverage >= COVERAGE_THRESHOLD && ownContribution < CONTRIBUTION_THRESHOLD) {
    status = "blocked"; // derivative + low effort
    canPublish = false;
    showAdaptedBadge = false;
  } else if (originalCoverage >= COVERAGE_THRESHOLD) {
    status = "adapted"; // derivative + meaningful additions
    canPublish = true;
    showAdaptedBadge = true;
  } else {
    status = "independent"; // sufficiently different — treat as new
    canPublish = true;
    showAdaptedBadge = false;
  }

  return {
    originalCount, copyCount, samePrompts,
    originalCoverage, ownContribution,
    status, canPublish, showAdaptedBadge,
  };
}

export const DERIVATION_THRESHOLDS = {
  COVERAGE: COVERAGE_THRESHOLD,
  CONTRIBUTION: CONTRIBUTION_THRESHOLD,
};
