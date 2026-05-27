// ─── Clasloop close-unit narrative endpoint ─────────────────────────────
//
// Generates the AI narrative ({whatWorked, whatDidnt}) for a closed
// unit. Pipeline:
//   1. WRITER — Gemini 3.5 Flash writes the narrative from the unit data
//   2. VERIFIER — Gemini 3.5 Flash reviews the WRITER's output for honesty
//   3. If verifier rejects, retry the WRITER once with the issues
//   4. If second attempt also rejected, ship the WRITER's output anyway
//      (better than no output at all — never hard-fail user-visible)
//
// Why a separate endpoint from /api/generate.js:
//   - Different output shape (narrative paragraphs, not question array)
//   - Different verification semantics (accept/reject narrative honesty,
//     not per-question evaluation)
//   - Cleaner separation: this endpoint is about narrative quality,
//     /api/generate is about question quality.
//
// Auth, rate-limit, and logging mirror the patterns in /api/generate.js.
// We log to ai_generations with input_type='close_unit_narrative' so
// the admin AI stats dashboard can track usage.

import { requireTeacher, requireDailyRateLimit } from './_lib/auth.js';
import { callGemini } from './_lib/gemini.js';

const RATE_LIMIT_PER_DAY = 50;
const MODEL = 'gemini-3.5-flash';
const MAX_TOKENS = 800;

