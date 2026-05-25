// ─── api/_lib/gemini.js — Anthropic→Gemini call adapter ──────────────────────
//
// api/generate.js and api/close-unit-narrative.js were built against the
// Anthropic Messages API (system + messages with text/image/document content
// blocks). We're migrating those features from Claude to Gemini. Rather than
// rewrite the handlers — or the client (src/lib/ai.js) that builds the Anthropic
// message shape — we translate the request/response format in this one place.
//
// callGemini() takes the same `system` + `messages` the handlers already have,
// converts them to Gemini's generateContent format, calls the Google Generative
// Language API, and returns the concatenated text. Callers wrap that text back
// into `{ content: [{ type: 'text', text }] }` so the rest of their code (and
// the client) keeps working unchanged.
//
// Env: GEMINI_API_KEY (the same key Cleo uses in api/cleo-chat.js).

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Gemini's image-generation model ("Nano Banana"). Same generateContent
// endpoint as the text models, but the response carries the picture as an
// inlineData part instead of text. Exported so the endpoint can log which
// model produced an image.
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

// One Anthropic content block → one Gemini part. Unknown blocks return null and
// are filtered out by the caller. base64 image/document blocks map to inlineData.
function blockToPart(block) {
  if (block == null) return null;
  if (typeof block === 'string') return { text: block };
  if (block.type === 'text') return { text: block.text || '' };
  if (block.type === 'image' && block.source?.type === 'base64') {
    return { inlineData: { mimeType: block.source.media_type, data: block.source.data } };
  }
  if (block.type === 'document' && block.source?.type === 'base64') {
    return { inlineData: { mimeType: block.source.media_type || 'application/pdf', data: block.source.data } };
  }
  return null;
}

// Anthropic messages[] → Gemini contents[]. Anthropic role "assistant" maps to
// Gemini role "model"; everything else is "user". Content can be a string or an
// array of blocks.
function messagesToContents(messages) {
  return (messages || []).map((m) => {
    const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
    const parts = Array.isArray(m.content)
      ? m.content.map(blockToPart).filter(Boolean)
      : [{ text: typeof m.content === 'string' ? m.content : '' }];
    return { role, parts };
  });
}

// Calls Gemini generateContent. Returns { ok, text, status, error, raw }.
// On any non-2xx or network error, ok=false and the caller decides how to
// degrade (these handlers never hard-fail user-visible flows).
export async function callGemini({ apiKey, model, system, messages, maxTokens, temperature }) {
  const generationConfig = {
    // Disable "thinking" so small output budgets aren't consumed by reasoning
    // tokens — that would truncate or empty the JSON we need back. Flash and
    // Flash-Lite models allow a 0 budget.
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (Number.isFinite(maxTokens)) generationConfig.maxOutputTokens = maxTokens;
  if (Number.isFinite(temperature)) generationConfig.temperature = temperature;

  const body = { contents: messagesToContents(messages), generationConfig };
  if (typeof system === 'string' && system.trim()) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  let resp;
  try {
    resp = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }

  if (!resp.ok) {
    const errText = await resp.text();
    return { ok: false, status: resp.status, error: errText };
  }

  const data = await resp.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p?.text || '')
    .join('');
  return { ok: true, text, raw: data };
}

// Generate a single image from a text prompt. Returns
// { ok, image, mimeType, status, error }. `image` is bare base64 (no data:
// prefix). On any non-2xx, network error, or a response with no image part
// (e.g. a safety block), ok=false and the caller maps it to a user-facing
// "AI service" error — kept distinct from the teacher gate so a Gemini hiccup
// never reads as "only teachers can do this".
export async function callGeminiImage({ apiKey, prompt, model = GEMINI_IMAGE_MODEL }) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // The image model rejects thinkingConfig; it just needs IMAGE in the
    // response modalities. If a future API revision demands TEXT too, switch
    // to ['TEXT', 'IMAGE'] — we already parse defensively for the image part.
    generationConfig: { responseModalities: ['IMAGE'] },
  };

  let resp;
  try {
    resp = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }

  if (!resp.ok) {
    const errText = await resp.text();
    return { ok: false, status: resp.status, error: errText };
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p?.inlineData?.data);
  if (!imgPart) {
    // No image came back — usually a safety block or an empty candidate.
    // Surface the reason in the error string for server logs.
    const reason = data?.promptFeedback?.blockReason
      || data?.candidates?.[0]?.finishReason
      || 'no_image';
    return { ok: false, status: 502, error: `no_image:${reason}` };
  }
  return {
    ok: true,
    image: imgPart.inlineData.data,
    mimeType: imgPart.inlineData.mimeType || 'image/png',
  };
}
