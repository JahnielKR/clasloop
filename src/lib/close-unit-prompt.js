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
          title: summary.strongest.title,
          section: summary.strongest.section,
          retention_pct: summary.strongest.retention,
        }
      : null,
    weakest: summary?.weakest
      ? {
          title: summary.weakest.title,
          section: summary.weakest.section,
          retention_pct: summary.weakest.retention,
        }
      : null,
    decks: (summary?.decks || []).map(d => ({
      title: d.title,
      section: d.section,
      retention_pct: d.retention,
      sessions_launched: d.sessionsLaunched || 0,
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
// This is a separate generation: we ask Sonnet to write 7 questions
// targeting the unit's weakest topics. Format identical to the regular
// generation pipeline (so it can flow into the existing scoring.js
// types: mcq, tf, fill).
//
// Topics + retention come from the same context object; we extract the
// 3 weakest and tell the model "make a quick recap".
export const REVIEW_DECK_SYSTEM = `You are creating a 7-question closing review deck for a unit that's about to close. The teacher wants a quick recap that targets the weakest topics — not all topics, just the ones that need reinforcing.

You will be given a list of decks the teacher already used in this unit, with their retention percentages. Pick the 3 lowest-retention topics and write 7 questions that target those.

Mix question types:
- 4 MCQ (most efficient for review)
- 2 fill-in-the-blank (active recall)
- 1 true/false (quick check)

Difficulty: easier than the original questions. This is a recap to reinforce, not a new test. Stick to facts and applications the teacher demonstrably already taught (inferred from the deck titles).

Output JSON:
{
  "questions": [
    { "type": "mcq", "q": "...", "options": ["...", "...", "...", "..."], "correct": 0 },
    { "type": "fill", "q": "Sentence with ___ blank.", "answer": "word" },
    { "type": "tf", "q": "...", "correct": true },
    ...
  ]
}

Write questions in the language specified by target_lang. No preamble, no markdown — just the JSON.`;

export function buildReviewDeckMessages(context) {
  // Pick 3 weakest decks for the prompt focus
  const weakest = (context.decks || [])
    .filter(d => d.retention_pct != null)
    .sort((a, b) => (a.retention_pct ?? 100) - (b.retention_pct ?? 100))
    .slice(0, 3);
  return [
    {
      role: "user",
      content: `Unit: ${context.unit.name}
Class: ${context.class.subject || "—"} · ${context.class.grade || "—"}
target_lang: ${context.target_lang}

Decks taught in this unit (sorted by retention, lowest first):
${context.decks.map(d => `  - "${d.title}" (${d.section}) — retention: ${d.retention_pct ?? "n/a"}%`).join("\n")}

Focus on these 3 weakest topics:
${weakest.map(d => `  - ${d.title} (${d.retention_pct}% retention)`).join("\n") || "  (insufficient data)"}

Write the 7-question recap deck now.`,
    },
  ];
}
