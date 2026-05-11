// ─── Edge Function: generate-insight ────────────────────────────────────
//
// Triggered by a Supabase Database Webhook when sessions.status changes
// to 'completed'. The webhook payload includes the updated row. We:
//
//   1. Read the session, deck (with questions jsonb), responses, and
//      participants for this session
//   2. Compute weak-point candidates from real data (insight-prep)
//   3. If 0 candidates → mark insight as 'empty' and return
//   4. Otherwise call Haiku to generate human-readable labels
//   5. Save the final weak_points array with status='ready'
//
// If any step fails (Haiku error, parse failure, DB error), we mark
// the insight as 'failed' with an error_message. Retries are allowed
// once: if the insight row already exists with status='failed' AND
// attempts < 2, this run re-attempts. Otherwise idempotent (does
// nothing if status is already 'ready' or 'empty').
//
// Auth: this function bypasses RLS via SUPABASE_SERVICE_ROLE_KEY.
// The webhook itself must be authenticated (configured in the
// Database Webhook UI with a header).

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCandidates } from "./insight-prep.ts";
import type { Question, Response, Participant } from "./insight-prep.ts";
import { buildInsightPrompt, parseHaikuResponse } from "./insight-prompt.ts";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 300;

interface WebhookPayload {
  type: string;
  table: string;
  record: { id: string; status: string; deck_id: string; [k: string]: any };
  old_record?: { status: string; [k: string]: any };
}

interface DeckRow {
  id: string;
  questions: any[];
  class_id: string;
  language: string | null;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  // Only POST allowed (webhooks are always POST)
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  // Parse webhook payload
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  // Only act on sessions UPDATE where status became 'completed'.
  // (The webhook should already filter for this in its config, but
  // we double-check defensively.)
  if (
    payload.type !== "UPDATE" ||
    payload.table !== "sessions" ||
    payload.record?.status !== "completed"
  ) {
    return jsonResponse({ skipped: "not_a_session_completion" }, 200);
  }

  const sessionId = payload.record.id;
  const deckId = payload.record.deck_id;

  if (!sessionId || !deckId) {
    return jsonResponse({ error: "missing_session_or_deck_id" }, 400);
  }

  // Env vars (set via `supabase secrets set` or Dashboard)
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
    console.error("Missing env vars");
    return jsonResponse({ error: "missing_env_vars" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── 1. Idempotency / retry check ───────────────────────────────────
  // If a row exists already, decide whether to skip, retry, or proceed.
  const { data: existing } = await supabase
    .from("session_insights")
    .select("id, status, attempts")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "ready" || existing.status === "empty") {
      return jsonResponse({ skipped: "already_processed" }, 200);
    }
    if (existing.status === "failed" && existing.attempts >= 2) {
      return jsonResponse({ skipped: "max_attempts_reached" }, 200);
    }
    // status === 'pending' or status === 'failed' AND attempts < 2 → retry
    await supabase
      .from("session_insights")
      .update({
        status: "pending",
        attempts: (existing.attempts || 0) + 1,
        error_message: null,
      })
      .eq("session_id", sessionId);
  } else {
    // First attempt: insert pending row
    const { error: insertErr } = await supabase
      .from("session_insights")
      .insert({
        session_id: sessionId,
        status: "pending",
        attempts: 1,
      });
    if (insertErr) {
      console.error("Insert failed:", insertErr);
      return jsonResponse({ error: "insert_failed", detail: insertErr.message }, 500);
    }
  }

  // ── 2. Fetch deck + responses + participants ──────────────────────
  const [deckRes, respRes, partRes] = await Promise.all([
    supabase
      .from("decks")
      .select("id, questions, class_id, language")
      .eq("id", deckId)
      .single(),
    supabase
      .from("responses")
      .select("question_index, participant_id, is_correct, needs_review, teacher_grade")
      .eq("session_id", sessionId),
    supabase
      .from("session_participants")
      .select("id, student_name")
      .eq("session_id", sessionId),
  ]);

  if (deckRes.error || !deckRes.data) {
    await markFailed(supabase, sessionId, "deck_fetch_failed", startTime);
    return jsonResponse({ error: "deck_fetch_failed" }, 500);
  }

  const deck = deckRes.data as DeckRow;
  const rawResponses = respRes.data || [];
  const rawParticipants = partRes.data || [];

  // Transform deck.questions (jsonb array) into the Question[] shape
  // expected by insight-prep. We use the array index as the question id
  // since questions don't have UUIDs of their own in this schema.
  const questions: Question[] = (deck.questions || []).map(
    (q: any, idx: number) => ({
      id: String(idx), // synthetic id = array index as string
      text: typeof q.q === "string" ? q.q : String(q.q || ""),
      correct_answer: extractCorrectAnswer(q),
      type: q.type || "mcq",
    }),
  );