// Imported as plain text via a local require since this is a
// serverless function — not a build with module resolution. We
// inline the prompts here to keep the function self-contained.
const WRITER_SYSTEM = `You are an experienced K-12 teaching coach reading a teacher's classroom data at the end of a unit. Your job: write a brief, honest reflection on how the unit went.

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

const VERIFIER_SYSTEM = `You are reviewing a draft reflection that another assistant just wrote about a teacher's unit, against the actual data the teacher provided.

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  // PR 142b: JWT + teacher gate + daily rate limit via api/_lib/auth.js.
  const auth = await requireTeacher(req, res);
  if (!auth) return; // error response already sent
  const supabaseAdmin = auth.supabase;
  const userId = auth.user.id;

  const okRate = await requireDailyRateLimit(
    res, supabaseAdmin, userId, RATE_LIMIT_PER_DAY,
    `You've reached ${RATE_LIMIT_PER_DAY} AI calls in the last 24 hours.`,
    // Keep AI image rows out of this feature's budget (they have their own cap).
    { excludeActivityType: 'image_generation' },
  );
  if (!okRate) return;

  // ── 4. Validate body ───────────────────────────────────
  const { unitId, context } = req.body || {};
  if (!unitId) {
    return res.status(400).json({ error: 'missing_unit_id' });
  }
  if (!context || typeof context !== 'object') {
    return res.status(400).json({ error: 'missing_context' });
  }

  // Verify the unit belongs to a class this teacher owns. Important
  // because the rate limit is per-teacher: we don't want a teacher
  // to be able to generate narratives for someone else's units.
  const { data: unit } = await supabaseAdmin
    .from('units')
    .select('id, class_id')
    .eq('id', unitId)
    .single();
  if (!unit) return res.status(404).json({ error: 'unit_not_found' });

  const { data: cls } = await supabaseAdmin
    .from('classes')
    .select('teacher_id')
    .eq('id', unit.class_id)
    .single();
  if (!cls || cls.teacher_id !== userId) {
    return res.status(403).json({ error: 'not_authorized' });
  }

  // ── 5. Run the pipeline ────────────────────────────────
  let narrative;
  let verifierResult;
  let attempts = 0;
  let lastIssues = null;

  for (attempts = 1; attempts <= 2; attempts++) {
    // WRITER call
    const writerMessages = [
      {
        role: 'user',
        content: lastIssues
          ? `The previous draft was rejected for these reasons:\n${lastIssues.map(i => `- ${i}`).join('\n')}\n\nWrite a new draft that fixes them.\n\nUnit data:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``
          : `Here is the unit data:\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nWrite the reflection now.`,
      },
    ];
    const writerResp = await callGemini({
      apiKey: GEMINI_API_KEY,
      model: MODEL,
      system: WRITER_SYSTEM,
      messages: writerMessages,
      maxTokens: MAX_TOKENS,
    });
    if (!writerResp.ok) {
      // Log the upstream detail server-side only; don't echo it to the client
      // (matches generate.js / generate-image.js, which return a generic 502).
      console.error('[close-unit-narrative] writer call failed:', writerResp.error);
      return res.status(502).json({ error: 'writer_failed' });
    }
    narrative = parseJson(writerResp.text);
    if (!narrative || typeof narrative.whatWorked !== 'string' || typeof narrative.whatDidnt !== 'string') {
      // Writer returned garbage. Try once more (the verifier loop will
      // handle the second attempt).
      lastIssues = ['Writer output not valid JSON with whatWorked/whatDidnt'];
      continue;
    }

    // VERIFIER call
    const verifierMessages = [
      {
        role: 'user',
        content: `SOURCE DATA:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nDRAFT REFLECTION TO REVIEW:\n\`\`\`json\n${JSON.stringify(narrative, null, 2)}\n\`\`\`\n\nApprove or reject.`,
      },
    ];
    const verifierResp = await callGemini({
      apiKey: GEMINI_API_KEY,
      model: MODEL,
      system: VERIFIER_SYSTEM,
      messages: verifierMessages,
      maxTokens: 200,
    });
    if (!verifierResp.ok) {
      // Verifier failed (network, etc.). Ship the writer's output —
      // never hard-fail user-visible flow. Mark verifier as null.
      verifierResult = { ok: true, _verifier_error: true };
      break;
    }
    verifierResult = parseJson(verifierResp.text) || { ok: true };
    if (verifierResult.ok) break;
    lastIssues = verifierResult.issues || ['unspecified'];
    // Loop continues for the second attempt
  }

  // Both attempts failed to yield a valid draft (parseJson returned null or the
  // shape was wrong). Without this guard `narrative.whatWorked` below throws a
  // raw 500 (FUNCTION_INVOCATION_FAILED). Fail cleanly with a 502 instead.
  if (!narrative || typeof narrative.whatWorked !== 'string' || typeof narrative.whatDidnt !== 'string') {
    console.error('[close-unit-narrative] writer produced no valid draft after 2 attempts');
    return res.status(502).json({ error: 'writer_failed' });
  }

  // ── 6. Persist on the unit ─────────────────────────────
  const cachedNarrative = {
    whatWorked: narrative.whatWorked,
    whatDidnt: narrative.whatDidnt,
    version: 1,
    model: MODEL,
    verified: !!(verifierResult && verifierResult.ok),
    attempts,
  };
  await supabaseAdmin
    .from('units')
    .update({
      closing_narrative: cachedNarrative,
      closing_narrative_generated_at: new Date().toISOString(),
    })
    .eq('id', unitId);

  // ── 7. Log to ai_generations ───────────────────────────
  // Mirrors /api/generate.js columns. We don't have a dedicated
  // metadata column so we encode the unit_id + verification flag
  // inside output_raw so the admin AI stats can still extract it.
  await supabaseAdmin.from('ai_generations').insert({
    teacher_id: userId,
    activity_type: 'close_unit_narrative',
    num_questions: 0,
    model_used: MODEL,
    input_type: 'close_unit_narrative',
    input_size_chars: JSON.stringify(context).length,
    output_raw: {
      narrative: cachedNarrative,
      unit_id: unitId,
      attempts,
      verified: cachedNarrative.verified,
    },
  });

  return res.status(200).json({
    narrative: cachedNarrative,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────

// Tolerate ```json fences and surrounding whitespace.
function parseJson(s) {
  if (!s) return null;
  let cleaned = s.trim();
  // Strip markdown fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}
