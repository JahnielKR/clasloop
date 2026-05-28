// ─── api/analytics-narrative.js ─────────────────────────────────────────
// F5 Analytics Studio: genera una narrativa Cleo (~2-3 frases pedagógicas
// en el idioma del docente) sobre los datos analíticos de una clase o
// alumno. Se invoca desde CleoStrip + CleoStudentStrip.
//
// Auth: requireTeacher (JWT + role check).
// Modelo: Gemini Flash (mismo que cleo-chat — usa GEMINI_API_KEY).
// Contexto: se confía en el caller (cliente lo construye con
// src/lib/analytics/cleo-analytics.ts). El docente solo puede pedir
// narrativa sobre clases que la RPC ya le devolvió (ownership guard
// dentro de las RPCs hace de gate de tenant).

import { requireTeacher } from './_lib/auth.js';

const MODEL = 'gemini-3.5-flash';
const MAX_CTX_BYTES = 4000; // hard ceiling — context viene compacto

const SYSTEM_BY_LANG = {
  es: `Eres Cleo, asistente analítico de un docente en Clasloop. Recibes un objeto JSON con datos REALES de la clase o de un alumno (kpis, temas con peor retención, preguntas más falladas, tendencia reciente). Tu trabajo es escribir UNA narrativa pedagógica BREVE (máximo 3 frases, total < 300 caracteres) en español:
1. Un veredicto general ("Esta clase rinde bien en X pero le cuesta Y" / "Lucía cae en fracciones").
2. La señal más urgente accionable (qué reenseñar primero, o cuál alumno mirar).
3. Tono cálido pero PROFESIONAL. NO inventes datos. NO uses emojis. NO repitas los números literales del JSON — interprétalos.`,
  en: `You are Cleo, an analytics assistant for a teacher on Clasloop. You receive a JSON object with REAL class or student data (kpis, weakest topics, most-missed questions, recent trend). Your job is to write ONE brief pedagogical narrative (max 3 sentences, total < 300 chars) in English:
1. An overall verdict ("This class is strong on X but struggles with Y" / "Lucia is dropping in fractions").
2. The most urgent actionable signal (what to reteach first, or which student to look at).
3. Warm but PROFESSIONAL tone. Do NOT invent data. Do NOT use emojis. Do NOT echo the JSON numbers verbatim — interpret them.`,
  ko: `너는 Clasloop의 교사용 분석 보조 Cleo다. 실제 학급 또는 학생 데이터(KPI, 약한 주제, 가장 자주 틀린 문제, 최근 추세)가 JSON으로 전달된다. 한국어로 짧은 교육적 내러티브를 작성하라 (최대 3문장, 300자 이하):
1. 전체 평가 ("이 반은 X는 강하지만 Y가 약하다" 같은 식).
2. 가장 시급한 실행 신호 (먼저 다시 가르칠 것 / 주목해야 할 학생).
3. 따뜻하지만 전문적인 어조. 데이터를 지어내지 말 것. 이모지 금지. JSON의 숫자를 그대로 반복하지 말고 해석하라.`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const auth = await requireTeacher(req, res);
  if (!auth) return;

  const body = req.body || {};
  const context = body.context;
  if (!context || typeof context !== 'object') {
    return res.status(400).json({ error: 'missing_context' });
  }
  const lang = ['en', 'es', 'ko'].includes(context.lang) ? context.lang : 'es';

  const contextJson = JSON.stringify(context);
  if (contextJson.length > MAX_CTX_BYTES) {
    return res.status(400).json({ error: 'context_too_large' });
  }

  const systemText = SYSTEM_BY_LANG[lang] || SYSTEM_BY_LANG.es;
  const userText = `JSON:\n${contextJson}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: { maxOutputTokens: 220, temperature: 0.4 },
        }),
      }
    );
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[analytics-narrative] Gemini ${resp.status}: ${errText.slice(0, 500)}`);
      return res.status(502).json({ error: 'upstream_error' });
    }
    const data = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('').trim() || '';
    if (!text) {
      return res.status(200).json({ narrative: '', blocked: true });
    }
    return res.status(200).json({ narrative: text });
  } catch (err) {
    console.error('[analytics-narrative] failed:', err);
    return res.status(502).json({ error: 'upstream_error' });
  }
}
