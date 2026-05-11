// ─── close-unit-prompt ──────────────────────────────────────────────────
//
// Builds the prompts used by api/close-unit-narrative.js.
//
// We have two prompts:
//   1. WRITER — Sonnet 4.6 generates the narrative ({whatWorked, whatDidnt})
//   2. VERIFIER — Sonnet 4.6 reads the WRITER's output and the source
//      data, and either approves or returns specific issues for retry.
//
// Both run on Sonnet (per teacher decision in PR 12 planning):
// quality > speed for close-unit since it runs at most ~2x/month
// per teacher.
//
// The WRITER receives:
//   - Unit name + class subject + grade
//   - Number of days the unit ran
//   - Total launches (warmups + exit tickets)
//   - Total student responses
//   - Per-deck stats: title, section, retention %, attempts
//   - Strongest deck + retention
//   - Weakest deck + retention
//   - Average retention across all decks
// The VERIFIER receives the WRITER's output + the same source data,
// and decides whether the narrative is honest (doesn't fabricate
// details) and useful (concrete, not generic).

// Build the JSON context object that goes into both prompts.
// Pure function — no side effects, no Supabase calls.
export function buildNarrativeContext({ unit, classObj, summary, lang = "en" }) {
  return {
    unit: {
      name: unit?.name || "",
      created_at: unit?.created_at || null,
      closed_at: unit?.closed_at || null,
    },
    class: {
      subject: classObj?.subject || null,
      grade: classObj?.grade || null,
    },
    overview: {
      days_count: summary?.dayCount || 0,
      warmups_launched: summary?.warmupSessionCount || 0,
      exits_launched: summary?.exitSessionCount || 0,
      total_responses: summary?.totalResponses || 0,
      total_sessions: summary?.totalSessions || 0,
      strong_topics_count: summary?.strongTopics || 0,
      weak_topics_count: summary?.weakTopics || 0,
      average_retention_pct: summary?.averageRetention,
    },
    strongest: summary?.strongest
      ? {
          // PR 12.3.1 fix: getUnitRetentionSummary returns enrichedDecks
          // as { deck, sessionCount, retention, status } — so title and
          // section live inside .deck, not at the top level. This bug
          // existed since PR 12 but only manifested in PR 12.3 when we
          // started using d.id to fetch deck content.
          title: summary.strongest.deck?.title || "",
          section: summary.strongest.deck?.section || null,
          retention_pct: summary.strongest.retention,
        }
      : null,
    weakest: summary?.weakest
      ? {
          title: summary.weakest.deck?.title || "",
          section: summary.weakest.deck?.section || null,
          retention_pct: summary.weakest.retention,
        }
      : null,
    decks: (summary?.decks || []).map(d => ({
      title: d.deck?.title || "",
      section: d.deck?.section || null,
      retention_pct: d.retention,
      sessions_launched: d.sessionCount || 0,
    })),
    target_lang: lang,
  };
}

