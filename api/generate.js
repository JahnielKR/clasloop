// ─── Clasloop AI generation endpoint ─────────────────────
// Bloque 1 — Asegurar endpoint:
//   1. Verifica JWT de Supabase desde Authorization header
//   2. Confirma que el user existe en `profiles` y tiene role === "teacher"
//   3. Rate limit: 50 generaciones por profe por 24h (consulta tabla ai_generations)
//   4. Loggea cada llamada en ai_generations (input_type, num_questions, etc.)
//
// Bloque 4 — Validación semántica (LLM-as-judge):
//   Cuando el cliente pide `validate: true` Y el modelo principal es "primary"
//   (Sonnet generando preguntas), hacemos un segundo call a Haiku que revisa
//   cada pregunta y dice ok/reject. Filtramos las rechazadas antes de devolver.
//   Si Haiku falla por cualquier motivo, devolvemos sin filtrar (no bloqueamos).
//
// Variables de entorno requeridas en Vercel:
//   - ANTHROPIC_API_KEY (ya existía)
//   - SUPABASE_URL (mismo valor que VITE_SUPABASE_URL)
//   - SUPABASE_SERVICE_KEY (service_role key, NO la anon)

import { createClient } from '@supabase/supabase-js';

const RATE_LIMIT_PER_DAY = 50;

// Mapping de "rol" lógico a modelo concreto. El frontend manda `model: "primary"`
// o `model: "validator"` y aquí lo traducimos.
const MODELS = {
  primary: 'claude-sonnet-4-6',             // generación de preguntas (calidad)
  validator: 'claude-haiku-4-5-20251001',  // validación semántica (Bloque 4)
};
const DEFAULT_MODEL_KEY = 'primary';