  // Map responses: question_index → string id; filter ungraded free-text
  // (needs_review=true AND teacher_grade=null means awaiting grading).
  const responses: Response[] = rawResponses
    .filter((r: any) => !(r.needs_review === true && r.teacher_grade == null))
    .map((r: any) => ({
      question_id: String(r.question_index),
      participant_id: r.participant_id,
      is_correct: r.is_correct,
    }));

  const participants: Participant[] = rawParticipants.map((p: any) => ({
    id: p.id,
    name: p.student_name || "Student",
  }));

  // ── 3. Compute candidates ─────────────────────────────────────────
  const candidates = buildCandidates(questions, responses, participants);

  if (candidates.length === 0) {
    // No question crossed the threshold → mark as 'empty' and return
    await supabase
      .from("session_insights")
      .update({
        status: "empty",
        weak_points: [],
        generated_at: new Date().toISOString(),
        generation_ms: Date.now() - startTime,
      })
      .eq("session_id", sessionId);
    return jsonResponse({ status: "empty" }, 200);
  }

  // ── 4. Call Haiku for labels ──────────────────────────────────────
  const uiLang = deck.language || "en";
  const { system, user } = buildInsightPrompt(
    candidates.map((c) => ({
      question_text: c.question_text,
      correct_answer: c.correct_answer,
    })),
    uiLang,
  );

  let haikuText: string;
  try {
    const haikuResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!haikuResp.ok) {
      const errText = await haikuResp.text();
      await markFailed(supabase, sessionId, `haiku_http_${haikuResp.status}: ${errText.slice(0, 200)}`, startTime);
      return jsonResponse({ error: "haiku_call_failed" }, 502);
    }

    const haikuData = await haikuResp.json();
    haikuText = (haikuData.content || [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
  } catch (err) {
    await markFailed(supabase, sessionId, `haiku_exception: ${String(err).slice(0, 200)}`, startTime);
    return jsonResponse({ error: "haiku_call_failed" }, 502);
  }

  const labels = parseHaikuResponse(haikuText);
  if (!labels || labels.length !== candidates.length) {
    await markFailed(supabase, sessionId, `parse_failed: got ${labels?.length || 0} labels for ${candidates.length} candidates`, startTime);
    return jsonResponse({ error: "parse_failed" }, 502);
  }

  // ── 5. Combine labels with numeric data, save ─────────────────────
  const weakPoints = candidates.map((c, i) => ({
    label: labels[i],
    fail_pct: c.fail_pct,
    fail_count: c.fail_count,
    total: c.total,
    question_ids: [c.question_id],
    top_failers: c.top_failers,
  }));

  await supabase
    .from("session_insights")
    .update({
      status: "ready",
      weak_points: weakPoints,
      model_used: HAIKU_MODEL,
      generated_at: new Date().toISOString(),
      generation_ms: Date.now() - startTime,
    })
    .eq("session_id", sessionId);

  return jsonResponse({ status: "ready", weak_points: weakPoints.length }, 200);
});

// ─── Helpers ────────────────────────────────────────────────────────────

function jsonResponse(body: any, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function markFailed(
  supabase: any,
  sessionId: string,
  errorMessage: string,
  startTime: number,
): Promise<void> {
  await supabase
    .from("session_insights")
    .update({
      status: "failed",
      error_message: errorMessage,
      generation_ms: Date.now() - startTime,
    })
    .eq("session_id", sessionId);
}

/**
 * Extract a readable "correct answer" from a question object. Question
 * shape varies by type; we normalize to a string the prompt can show.
 */
function extractCorrectAnswer(q: any): string | null {
  if (q == null) return null;

  // MCQ: q.correct is the index (or array of indices for multi)
  if (q.type === "mcq" && Array.isArray(q.options)) {
    if (Array.isArray(q.correct)) {
      return q.correct
        .map((i: number) => (q.options[i]?.text || q.options[i] || ""))
        .filter(Boolean)
        .join(", ");
    }
    if (typeof q.correct === "number") {
      return q.options[q.correct]?.text || q.options[q.correct] || null;
    }
  }

  // True/False
  if (q.type === "tf") {
    return q.correct === true ? "true" : q.correct === false ? "false" : null;
  }

  // Fill-in-the-blank
  if (q.type === "fill" && typeof q.answer === "string") {
    return q.answer;
  }

  // Free-text / open: no canonical answer
  if (q.type === "free" || q.type === "open") {
    return null;
  }

  // Match / Order / Sentence: stringify the answer struct
  if (q.answer != null) return JSON.stringify(q.answer).slice(0, 200);

  return null;
}