// ─── WRITER prompt ───────────────────────────────────────────────────────
// System message kept in English (LLM consistency); the OUTPUT is in the
// target_lang specified in the context. This matches how the rest of
// Clasloop talks to Claude (system in en, output in user's language).
//
// Output schema is strict JSON because we render fields directly into
// the UI. Free-form text is the value of each field — we want sentences,
// not bullet points. The teacher wants to read this as a colleague's
// note, not as a checklist.
export const WRITER_SYSTEM = `You are an experienced K-12 teaching coach reading a teacher's classroom data at the end of a unit. Your job: write a brief, honest reflection on how the unit went.

Output two short paragraphs — "whatWorked" and "whatDidnt" — directly from the data. Each should be 2-3 sentences. Reference SPECIFIC decks, retention numbers, and topic names from the input. Do not invent details that aren't in the data.

Tone:
- Like a respected mentor leaving a Post-it note. Concrete, observational, not preachy.
- Avoid generic teaching advice ("students learn at different paces" — don't say things like that).
- Don't congratulate or scold. Report.
- It's fine to mention if data is sparse ("only 2 launches" or "no exit tickets recorded").

For "whatWorked":
- Highlight the strongest deck or topic with its retention number.
- If retention rose over time on a topic, say so.
- If exit tickets caught misconceptions, mention which one and what was caught.

For "whatDidnt":
- Name the weakest topic with its retention number.
- If a planned launch never happened, say so.
- If retention stayed flat or dropped, name the deck.
- If there's no real "didn't work" (everything went well), say "Nothing significant — retention held above X% across the unit." Don't invent problems.

If the data is too sparse to make any honest observation (e.g. 0 launches, 0 responses), output:
{"whatWorked": "Not enough data to summarize this unit yet.", "whatDidnt": "Launch a few warmups and exit tickets to build a picture worth reflecting on."}

Output ONLY this JSON, no preamble, no markdown:
{
  "whatWorked": "<2-3 sentences in the target language>",
  "whatDidnt": "<2-3 sentences in the target language>"
}

The target language is in the user message field "target_lang" (en/es/ko). Write the paragraphs in that language. Keep retention numbers as Arabic numerals with the % sign (e.g. "67%").`;

// User message is just the JSON context, stringified. The system handles
// all the formatting/instruction logic.
export function buildWriterMessages(context) {
  return [
    {
      role: "user",
      content: `Here is the unit data:\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nWrite the reflection now.`,
    },
  ];
}

// ─── VERIFIER prompt ─────────────────────────────────────────────────────
// Sonnet reads its own previous output and the source data. Accepts or
// rejects with specific reasons. We retry once if rejected; if it fails
// twice, we ship the WRITER's output anyway (better imperfect insight
// than no insight at all).
export const VERIFIER_SYSTEM = `You are reviewing a draft reflection that another assistant just wrote about a teacher's unit, against the actual data the teacher provided.

Your job: catch hallucinations and generic filler. Approve or reject.

Reject if any of these are true:
- The draft mentions retention numbers that don't appear in the data.
- The draft names a deck title that doesn't appear in the data.
- The draft makes claims about "students" or "the class" that the data doesn't support (e.g. "students struggled with the concept of X" when no such topic appears).
- The draft is generic teaching advice that could apply to any unit ("remember to differentiate", "consider scaffolding").
- The draft fabricates specifics (a 4th week, a Tuesday lesson, etc.) that aren't in the data.
- The draft contradicts the data (says "retention was high" when the data shows 35%).
- The draft mentions exit tickets when none were launched, or warmups when none were.
- The output isn't valid JSON in the required shape.

Otherwise approve. Don't reject for stylistic reasons (sentence length, word choice). The bar is honesty, not poetry.

Output ONLY this JSON:
{"ok": true}
OR
{"ok": false, "issues": ["<short reason>", "<short reason>"]}

Each issue ≤ 12 words.`;

export function buildVerifierMessages(context, draft) {
  return [
    {
      role: "user",
      content: `SOURCE DATA:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nDRAFT REFLECTION TO REVIEW:\n\`\`\`json\n${JSON.stringify(draft, null, 2)}\n\`\`\`\n\nApprove or reject.`,
    },
  ];
}

// ─── Suggested review deck prompt ────────────────────────────────────────
//
// PR 12.3: This prompt was rewritten after a real-world bug:
// a Spanish unit generated 20 English ELA questions (denotation,
// subject-verb agreement, misplaced modifiers, etc.) because we
// only sent the deck TITLES + class subject + grade. With sparse
// context, Sonnet defaulted to its prior for "9th grade curriculum",
// which in its training data is heavily English Language Arts.
//
// Fix: the prompt now receives THE ACTUAL CONTENT of every deck in
// the unit (questions + answers), plus the accumulated weak points
// detected by PR 13 session_insights. This grounds the generation
// in real teacher content, not the model's prior.
//
// The model writes a 20-question review weighted toward weak points
// (~65%) with the remainder being broader coverage of the unit content.

