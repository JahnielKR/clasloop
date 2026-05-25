// ─── Clasloop — Cleo in-app assistant ────────────────────────────────────────
// A logged-in TEACHER chats with Cleo. She does two things:
//   1. Explains how Clasloop works (grounded on api/_lib/cleo-knowledge.js).
//   2. Answers questions about the teacher's OWN classes, students and
//      spaced-repetition progress, by calling the read-only data tools in
//      api/_lib/cleo-tools.js (Gemini function calling).
//
// POST-only, JWT + teacher gate via api/_lib/auth.js; the API key stays
// server-side. The conversation isn't persisted. Tenant isolation lives in
// cleo-tools.js (every tool is scoped to classes the teacher owns).
//
// Env required in Vercel: GEMINI_API_KEY (Google AI Studio key).
import { requireTeacher } from './_lib/auth.js';
import { SYSTEM } from './_lib/cleo-knowledge.js';
import { TOOL_DECLARATIONS, executeCleoTool } from './_lib/cleo-tools.js';

const MODEL = 'gemini-3.5-flash';
const MAX_HISTORY = 8;       // keep the last N turns (context + cost cap)
const MAX_MSG_CHARS = 1000;  // per-message length cap (anti-abuse)
const MAX_TOOL_ROUNDS = 5;   // safety cap on the function-calling loop

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  // Teacher gate. We reuse the returned SERVICE_KEY client + user id for the
  // data tools — tenant scoping is enforced in cleo-tools.js.
  const auth = await requireTeacher(req, res);
  if (!auth) return;
  const supabase = auth.supabase;
  const teacherId = auth.user.id;

  // ── Parse + sanitize the conversation ──────────────────
  const body = req.body || {};
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages = raw
    .slice(-MAX_HISTORY)
    .map((m) => ({
      // Gemini roles are "user" / "model".
      role: m && m.role === 'model' ? 'model' : 'user',
      text: typeof m?.text === 'string' ? m.text.slice(0, MAX_MSG_CHARS).trim() : '',
    }))
    .filter((m) => m.text);

  if (messages.length === 0) {
    return res.status(400).json({ error: 'missing_message' });
  }
  if (messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'last_message_not_user' });
  }

  const contents = messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

  try {
    let reply = '';
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callGemini(GEMINI_API_KEY, contents);
      if (!data) return res.status(502).json({ error: 'upstream_error' });

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const calls = parts.filter((p) => p && p.functionCall).map((p) => p.functionCall);

      // No tool calls → the model answered. Use its text and stop.
      if (calls.length === 0) {
        reply = parts.map((p) => p?.text || '').join('').trim();
        break;
      }

      // Append the model's function-call turn verbatim, run each tool, then
      // feed the results back so the model can compose the final answer.
      contents.push({ role: 'model', parts });
      const responseParts = [];
      for (const call of calls) {
        const result = await executeCleoTool(call.name, call.args || {}, { supabase, teacherId });
        responseParts.push({
          functionResponse: {
            name: call.name,
            // Gemini 3 emits a per-call id that must be echoed back.
            ...(call.id ? { id: call.id } : {}),
            response: result,
          },
        });
      }
      contents.push({ role: 'user', parts: responseParts });
    }

    if (!reply) {
      // Safety filter, empty completion, or hit the tool-round cap without a
      // final answer. Surface a graceful non-error signal for the client.
      return res.status(200).json({ reply: '', blocked: true });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('[cleo-chat] failed:', err);
    return res.status(502).json({ error: 'upstream_error' });
  }
}

// One generateContent call with the tools declared. Returns the parsed JSON, or
// null on a non-2xx (logged server-side, never echoed to the client).
async function callGemini(apiKey, contents) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
        generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
      }),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[cleo-chat] Gemini ${resp.status}: ${errText.slice(0, 500)}`);
    return null;
  }
  return resp.json();
}
