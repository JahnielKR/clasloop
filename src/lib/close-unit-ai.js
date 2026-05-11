// ─── close-unit-ai ──────────────────────────────────────────────────────
//
// Frontend client for AI features in the close-unit flow:
//   1. generateClosingNarrative — calls /api/close-unit-narrative
//      to produce {whatWorked, whatDidnt} for a closed unit summary.
//   2. generateSuggestedReviewDeck — uses the existing /api/generate
//      pipeline to create a 7-question recap deck targeting the
//      weakest topics in a unit.
//
// Both functions are async and return either {ok: true, ...data} or
// {ok: false, error: "..."}. Callers should handle the error case
// (show a message, allow retry, etc.) — these never throw.

import { supabase } from './supabase';
import { buildNarrativeContext, REVIEW_DECK_SYSTEM, buildReviewDeckMessages } from './close-unit-prompt';

/**
 * Generate the AI narrative for a closed unit.
 *
 * @param {string} unitId - the unit being closed
 * @param {object} args.unit - unit row (name, dates, etc.)
 * @param {object} args.classObj - the class (subject, grade)
 * @param {object} args.summary - output of getUnitRetentionSummary
 * @param {string} [args.lang] - "en" | "es" | "ko"
 * @returns {Promise<{ok: true, narrative: object} | {ok: false, error: string}>}
 */
export async function generateClosingNarrative({ unitId, unit, classObj, summary, lang = 'en' }) {
  if (!unitId) return { ok: false, error: 'missing_unit_id' };

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { ok: false, error: 'not_authenticated' };

  const context = buildNarrativeContext({ unit, classObj, summary, lang });

  let resp;
  try {
    resp = await fetch('/api/close-unit-narrative', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ unitId, context }),
    });
  } catch (err) {
    return { ok: false, error: 'network' };
  }

  if (!resp.ok) {
    let errMsg = `http_${resp.status}`;
    try {
      const body = await resp.json();
      errMsg = body.error || errMsg;
    } catch {}
    return { ok: false, error: errMsg };
  }

  const data = await resp.json();
  if (!data?.narrative?.whatWorked || !data?.narrative?.whatDidnt) {
    return { ok: false, error: 'malformed_response' };
  }
  return { ok: true, narrative: data.narrative };
}

/**
 * Generate the suggested closing review deck.
 *
 * Reuses the existing /api/generate endpoint (Sonnet writes + Haiku
 * verifies, identical to regular deck generation). The difference is
 * the prompt: focused on the unit's 3 weakest topics, 7 questions
 * total, mixed types, recap-difficulty.
 *
 * Returns {ok: true, questions: [...]} on success. The caller is
 * responsible for inserting the deck row in supabase with the right
 * unit_id, section='general_review', and questions array.
 *
 * @returns {Promise<{ok: true, questions: array} | {ok: false, error: string}>}
 */
export async function generateSuggestedReviewQuestions({ unit, classObj, summary, lang = 'en' }) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { ok: false, error: 'not_authenticated' };

  // Skip if unit has no decks or no retention data — there's nothing
  // to recap. The UI hides the "Suggested review" CTA in that case
  // already, but defensive check here too.
  if (!summary?.decks?.length) {
    return { ok: false, error: 'no_decks_in_unit' };
  }

  const context = buildNarrativeContext({ unit, classObj, summary, lang });
  const messages = buildReviewDeckMessages(context);

  let resp;
  try {
    // We hit /api/generate with a custom system prompt and validate=true
    // (the existing pipeline). The endpoint will call Sonnet to write
    // the questions and Haiku to verify each one.
    resp = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: 'primary',
        system: REVIEW_DECK_SYSTEM,
        messages,
        max_tokens: 5000,
        validate: true,
        // Existing /api/generate.js logging fields. We mark this as
        // input_type='close_unit_review' so the admin AI stats can
        // distinguish recap-deck generation from regular generation.
        activity_type: 'general_review',
        num_questions: 20,
        input_type: 'close_unit_review',
        grade: classObj?.grade || null,
        subject: classObj?.subject || null,
      }),
    });
  } catch (err) {
    return { ok: false, error: 'network' };
  }

  if (!resp.ok) {
    let errMsg = `http_${resp.status}`;
    try {
      const body = await resp.json();
      errMsg = body.error || body.message || errMsg;
    } catch {}
    return { ok: false, error: errMsg };
  }

  const data = await resp.json();
  // /api/generate returns the raw Anthropic response shape:
  //   { content: [{type:"text", text: "<JSON>"}], ...validation }
  // We extract the text and parse it. If validation filtered some out,
  // the text already contains only the kept questions.
  const text = (data?.content || [])
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');
  let parsed;
  try {
    // Some prompts return {"questions": [...]}, others return [...] directly.
    // We accept both shapes.
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?\s*/i, '').replace(/```\s*$/i, '');
    }
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: 'parse_failed' };
  }
  const questions = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.questions) ? parsed.questions : null);
  if (!questions || questions.length === 0) {
    return { ok: false, error: 'no_questions_returned' };
  }
  return { ok: true, questions };
}

/**
 * Create a deck row in supabase from generated review questions.
 * Returns the new deck id on success.
 */
export async function saveReviewDeck({ unit, classObj, questions, lang = 'en', authorId }) {
  const title = buildReviewTitle(unit, lang);
  const { data, error } = await supabase
    .from('decks')
    .insert({
      title,
      description: buildReviewDescription(unit, lang),
      class_id: classObj?.id || null,
      unit_id: null, // general_review decks live outside units (per PR 6)
      section: 'general_review',
      author_id: authorId,
      // subject/grade are NOT NULL in the schema. Fall back to empty
      // string if the class doesn't have them set (very unlikely, but
      // defensive).
      subject: classObj?.subject || '',
      grade: classObj?.grade || '',
      language: lang,
      questions,
      is_public: false,
      // We don't auto-launch — leave it as a draft the teacher can
      // review and then launch from ClassPage.
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, deckId: data.id };
}

function buildReviewTitle(unit, lang) {
  const name = unit?.name || '';
  switch (lang) {
    case 'es': return `Repaso de cierre: ${name}`;
    case 'ko': return `${name} 마무리 복습`;
    default: return `Closing review: ${name}`;
  }
}

function buildReviewDescription(unit, lang) {
  switch (lang) {
    case 'es': return `Repaso rápido de los temas más débiles de la unidad "${unit?.name || ''}".`;
    case 'ko': return `"${unit?.name || ''}" 단원에서 가장 약한 주제들에 대한 간단한 복습.`;
    default: return `A quick recap of the weakest topics from the "${unit?.name || ''}" unit.`;
  }
}