export const REVIEW_DECK_SYSTEM = `You are creating a 20-question closing review deck for a teacher's unit. The teacher has already taught this unit — your job is to review it, not to invent new curriculum.

═══════════════════════════════════════════════════════════════════════
THE GROUND TRUTH: the teacher's actual unit content
═══════════════════════════════════════════════════════════════════════

You will receive in the user message:

1. A list of EVERY DECK in this unit, with ALL their actual questions
   and correct answers. This is the COMPLETE record of what the teacher
   taught. Treat it as authoritative.

2. A list of WEAK POINTS detected during the unit — specific topics
   where students struggled most across sessions. Each weak point
   includes a label and a sample failure rate.

═══════════════════════════════════════════════════════════════════════
HARD RULES — these are not suggestions
═══════════════════════════════════════════════════════════════════════

DOMAIN
- Your questions MUST be about the same subject matter as the deck
  questions you're shown. If the decks are about Spanish verbs, your
  questions are about Spanish verbs. If they're about photosynthesis,
  yours are about photosynthesis.
- NEVER invent curriculum content based on grade level or class subject
  label. The deck content overrides any assumption you might have about
  "what a 9th grade class typically studies".

LANGUAGE
- Write your questions in the SAME LANGUAGE as the existing question
  text shown to you.
- If the existing questions are written in Spanish, you write in Spanish.
- If they're written in Korean, you write in Korean.
- target_lang in the prompt is a hint; the actual deck language is the
  authoritative signal.

VOCABULARY & DIFFICULTY
- Reuse specific terms, verb forms, named entities, dates, and phrasing
  style from the existing questions. Match their register and difficulty.
- Don't introduce vocabulary the teacher didn't use unless it's a natural
  variant.

═══════════════════════════════════════════════════════════════════════
DISTRIBUTION
═══════════════════════════════════════════════════════════════════════

Exactly 20 questions in this mix:
- 14 MCQ
- 2 fill-in-the-blank
- 2 true/false
- 2 free-text (open-ended, graded manually by the teacher)

Topic weighting:
- About 65% of the questions (≈13) should target the WEAK POINTS list.
  Distribute proportionally — more questions for higher fail rates.
- The remaining ≈7 questions cover the rest of the unit content for
  general reinforcement.

If the weak points list is empty (the unit had no clearly weak topics),
distribute all 20 questions evenly across the unit's decks.

Difficulty:
- Slightly easier than the originals on average. This is a recap.
- For each weak-point topic, write SOME questions at the same difficulty
  as the originals (the students failed those — show they can still
  succeed at that level) and OTHERS that approach the topic from a
  different angle (vocabulary, application, edge case).

═══════════════════════════════════════════════════════════════════════
OUTPUT FORMAT — strict JSON, no markdown fences, no preamble
═══════════════════════════════════════════════════════════════════════

{
  "questions": [
    { "type": "mcq", "q": "...", "options": ["a", "b", "c", "d"], "correct": 0 },
    { "type": "fill", "q": "Sentence with ___ blank.", "answer": "word" },
    { "type": "tf", "q": "...", "correct": true },
    { "type": "free", "q": "Open-ended question prompting a short written answer." },
    ...
  ]
}

Notes per type:
- MCQ: "correct" is the index (0-3) of the right option in the array.
- TF: "correct" is the boolean true or false.
- fill: "answer" is the canonical word/phrase that fills the ___ blank.
- free: NO "answer" field. The teacher will grade these manually
  through the existing review queue.`;

/**
 * Build the user message for the review-deck generation.
 *
 * @param {object} context - output of buildNarrativeContext
 * @param {Array} fullDecks - all decks in the unit with FULL content:
 *   [{ id, title, section, language, questions: [{type, q, ...}] }, ...]
 * @param {Array} weakPoints - accumulated session_insights.weak_points
 *   from all sessions in this unit. Each entry:
 *   { label: "Las preguntas con `estar`...", fail_pct: 60,
 *     fail_count: 6, total: 10, sessionCount: 2 }
 *   sessionCount is the number of sessions in this unit where this
 *   weak point appeared (we merge duplicates).
 */
