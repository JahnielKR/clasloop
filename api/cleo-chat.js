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
import { TOOL_DECLARATIONS, ACTION_TOOL_NAMES, executeCleoTool, normalizeCleoAction } from './_lib/cleo-tools.js';

const MODEL = 'gemini-3.5-flash';
const MAX_HISTORY = 8;       // keep the last N turns (context + cost cap)
const MAX_MSG_CHARS = 1000;  // per-message length cap (anti-abuse)
const MAX_TOOL_ROUNDS = 5;   // safety cap on the function-calling loop
const MAX_PLAN_STEPS = 8;    // most actions Cleo will chain into one confirmation

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
  const lang = ['en', 'es', 'ko'].includes(body.lang) ? body.lang : 'en';
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
    // Light page/entity context so Cleo can tailor help and resolve "this
    // class". Built server-side (the class name is looked up scoped to this
    // teacher, so it doubles as isolation).
    const systemText = SYSTEM + (await buildContextNote(supabase, teacherId, body.context));

    let reply = '';
    const plannedSteps = []; // ordered actions awaiting ONE confirmation (the plan)

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callGemini(GEMINI_API_KEY, contents, systemText);
      if (!data) return res.status(502).json({ error: 'upstream_error' });

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const calls = parts.filter((p) => p && p.functionCall).map((p) => p.functionCall);

      // No tool calls → the model answered. Use its text and stop.
      if (calls.length === 0) {
        reply = parts.map((p) => p?.text || '').join('').trim();
        break;
      }

      // Append the model's function-call turn verbatim, then build a response
      // for each call: read tools execute now; action tools DON'T run here —
      // we normalize each into a proposed step and QUEUE it. The teacher
      // confirms the whole plan once; nothing is written until then.
      contents.push({ role: 'model', parts });
      const responseParts = [];
      for (const call of calls) {
        let response;
        if (ACTION_TOOL_NAMES.has(call.name)) {
          if (plannedSteps.length >= MAX_PLAN_STEPS) {
            response = {
              status: 'plan_full',
              note: `The plan already has ${MAX_PLAN_STEPS} steps — the most I can do at once. Wrap up in one short sentence and don't add more.`,
            };
          } else {
            const normd = await normalizeCleoAction(call.name, call.args || {}, { supabase, teacherId, lang });
            if (normd.action) {
              plannedSteps.push(normd.action);
              response = {
                status: 'queued',
                position: plannedSteps.length,
                awaiting_user_confirmation: true,
                note: 'Added to the plan. The teacher confirms the whole plan ONCE. If they asked for more, keep adding; otherwise summarize the WHOLE plan in ONE short sentence and stop calling tools — never claim anything is done yet.',
              };
            } else {
              // Couldn't resolve (e.g. class not found) — feed the error back
              // so Cleo can ask the teacher to clarify.
              response = normd;
            }
          }
        } else {
          response = await executeCleoTool(call.name, call.args || {}, { supabase, teacherId });
        }
        responseParts.push({
          functionResponse: {
            name: call.name,
            // Gemini 3 emits a per-call id that must be echoed back.
            ...(call.id ? { id: call.id } : {}),
            response,
          },
        });
      }
      contents.push({ role: 'user', parts: responseParts });
    }

    // The proposed plan goes back with whatever sentence Cleo composed (the
    // client falls back to a default prompt if the reply is empty). A single
    // step also rides along as `action` so the existing single-card path keeps
    // working untouched.
    if (plannedSteps.length) {
      const payload = { reply, plan: plannedSteps };
      if (plannedSteps.length === 1) payload.action = plannedSteps[0];
      return res.status(200).json(payload);
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

// Build a short context note appended to the system prompt. Resolves the
// current class name scoped to this teacher (also acts as tenant isolation —
// another teacher's class id never resolves). Returns '' when there's nothing
// useful to add. Never throws (context is best-effort).
async function buildContextNote(supabase, teacherId, context) {
  try {
    if (!context || typeof context !== 'object') return '';
    const lines = [];
    if (typeof context.page === 'string' && context.page.trim()) {
      lines.push(`The teacher is currently on the "${context.page.trim()}" page of Clasloop.`);
    }
    if (typeof context.classId === 'string' && context.classId) {
      const { data } = await supabase
        .from('classes')
        .select('name')
        .eq('id', context.classId)
        .eq('teacher_id', teacherId)
        .maybeSingle();
      if (data?.name) {
        lines.push(`They are viewing the class "${data.name}" — if they say "this class", they mean this one.`);
      }
    }

    // F5: Analista Cleo — el front-end pasa analyticsClassId para que Cleo
    // razone sobre los datos en vivo de esa clase. Llamamos class_analytics
    // server-side (RPC tiene ownership guard) y agregamos un resumen al system.
    if (typeof context.analyticsClassId === 'string' && context.analyticsClassId) {
      try {
        const { data: ca } = await supabase.rpc('class_analytics', {
          p_class_id: context.analyticsClassId,
          p_from: null,
          p_to: null,
        });
        if (ca) {
          // Resumen ULTRA compacto (< 1KB) para no inflar el prompt
          const k = ca.kpis || {};
          const top3Weak = (ca.topic_mastery || [])
            .filter((t) => t.retention_score != null)
            .sort((a, b) => a.retention_score - b.retention_score)
            .slice(0, 3)
            .map((t) => `${t.topic} (${t.retention_score}%)`)
            .join(', ');
          const missed = (ca.most_missed || [])
            .slice(0, 3)
            .map((m) => `Q${m.question_index + 1}/${m.topic || '?'} ${Math.round(m.error_rate)}% err`)
            .join('; ');
          lines.push(`ANALYTICS CONTEXT — class "${ca.class_id?.slice(0, 8) || ''}":
- pct_correct ${k.pct_correct ?? '?'}%, participants ${k.unique_participants ?? '?'}, responses ${k.responses_total ?? '?'}.
- Weakest topics: ${top3Weak || '(none)'}.
- Top missed questions: ${missed || '(none)'}.
Use these numbers when the teacher asks about THIS class. Do NOT echo them verbatim — interpret them.`);
        }
      } catch (e) {
        // Soft fail — la conversación sigue sin context
        console.warn('[cleo-chat] analytics context fetch failed:', e?.message);
      }
    }

    return lines.length ? `\n\nCURRENT CONTEXT:\n${lines.join('\n')}` : '';
  } catch {
    return '';
  }
}

// One generateContent call with the tools declared. Returns the parsed JSON, or
// null on a non-2xx (logged server-side, never echoed to the client).
async function callGemini(apiKey, contents, systemText) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText || SYSTEM }] },
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