// System prompt para el judge. Inglés a propósito (mejor consistencia en
// modelos LLM-as-judge). Las preguntas que evalúa pueden venir en cualquier
// idioma — Haiku las evalúa por mérito.
const VALIDATOR_SYSTEM = `You are a pedagogical reviewer for classroom warmups and exit tickets. For each question in the input array, decide whether a real teacher would use it AS-IS (no edits needed) for the given grade and subject.

Reject a question only when:
- It is ambiguous or has more than one valid correct answer
- The marked correct answer is objectively wrong
- It requires knowledge NOT plausibly present in the source material described
- For MCQ: distractors are absurd or trivially eliminable at first glance
- It contains grammatical errors, typos, or unclear phrasing
- It tests rote trivia when the lesson context is comprehension
- For matching: a left item plausibly matches more than one right
- For ordering: items can defensibly be in different orders
- For fill: the answer is genuinely ambiguous given the sentence

Accept everything else. WHEN IN DOUBT, ACCEPT — the teacher can edit minor things, you should only catch real defects.

Questions can be in any language (English, Spanish, Korean). Evaluate them on their merits, not their language.

Return ONLY a JSON array of verdicts, one per input question, in the same order:
[{"i": 0, "ok": true}, {"i": 1, "ok": false, "reason": "two correct answers"}, ...]

Reasons should be short (max 8 words), only for rejected questions.`;

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
      system,
      model = DEFAULT_MODEL_KEY,
      max_tokens = 2000,
      // Bloque 4: si validate=true y el modelo es "primary", corremos un
      // segundo call a Haiku para filtrar.
      validate = false,
      // Metadata opcional para logging / contexto del judge.
      activity_type = 'unknown',
      num_questions = 0,
      input_type = 'text',
      input_size_chars = 0,
      grade,
      subject,
      lesson_context,
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

    // ── 5. Parsear el output del modelo principal ────────
    const outputRaw = parseQuestionsArray(data);

    // ── 6. Validación semántica con Haiku (Bloque 4) ─────
    // Solo si:
    //   - el cliente lo pidió (validate=true)
    //   - el modelo principal era "primary" (validar la salida del validator
    //     no tiene sentido)
    //   - tenemos un array de preguntas parseable (sin él Haiku no tiene
    //     nada que evaluar)
    let validationResult = null;
    if (
      validate &&
      model === 'primary' &&
      Array.isArray(outputRaw) &&
      outputRaw.length > 0
    ) {
      try {
        validationResult = await validateWithHaiku({
          questions: outputRaw,
          grade,
          subject,
          lessonContext: lesson_context,
          apiKey: ANTHROPIC_API_KEY,
        });
      } catch (err) {
        // Si Haiku falla por cualquier motivo, NO bloqueamos al profe.
        // Mejor preguntas sin validar que ninguna pregunta.
        console.error('Validator (Haiku) failed:', err);
        validationResult = { error: err.message || String(err) };
      }
    }

    // Si la validación corrió y filtró algo, reemplazamos el content del
    // response con las preguntas filtradas. Si falló o no se pidió, dejamos
    // todo como vino del modelo principal.
    let responseData = data;
    let outputFiltered = null;
    let validationDroppedCount = 0;

    if (validationResult && Array.isArray(validationResult.kept) && Array.isArray(validationResult.dropReasons)) {
      outputFiltered = validationResult.kept;
      validationDroppedCount = validationResult.dropReasons.length;

      // Reemplazamos el text content del data con el array filtrado en JSON.
      // El cliente parsea esto igual que el output crudo.
      responseData = {
        ...data,
        content: [
          ...(data.content || []).filter((b) => b.type !== 'text'),
          { type: 'text', text: JSON.stringify(outputFiltered) },
        ],
        // Metadata extra para el cliente.
        validation: {
          kept: outputFiltered.length,
          dropped: validationDroppedCount,
        },
      };
    } else if (validationResult && validationResult.error) {
      // La validación falló — devolvemos sin tocar pero le contamos al cliente
      // que se intentó (debug). El cliente trata esto como "no validation"
      // que es lo correcto: no se anuncian falsos drops.
      responseData = {
        ...data,
        validation: { error: 'validator_failed' },
      };
    }

    // ── 7. Loggear la generación ──────────
    // IMPORTANTE: en Vercel serverless, las funciones serverless terminan
    // tan pronto el handler retorna. Si el insert es fire-and-forget (sin
    // await), Vercel mata la lambda antes de que la promesa se resuelva
    // y el INSERT se pierde. Por eso awaiteamos. El catch evita que un
    // fallo en la DB bloquee la respuesta al profe (ya tiene sus preguntas).
    try {
      const { error: insertErr } = await supabaseAdmin
        .from('ai_generations')
        .insert({
          teacher_id: userId,
          activity_type,
          num_questions,
          model_used: modelString,
          input_type,
          input_size_chars,
          output_raw: outputRaw,
          // Bloque 4: si validamos y filtramos, guardamos el output filtrado
          // y el count. Bloque 7 los usa para métricas. Si la columna no
          // existe en la tabla, el insert falla pero no rompe (ver catch).
          output_filtered: outputFiltered,
          validation_dropped_count: validationDroppedCount,
        });
      if (insertErr) console.error('ai_generations insert failed:', insertErr);
    } catch (logErr) {
      console.error('ai_generations insert threw:', logErr);
    }

    return res.status(200).json(responseData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Helpers ──────────────────────────────────────────

// Parsea el array de preguntas del response de Anthropic. Tolera code-fences
// y texto basura alrededor del JSON.
function parseQuestionsArray(data) {
  try {
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const clean = text.replace(/```json|```/g, '').trim();
    try { return JSON.parse(clean); } catch { /* sigue */ }
    // Buscar el primer [ y último ] balanceados.
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) return null;
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Llama a Haiku con el array de preguntas y devuelve { kept, dropReasons }.
// `kept` es el array filtrado (mantiene orden original); `dropReasons` es un
// array de { i, reason } para las descartadas (útil para logs).
async function validateWithHaiku({ questions, grade, subject, lessonContext, apiKey }) {
  // Limitar el número de preguntas que mandamos al judge en una sola llamada.
  // 30+ preguntas en un solo request a Haiku puede ser lento o truncar el JSON
  // de respuesta. En la práctica nunca pasaremos de 20 preguntas (Bloque 3
  // capea el cliente en 20), pero por seguridad capeamos acá también.
  const MAX_QUESTIONS_PER_VALIDATION = 25;
  if (questions.length > MAX_QUESTIONS_PER_VALIDATION) {
    questions = questions.slice(0, MAX_QUESTIONS_PER_VALIDATION);
  }

  // Construir el contexto que el judge usa para evaluar.
  const contextLines = [];
  if (grade) contextLines.push(`Grade: ${grade}`);
  if (subject) contextLines.push(`Subject: ${subject}`);
  if (lessonContext) contextLines.push(`Lesson context: ${lessonContext}`);
  const contextBlock = contextLines.length > 0
    ? `Context:\n${contextLines.join('\n')}\n\n`
    : '';

  const userText = `${contextBlock}Evaluate these ${questions.length} question(s). Return a JSON array of verdicts in the same order, one per question.

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY the JSON array of verdicts.`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELS.validator,
      // Verdicts son cortos: ~30-50 tokens por verdict. 25 preguntas * 50 = 1250.
      // Con margen 2000 tokens para que el JSON cierre bien.
      max_tokens: 2000,
      system: VALIDATOR_SYSTEM,
      messages: [{ role: 'user', content: userText }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Validator HTTP ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const judgeData = await resp.json();
  const verdicts = parseQuestionsArray(judgeData);

  if (!Array.isArray(verdicts)) {
    throw new Error('Validator returned non-array');
  }

  // Construir kept + dropReasons. El judge debería devolver el mismo número
  // de verdicts que preguntas, en el mismo orden. Si no, somos tolerantes:
  // las preguntas sin verdict explícito se consideran ACEPTADAS (filosofía
  // "in doubt, accept").
  const verdictByIndex = new Map();
  for (const v of verdicts) {
    if (v && typeof v.i === 'number') verdictByIndex.set(v.i, v);
  }

  const kept = [];
  const dropReasons = [];
  for (let i = 0; i < questions.length; i++) {
    const v = verdictByIndex.get(i);
    // Si no hay verdict para este index, o el verdict no es un objeto bien
    // formado, aceptamos por defecto.
    if (!v || v.ok === undefined || v.ok === true) {
      kept.push(questions[i]);
    } else {
      // ok === false explícito: descartar.
      dropReasons.push({ i, reason: typeof v.reason === 'string' ? v.reason : 'rejected by validator' });
      console.log(`[validator] dropped question ${i}: ${v.reason || 'no reason'}`);
    }
  }

  return { kept, dropReasons };
}
