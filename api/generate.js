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

import { requireTeacher, requireDailyRateLimit } from './_lib/auth.js';

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
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  // PR 142b: JWT + teacher gate + daily rate limit via api/_lib/auth.js.
  // Aliased to the previous local names so the rest of the handler is unchanged.
  const auth = await requireTeacher(req, res);
  if (!auth) return; // error response already sent
  const supabaseAdmin = auth.supabase;
  const userId = auth.user.id;

  const okRate = await requireDailyRateLimit(
    res, supabaseAdmin, userId, RATE_LIMIT_PER_DAY,
    `You've reached ${RATE_LIMIT_PER_DAY} generations in the last 24 hours. Try again later.`,
  );
  if (!okRate) return;

  // ── 4. Llamar a Anthropic ──────────────────────────────
  try {
    const {
      messages,
      system,
      // PR 94: el cliente NO controla qué model se usa. Hardcodeamos
      // el primary server-side. Si en el futuro hace falta exponer
      // más, hacerlo con un allowlist explícito (no echo del input).
      // model = DEFAULT_MODEL_KEY,  // ← ignored from req.body
      max_tokens = 2000,
      // Bloque 4: si validate=true y el modelo es "primary", corremos un
      // segundo call a Haiku para filtrar.
      validate = false,
      // Shadow mode: corre el validador y loggea los rejects, pero NO
      // filtra el output. Se usa para juntar data sobre qué rechaza Haiku
      // sin disrumpir a los profes. Cuando tengamos suficientes reasons,
      // ajustamos el prompt del validador y volvemos a validate:true.
      validateShadow = false,
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
      return res.status(400).json({ error: 'missing_messages' });
    }

    // PR 94: hardening defensivo del input.
    // - model: ignoramos lo que mande el cliente, siempre primary.
    // - max_tokens: cap server-side (cliente no puede pedir 64000).
    // - system: cap de tamaño para evitar puffs anormales.
    const modelString = MODELS[DEFAULT_MODEL_KEY];

    const MAX_TOKENS_CAP = 8000;
    const requestedTokens = parseInt(max_tokens, 10);
    const safeMaxTokens = Math.min(
      Math.max(Number.isFinite(requestedTokens) ? requestedTokens : 2000, 1),
      MAX_TOKENS_CAP
    );

    const MAX_SYSTEM_CHARS = 8000;
    if (typeof system === 'string' && system.length > MAX_SYSTEM_CHARS) {
      return res.status(400).json({ error: 'system_prompt_too_long' });
    }

    const anthropicBody = {
      model: modelString,
      max_tokens: safeMaxTokens,
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
      // PR 94: no echo del error crudo de Anthropic — puede tener
      // detalles internos. Loguear server-side, devolver genérico.
      const errText = await anthropicResp.text();
      console.error(`[generate] Anthropic ${anthropicResp.status}: ${errText.slice(0, 500)}`);
      return res.status(anthropicResp.status).json({
        error: 'upstream_error',
        status: anthropicResp.status,
      });
    }

    const data = await anthropicResp.json();

    // ── 5. Parsear el output del modelo principal ────────
    const outputRaw = parseQuestionsArray(data);

    // ── 6. Validación semántica con Haiku (Bloque 4) ─────
    // Solo si:
    //   - el cliente lo pidió (validate=true o validateShadow=true)
    //   - tenemos un array de preguntas parseable (sin él Haiku no tiene
    //     nada que evaluar)
    // Antes había un guard `model === 'primary'`, pero desde PR 94 el modelo se
    // fija server-side a primary y `model` dejó de existir en este scope — el
    // guard tiraba "model is not defined" y rompía toda generación con
    // validate=true. El modelo aquí siempre es primary, así que se elimina.
    let validationResult = null;
    // Run the validator if either flag is on. validateShadow gives us the
    // logs without applying the filter (used while we re-tune Haiku for
    // Sonnet 4.6).
    const shouldRunValidator = (validate || validateShadow) &&
      Array.isArray(outputRaw) &&
      outputRaw.length > 0;
    if (shouldRunValidator) {
      try {
        validationResult = await validateWithHaiku({
          questions: outputRaw,
          grade,
          subject,
          lessonContext: lesson_context,
          apiKey: ANTHROPIC_API_KEY,
        });
        // Shadow mode logging: dump the WHOLE drop report at once, prefixed,
        // so it's easy to grep in Vercel logs. Includes the prompt + reason
        // for each rejected question so we can spot patterns.
        if (validateShadow && validationResult && Array.isArray(validationResult.dropReasons)) {
          const dropped = validationResult.dropReasons;
          const total = outputRaw.length;
          console.log(`[validator-shadow] ${dropped.length}/${total} would be dropped (subject=${subject || 'n/a'} grade=${grade || 'n/a'} ctx=${lesson_context || 'n/a'} type=${activity_type})`);
          for (const dr of dropped) {
            // PR 94: no logueamos el contenido de la pregunta — puede tener
            // PII pegada por el profe. Solo el índice + razón.
            console.log(`[validator-shadow]   #${dr.i} reason="${dr.reason}"`);
          }
        }
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
    // CRITICAL: in shadow mode we DO NOT replace the content. The validator
    // output exists only as logs; the teacher gets the unfiltered raw set.
    let responseData = data;
    let outputFiltered = null;
    let validationDroppedCount = 0;

    if (validate && validationResult && Array.isArray(validationResult.kept) && Array.isArray(validationResult.dropReasons)) {
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
        // Metadata extra para el cliente. `reasons` es un array de strings
        // (no índices) — el frontend los agrupa por frecuencia para mostrar
        // al profe el motivo más común si Haiku descarta todas las
        // preguntas (ej. "Spanish lesson content, not history" cuando el
        // subject del deck no coincide con el topic pedido).
        validation: {
          kept: outputFiltered.length,
          dropped: validationDroppedCount,
          reasons: validationResult.dropReasons.map(d => d.reason).filter(Boolean),
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