export function buildReviewDeckMessages(context, fullDecks = [], weakPoints = []) {
  // Format every deck with its full question content. This is the
  // most important part of the prompt — it's the ground truth that
  // prevents hallucination of unrelated curriculum.
  const decksContent = fullDecks.length > 0
    ? fullDecks.map((d, i) => {
        const qs = Array.isArray(d.questions) ? d.questions : [];
        const qsFormatted = qs.map((q, qi) => {
          const answerStr = formatAnswerForPrompt(q);
          return `   ${qi + 1}. [${q.type}] ${stringifyQuestionText(q.q)}${answerStr ? `\n      → correct answer: ${answerStr}` : ""}`;
        }).join("\n");
        return `Deck ${i + 1}: "${d.title}" (${d.section}, language: ${d.language || "?"}, ${qs.length} questions)\n${qsFormatted || "   (no questions)"}`;
      }).join("\n\n")
    : "(no decks in this unit)";

  // Format weak points. The PR 13 session_insights system produces
  // these as a list of {label, fail_pct, fail_count, total} objects
  // per session. We've aggregated them across all sessions of the unit.
  const weakPointsText = weakPoints.length > 0
    ? weakPoints.map((wp, i) => {
        const recurrence = wp.sessionCount > 1 ? ` — appeared in ${wp.sessionCount} sessions` : "";
        return `   ${i + 1}. ${wp.label} (≈${wp.fail_pct}% fail rate, ${wp.fail_count}/${wp.total} students${recurrence})`;
      }).join("\n")
    : "   (no weak points were detected in this unit's sessions — distribute review evenly across the decks above)";

  return [
    {
      role: "user",
      content: `Unit: ${context.unit.name}
Class: ${context.class.subject || "—"} · ${context.class.grade || "—"}
target_lang hint (deck language is authoritative): ${context.target_lang}

═══════════════════════════════════════════════════════════════════════
COMPLETE UNIT CONTENT — every deck the teacher used, with all questions:
═══════════════════════════════════════════════════════════════════════

${decksContent}

═══════════════════════════════════════════════════════════════════════
WEAK POINTS detected during this unit's sessions:
═══════════════════════════════════════════════════════════════════════

${weakPointsText}

═══════════════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════════════

Generate the 20-question review deck following the rules in the system
message. Target ~65% of questions at the weak points (if any), the
remainder for general unit reinforcement. Write in the same language
and domain as the deck content above.`,
    },
  ];
}

/**
 * Format a question's correct answer in a way that's useful in the
 * prompt. Returns null when there's no canonical answer (free / open).
 */
function formatAnswerForPrompt(q) {
  if (!q) return null;
  if (q.type === "mcq" && Array.isArray(q.options)) {
    if (Array.isArray(q.correct)) {
      return q.correct
        .map(i => q.options[i]?.text || q.options[i] || "")
        .filter(Boolean)
        .join(", ");
    }
    if (typeof q.correct === "number") {
      return q.options[q.correct]?.text || q.options[q.correct] || null;
    }
  }
  if (q.type === "tf") {
    return q.correct === true ? "true" : q.correct === false ? "false" : null;
  }
  if (q.type === "fill" && typeof q.answer === "string") {
    return q.answer;
  }
  if (q.type === "match" && Array.isArray(q.pairs)) {
    return q.pairs.map(p => `${p.left} ↔ ${p.right}`).join("; ");
  }
  if (q.type === "order" && Array.isArray(q.items)) {
    return q.items.join(" → ");
  }
  if (q.type === "free" || q.type === "open") return null;
  if (q.answer != null) return String(q.answer).slice(0, 100);
  return null;
}

function stringifyQuestionText(qText) {
  if (typeof qText === "string") return qText;
  return String(qText || "").slice(0, 300);
}
