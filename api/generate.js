// ─── Clasloop AI generation endpoint ─────────────────────
// Bloque 1 — Asegurar endpoint:
//   1. Verifica JWT de Supabase desde Authorization header
//   2. Confirma que el user existe en `profiles` y tiene role === "teacher"
//   3. Rate limit: 50 generaciones por profe por 24h (consulta tabla ai_generations)
//   4. Loggea cada llamada en ai_generations (input_type, num_questions, etc.)
//
// Variables de entorno requeridas en Vercel:
//   - ANTHROPIC_API_KEY (ya existía)
//   - SUPABASE_URL (NUEVA en backend; mismo valor que VITE_SUPABASE_URL)
//   - SUPABASE_SERVICE_KEY (NUEVA; service_role key, NO la anon)

import { createClient } from '@supabase/supabase-js';

const RATE_LIMIT_PER_DAY = 50;

// Mapping de "rol" lógico a modelo concreto. El frontend manda `model: "primary"`
// o `model: "validator"` y aquí lo traducimos. Esto deja preparado Bloque 4
// (validación con Haiku) sin tener que tocar el endpoint.
const MODELS = {
  primary: 'claude-sonnet-4-5-20250929',   // generación de preguntas (calidad)
  validator: 'claude-haiku-4-5-20251001',  // validación semántica / tareas mecánicas
};
const DEFAULT_MODEL_KEY = 'primary';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase backend credentials not configured' });
  }

  // ── 1. Validar JWT ─────────────────────────────────────
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Cliente de servicio: usa service key, bypassea RLS para chequeos administrativos.
  // Ojo: NUNCA exponer este cliente fuera del backend.
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const userId = userData.user.id;

  // ── 2. Confirmar que es teacher ────────────────────────
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    return res.status(401).json({ error: 'Profile not found' });
  }
  if (profile.role !== 'teacher') {
    return res.status(403).json({ error: 'Only teachers can generate questions' });
  }

  // ── 3. Rate limit ──────────────────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: countErr } = await supabaseAdmin
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', userId)
    .gte('created_at', since);

  if (countErr) {
    // Si la tabla no existe o hay error de DB, no bloqueamos — pero loggeamos.
    // Cuando ai_generations esté creada en producción esto deja de ocurrir.
    console.error('Rate limit query failed:', countErr);
  } else if ((recentCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `You've reached ${RATE_LIMIT_PER_DAY} generations in the last 24 hours. Try again later.`,
    });
  }

  // ── 4. Llamar a Anthropic ──────────────────────────────
  try {
    const {
      messages,
      system,                                 // System prompt aparte (Bloque 2)
      model = DEFAULT_MODEL_KEY,              // 'primary' | 'validator'
      max_tokens = 2000,
      // Metadata opcional que el frontend puede mandar para que loggeemos mejor.
      activity_type = 'unknown',
      num_questions = 0,
      input_type = 'text',
      input_size_chars = 0,
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const modelString = MODELS[model] || MODELS[DEFAULT_MODEL_KEY];

    const anthropicBody = {
      model: modelString,
      max_tokens,
      messages,
    };
    if (typeof system === 'string' && system.trim()) {
      anthropicBody.system = system;
    }

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      return res.status(anthropicResp.status).json({ error: errText });
    }

    const data = await anthropicResp.json();

    // ── 5. Loggear la generación (no bloqueante) ─────────
    // Si esto falla, no rompemos la respuesta al profe.
    const outputRaw = (() => {
      try {
        const text = (data.content || [])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        const clean = text.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
      } catch {
        return null;
      }
    })();

    supabaseAdmin
      .from('ai_generations')
      .insert({
        teacher_id: userId,
        activity_type,
        num_questions,
        model_used: modelString,
        input_type,
        input_size_chars,
        output_raw: outputRaw,
      })
      .then(({ error }) => {
        if (error) console.error('ai_generations insert failed:', error);
      });

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
