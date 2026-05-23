// ─── Clasloop — Cleo in-app help bot ─────────────────────────────────────────
// A logged-in TEACHER asks Cleo how Clasloop works / where things are; we answer
// with Google Gemini Flash, grounded on api/_lib/cleo-knowledge.js.
//
// Mirrors api/generate.js: POST-only, JWT + teacher gate via api/_lib/auth.js,
// the API key stays server-side. v1 has NO own rate-limit table — the teacher
// gate + Gemini's free-tier caps + short answers/history bound cost; nothing is
// persisted (privacy-friendly).
//
// Env required in Vercel: GEMINI_API_KEY (Google AI Studio free key).
import { requireTeacher } from './_lib/auth.js';
import { SYSTEM } from './_lib/cleo-knowledge.js';

const MODEL = 'gemini-2.0-flash';   // free-tier Flash; swap the id to change model
const MAX_HISTORY = 8;              // keep the last N turns (context + cost cap)
const MAX_MSG_CHARS = 1000;         // per-message length cap (anti-abuse)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  // Teacher gate (shared helper sends its own error envelope on failure).
  const auth = await requireTeacher(req, res);
  if (!auth) return;

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
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 400, temperature: 0.3 },
        }),
      }
    );

    if (!resp.ok) {
      // Don't echo the upstream error — log server-side, return generic.
      const errText = await resp.text();
      console.error(`[cleo-chat] Gemini ${resp.status}: ${errText.slice(0, 500)}`);
      return res.status(502).json({ error: 'upstream_error' });
    }

    const data = await resp.json();
    const reply = (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p?.text || '')
      .join('')
      .trim();

    if (!reply) {
      // Safety filter or empty completion — surface a graceful, non-error signal
      // so the client can show a "couldn't answer that" message.
      console.warn('[cleo-chat] empty/blocked reply:', JSON.stringify(data?.candidates?.[0]?.finishReason || data?.promptFeedback || {}));
      return res.status(200).json({ reply: '', blocked: true });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('[cleo-chat] failed:', err);
    return res.status(502).json({ error: 'upstream_error' });
  }
}
