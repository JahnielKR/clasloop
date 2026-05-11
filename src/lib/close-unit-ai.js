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

  if (!summary?.decks?.length) {
    return { ok: false, error: 'no_decks_in_unit' };
  }

  // ── PR 12.3: Build rich context from real teacher content ──
  // Fetch ALL decks of this unit with their full question content,
  // plus weak points accumulated from session_insights. This grounds
  // the AI in actual teacher content (preventing the off-topic
  // hallucination bug we saw in PR 12.2).
  // PR 12.3.1 fix: enrichedDecks shape is { deck, sessionCount,
  // retention, status }, so the id lives in d.deck.id. Filter out
  // entries where deck is missing (shouldn't happen but defensive).
  const deckIds = summary.decks
    .map(d => d.deck?.id)
    .filter(Boolean);

  if (deckIds.length === 0) {
    return { ok: false, error: 'no_deck_ids_in_summary' };
  }

  // 1. Full deck content (questions + language)
  const { data: deckRows, error: deckErr } = await supabase
    .from('decks')
    .select('id, title, section, language, questions')
    .in('id', deckIds);
  if (deckErr) return { ok: false, error: `deck_fetch_failed: ${deckErr.message}` };

  const fullDecks = (deckRows || []).map(d => ({
    id: d.id,
    title: d.title,
    section: d.section,
    language: d.language,
    questions: Array.isArray(d.questions) ? d.questions : [],
  }));

  // Determine the dominant language across the decks. Used both as the
  // hint for the AI and as the language of the saved deck row.
  const langCounts = {};
  fullDecks.forEach(d => {
    if (d.language) langCounts[d.language] = (langCounts[d.language] || 0) + 1;
  });
  const inferredLang =
    Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || lang;

  // 2. Weak points from session_insights aggregated across all sessions
  //    of this unit.
  const aggregatedWeakPoints = await fetchAggregatedWeakPoints(deckIds);

  // 3. Build the context + messages
  const context = buildNarrativeContext({ unit, classObj, summary, lang: inferredLang });
  const messages = buildReviewDeckMessages(context, fullDecks, aggregatedWeakPoints);

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
  // Return inferredLang too so the caller saves the deck with the
  // language that matches the source content (not the UI language).
  return { ok: true, questions, inferredLang };
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Aggregate weak_points across all session_insights rows for sessions
 * whose deck_id is in the given list. Merges duplicates (same label
 * across multiple sessions) and sums fail counts.
 *
 * Returns: [{label, fail_pct, fail_count, total, sessionCount}, ...]
 *          sorted by fail_pct desc.
 *
 * If anything fails, returns [] — the prompt handles "no weak points"
 * by distributing review evenly across decks.
 */
async function fetchAggregatedWeakPoints(deckIds) {
  if (!Array.isArray(deckIds) || deckIds.length === 0) return [];
  try {
    // 1. Get sessions for these decks
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .in('deck_id', deckIds);
    if (!sessions || sessions.length === 0) return [];

    // 2. Get session_insights for those sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: insights } = await supabase
      .from('session_insights')
      .select('weak_points')
      .in('session_id', sessionIds)
      .eq('status', 'ready');
    if (!insights || insights.length === 0) return [];

    // 3. Flatten all weak_points + merge by label
    // Each insight.weak_points is an array of {label, fail_pct,
    // fail_count, total, top_failers, question_ids}.
    const byLabel = new Map();
    for (const ins of insights) {
      const wps = Array.isArray(ins.weak_points) ? ins.weak_points : [];
      for (const wp of wps) {
        if (!wp?.label) continue;
        const key = wp.label.trim().toLowerCase();
        const existing = byLabel.get(key);
        if (existing) {
          existing.fail_count += wp.fail_count || 0;
          existing.total += wp.total || 0;
          existing.sessionCount += 1;
        } else {
          byLabel.set(key, {
            label: wp.label,
            fail_count: wp.fail_count || 0,
            total: wp.total || 0,
            sessionCount: 1,
          });
        }
      }
    }

    // 4. Compute aggregate fail_pct and sort
    return Array.from(byLabel.values())
      .map(wp => ({
        ...wp,
        fail_pct: wp.total > 0 ? Math.round((wp.fail_count / wp.total) * 100) : 0,
      }))
      .sort((a, b) => b.fail_pct - a.fail_pct);
  } catch (err) {
    // Soft fail — the prompt handles empty weak points
    return [];
  }
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
