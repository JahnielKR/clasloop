// ─── Clasloop AI image generation endpoint ───────────────────────────────
// Track A (A-img-3): when a teacher picks "Generate with AI" as the image
// source, the question generator emits an `image_prompt` per question and the
// client (src/lib/ai-images.js) calls this endpoint once per prompt to turn it
// into a picture. One prompt in → one image out.
//
//   1. JWT + teacher gate (shared api/_lib/auth.js).
//   2. Daily cap scoped to activity_type='image_generation' so it has its own
//      budget, separate from question generation.
//   3. Calls gemini-2.5-flash-image (callGeminiImage adapter) and returns the
//      base64 image + mimeType. The client uploads it to Storage and sets the
//      question's image_url — the same field the editor, live quiz and PDF
//      export already render.
//
// Env (same as api/generate.js):
//   - GEMINI_API_KEY (the image model must be enabled + billing-on for the key)
//   - SUPABASE_URL, SUPABASE_SERVICE_KEY

import { requireTeacher, requireDailyRateLimit } from './_lib/auth.js';
import { callGeminiImage, GEMINI_IMAGE_MODEL } from './_lib/gemini.js';

// Image generation costs more than text, so it gets its own, separate daily
// budget. 120/day comfortably covers a real teacher prepping a week of decks
// (the client caps each generation at ~6 images) while bounding abuse cost.
const IMAGE_RATE_LIMIT_PER_DAY = 120;

// A question-illustration prompt is a short scene description; anything longer
// is almost certainly junk pasted in. Cap defensively (the client builds these,
// but the endpoint must not trust its input).
const MAX_PROMPT_CHARS = 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const auth = await requireTeacher(req, res);
  if (!auth) return; // error response already sent
  const supabaseAdmin = auth.supabase;
  const userId = auth.user.id;

  const okRate = await requireDailyRateLimit(
    res, supabaseAdmin, userId, IMAGE_RATE_LIMIT_PER_DAY,
    `You've reached ${IMAGE_RATE_LIMIT_PER_DAY} AI image generations in the last 24 hours. Try again later.`,
    { activityType: 'image_generation' },
  );
  if (!okRate) return;

  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== 'string' || prompt.trim().length < 3) {
      return res.status(400).json({ error: 'missing_prompt' });
    }
    const safePrompt = prompt.trim().slice(0, MAX_PROMPT_CHARS);

    const result = await callGeminiImage({ apiKey: GEMINI_API_KEY, prompt: safePrompt });

    if (!result.ok) {
      // Log server-side, return a generic AI-service error. CRITICAL: this code
      // is distinct from the teacher gate's 403 so the client can show "the AI
      // image service had a problem" instead of "only teachers can do this".
      console.error(`[generate-image] Gemini ${result.status}: ${(result.error || '').slice(0, 500)}`);
      const status = result.status >= 400 && result.status < 600 ? result.status : 502;
      return res.status(status).json({ error: 'image_generation_failed', status: result.status });
    }

    // Log for metrics + to feed the daily cap counter. Awaited because Vercel
    // kills the lambda on return (a fire-and-forget insert would be lost). A
    // logging failure must not deny the teacher the image they just paid for.
    try {
      const { error: insertErr } = await supabaseAdmin
        .from('ai_generations')
        .insert({
          teacher_id: userId,
          activity_type: 'image_generation',
          num_questions: 1,
          model_used: GEMINI_IMAGE_MODEL,
          input_type: 'image_prompt',
          input_size_chars: safePrompt.length,
        });
      if (insertErr) console.error('ai_generations (image) insert failed:', insertErr);
    } catch (logErr) {
      console.error('ai_generations (image) insert threw:', logErr);
    }

    return res.status(200).json({ image: result.image, mimeType: result.mimeType });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
