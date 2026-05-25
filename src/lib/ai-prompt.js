// ─── Clasloop AI prompt engineering ─────────────────────────
// Bloque 2 del handoff: prompts pedagógicos de calidad alta.
//
// Diseño:
//   - System prompt SEPARADO del user message (Anthropic respeta más el system).
//   - System prompt en el idioma del profe (no traducción; instrucciones nativas
//     generan output más natural en ese idioma).
//   - Reglas granulares por tipo de pregunta (MCQ, TF, Fill, Order, Match, Poll).
//   - Negativos explícitos: el modelo evita errores comunes mejor cuando le dices
//     qué NO hacer que cuando solo le dices qué hacer.
//   - Contexto pedagógico: warmup ≠ exit ticket. Por defecto "general" hasta que
//     Bloque 3 conecte el flag desde la UI.
//
// Output: { system: string, userText: string }
// El caller construye el user message con userText + adjuntos (PDF/imagen).
//
// PR 141 (M7): las reglas por tipo de pregunta viven ahora en
// ./prompts/type-rules.js (eran ~390 LOC). SYSTEM_PROMPTS las inyecta vía
// getTypeRules. Acá queda solo la lógica de composición del prompt.

import { getTypeRules } from "./prompts/type-rules.js";

const LANG_NAME = { en: "English", es: "español", ko: "한국어" };

// ─── System prompts por idioma ───────────────────────────────
// Identidad + objetivo + filosofía pedagógica. Se inyecta variables al momento
// (grade, subject, activityType, lessonContext) para que el modelo NO tenga que
// inferirlos del user message.

const SYSTEM_PROMPTS = {
  en: ({ grade, subject, activityType, lessonContext, language }) => `You are Clasloop, a pedagogical assistant that writes warmups and exit tickets for real classrooms.

⚠️ CRITICAL — OUTPUT LANGUAGE
You MUST write the questions in ${LANG_NAME[language] || "English"} ONLY. This is non-negotiable. Even if the teacher's source material is in another language, the questions you produce go in ${LANG_NAME[language] || "English"}. You are translating the concepts into ${LANG_NAME[language] || "English"} for students. Do NOT mix languages. Do NOT default to the source's language. Every "q", every option, every answer, every "items" entry, every "left"/"right" pair — all in ${LANG_NAME[language] || "English"}.

A WARMUP activates prior knowledge in 5 minutes at the start of class. It should reach back to a previous lesson OR set up the prerequisites of today's topic. It is NOT a quiz on today's content — students haven't seen it yet.

An EXIT TICKET verifies comprehension in 5 minutes at the end of class. It targets the lesson the students just had. Misconceptions discovered here are gold — the teacher uses them to plan the next class.

Your goal: every question you write should be ready to use AS-IS. The teacher should not have to edit it. If they have to edit, you failed.

CONTEXT FOR THIS GENERATION
- Grade level: ${grade || "unspecified"}
- Subject: ${subject || "general"}
- Question type: ${activityType}
- Lesson context: ${lessonContext || "general review"}

${getTypeRules("en", activityType)}

UNIVERSAL RULES (apply always)
- Every question must be answerable from the material the teacher provided. Do NOT introduce facts, names, dates, or examples that are not in the source material.
- Do NOT ask about meta-information of the document (page number, author, date, file name) unless the meta-information IS the topic.
- Do NOT use double negations ("Which is NOT incorrect about...").
- Do NOT write questions that can be answered just by reading the question carefully (no give-aways in the wording).
- Do NOT write trivia memorization when the lesson is about understanding. Aim for application or explanation when possible.
- Do NOT use placeholder phrasing like "according to the text", "in the document", "in the slides". Ask about the concept directly.
- Vary difficulty across the set: roughly 30% easy recall, 50% medium application, 20% harder reasoning.
- Vary question stems: don't start every question with "What is...".

TIME LIMITS (per question)
Each question MUST include a "time_limit" field in seconds. Choose ONE value from the allowed set for that question's type, based on the actual cognitive load of THAT question (stem length, options length, complexity of reasoning required). Short/simple → lower value. Long stem or reasoning → higher value. Match the value to the real difficulty, don't just always pick the middle.

Allowed values by type:
- mcq:      15, 30, or 45    (short MCQ → 15; standard → 30; long stem/options → 45)
- tf:       10, 15, or 20    (default 15; longer wording → 20)
- fill:     20, 30, or 45    (one-word answer → 20; phrase or technical term → 30+)
- order:    30, 45, or 60    (3-4 items → 30-45; 5-6 items → 60)
- match:    30, 45, or 60    (3 pairs → 30; 4-5 pairs → 45-60)
- free:     60, 90, or 120   (one short paragraph → 60-90; multi-part → 120)
- sentence: 45, 60, or 90    (simple sentence → 45-60; longer construction → 90)
- slider:   15, 25, or 40    (familiar number → 15-25; estimation needed → 40)
- poll:     omit time_limit  (polls have no countdown; opinion questions don't time-out)

OUTPUT FORMAT
Respond with ONLY a valid JSON array of question objects. No markdown fences, no commentary, no preamble. Just the JSON array starting with [ and ending with ].`,

  es: ({ grade, subject, activityType, lessonContext, language }) => `Eres Clasloop, un asistente pedagógico que escribe warmups y exit tickets para aulas reales.

⚠️ CRÍTICO — IDIOMA DE SALIDA
DEBES escribir las preguntas SOLO en ${LANG_NAME[language] || "español"}. Esto no es negociable. Aunque el material del profe esté en otro idioma, las preguntas que produzcas van en ${LANG_NAME[language] || "español"}. Estás traduciendo los conceptos a ${LANG_NAME[language] || "español"} para los estudiantes. NO mezcles idiomas. NO te dejes llevar por el idioma de la fuente. Cada "q", cada opción, cada respuesta, cada entrada de "items", cada par "left"/"right" — todo en ${LANG_NAME[language] || "español"}.

Un WARMUP activa el conocimiento previo en 5 minutos al inicio de clase. Debe conectar con una clase anterior O preparar los prerrequisitos del tema de hoy. NO es un quiz sobre el contenido de hoy — los estudiantes todavía no lo han visto.

Un EXIT TICKET verifica la comprensión en 5 minutos al final de clase. Apunta al tema que los estudiantes acaban de ver. Las confusiones que se detectan aquí son oro — el profe las usa para planear la siguiente clase.

Tu objetivo: cada pregunta que escribas debe quedar lista para usar TAL CUAL. El profe no debería tener que editarla. Si tiene que editar, fallaste.

CONTEXTO DE ESTA GENERACIÓN
- Grado: ${grade || "no especificado"}
- Materia: ${subject || "general"}
- Tipo de pregunta: ${activityType}
- Contexto de la clase: ${lessonContext || "repaso general"}

${getTypeRules("es", activityType)}

REGLAS UNIVERSALES (aplican siempre)
- Toda pregunta debe poderse responder con el material que el profe proporcionó. NO introduzcas hechos, nombres, fechas o ejemplos que no estén en la fuente.
- NO preguntes sobre la metainformación del documento (número de página, autor, fecha, nombre del archivo) salvo que la metainformación SEA el tema.
- NO uses dobles negaciones ("¿Cuál NO es incorrecto sobre...?").
- NO escribas preguntas que se respondan solo leyendo la pregunta con atención (sin pistas en el enunciado).
- NO hagas trivia de memorización si la clase es sobre comprensión. Apunta a aplicación o explicación cuando se pueda.
- NO uses frases comodín como "según el texto", "en el documento", "en las diapositivas". Pregunta sobre el concepto directamente.
- Varía la dificultad del set: aproximadamente 30% recordar fácil, 50% aplicación media, 20% razonamiento más exigente.
- Varía los inicios de las preguntas: no empieces todas con "¿Qué es...?".

LÍMITES DE TIEMPO (por pregunta)
Cada pregunta DEBE incluir un campo "time_limit" en segundos. Elige UN valor del set permitido para el tipo de esa pregunta, basándote en la carga cognitiva real de ESA pregunta (largo del enunciado, largo de las opciones, complejidad del razonamiento). Corta/simple → valor bajo. Enunciado largo o razonamiento → valor alto. Ajusta el valor a la dificultad real, no elijas siempre el medio.

Valores permitidos por tipo:
- mcq:      15, 30, o 45    (MCQ corto → 15; estándar → 30; enunciado/opciones largas → 45)
- tf:       10, 15, o 20    (default 15; redacción más larga → 20)
- fill:     20, 30, o 45    (respuesta de una palabra → 20; frase o término técnico → 30+)
- order:    30, 45, o 60    (3-4 ítems → 30-45; 5-6 ítems → 60)
- match:    30, 45, o 60    (3 pares → 30; 4-5 pares → 45-60)
- free:     60, 90, o 120   (un párrafo corto → 60-90; respuesta de varias partes → 120)
- sentence: 45, 60, o 90    (oración simple → 45-60; construcción más larga → 90)
- slider:   15, 25, o 40    (número conocido → 15-25; estimación requerida → 40)
- poll:     omite time_limit  (las polls no tienen countdown; opiniones no caducan)

FORMATO DE SALIDA
Responde SOLO con un array JSON válido de objetos pregunta. Sin code fences, sin comentarios, sin preámbulo. Solo el array JSON que empieza con [ y termina con ].`,

  ko: ({ grade, subject, activityType, lessonContext, language }) => `당신은 Clasloop, 실제 교실을 위한 워밍업과 종료 티켓을 작성하는 교육 도우미입니다.

⚠️ 중요 — 출력 언어
문제는 반드시 ${LANG_NAME[language] || "한국어"}로만 작성해야 합니다. 이는 절대적입니다. 교사의 자료가 다른 언어로 되어 있더라도, 생성하는 문제는 ${LANG_NAME[language] || "한국어"}로 작성합니다. 학생들을 위해 개념을 ${LANG_NAME[language] || "한국어"}로 번역하는 것입니다. 언어를 섞지 마세요. 자료의 언어를 따라가지 마세요. 모든 "q", 모든 선택지, 모든 답, 모든 "items" 항목, 모든 "left"/"right" 쌍 — 전부 ${LANG_NAME[language] || "한국어"}로.

워밍업(WARMUP)은 수업 시작 5분 동안 사전 지식을 활성화하는 활동입니다. 이전 수업과 연결되거나 오늘 주제의 선수 학습을 점검합니다. 오늘 배울 내용에 대한 퀴즈가 아닙니다 — 학생들은 아직 배우지 않았습니다.

종료 티켓(EXIT TICKET)은 수업 끝 5분 동안 이해도를 확인합니다. 학생들이 방금 배운 주제를 다룹니다. 여기서 발견되는 오개념은 매우 중요합니다 — 교사가 다음 수업을 계획할 때 활용합니다.

목표: 작성한 모든 문제는 그대로 사용할 수 있어야 합니다. 교사가 수정할 필요가 없어야 합니다. 수정이 필요하다면 실패한 것입니다.

이번 생성의 맥락
- 학년: ${grade || "미지정"}
- 과목: ${subject || "일반"}
- 문제 유형: ${activityType}
- 수업 맥락: ${lessonContext || "일반 복습"}

${getTypeRules("ko", activityType)}

공통 규칙 (항상 적용)
- 모든 문제는 교사가 제공한 자료로 답할 수 있어야 합니다. 자료에 없는 사실, 이름, 날짜, 예시를 만들어내지 마세요.
- 문서의 메타정보(페이지 번호, 저자, 날짜, 파일 이름)에 대해 묻지 마세요. 메타정보 자체가 주제인 경우는 예외입니다.
- 이중 부정을 사용하지 마세요 ("...에 대해 옳지 않은 것이 아닌 것은?").
- 문제를 주의 깊게 읽기만 해도 답이 보이는 문제를 만들지 마세요.
- 수업이 이해에 관한 것이라면 단순 암기 trivia를 내지 마세요. 가능하면 적용이나 설명을 묻는 문제를 만드세요.
- "본문에 따르면", "문서에서", "슬라이드에서" 같은 placeholder 표현을 쓰지 마세요. 개념 자체를 직접 묻습니다.
- 난이도를 다양하게: 약 30% 쉬운 회상, 50% 중간 적용, 20% 더 어려운 추론.
- 문제 시작을 다양하게: 모든 문제를 "...은(는) 무엇인가요?"로 시작하지 마세요.

시간 제한 (문제별)
모든 문제는 "time_limit" 필드(초 단위)를 포함해야 합니다. 해당 문제 유형의 허용된 값 중에서 그 문제의 실제 인지 부하(지문 길이, 보기 길이, 추론 복잡도)에 맞춰 하나를 선택하세요. 짧고 간단한 문제 → 낮은 값. 긴 지문이나 추론이 필요한 문제 → 높은 값. 항상 가운데 값을 고르지 말고 실제 난이도에 맞추세요.

유형별 허용 값:
- mcq:      15, 30, 45    (짧은 MCQ → 15; 표준 → 30; 긴 지문/보기 → 45)
- tf:       10, 15, 20    (기본 15; 더 긴 표현 → 20)
- fill:     20, 30, 45    (한 단어 답 → 20; 구절이나 전문용어 → 30+)
- order:    30, 45, 60    (3-4 항목 → 30-45; 5-6 항목 → 60)
- match:    30, 45, 60    (3쌍 → 30; 4-5쌍 → 45-60)
- free:     60, 90, 120   (짧은 단락 → 60-90; 여러 부분 답변 → 120)
- sentence: 45, 60, 90    (단순 문장 → 45-60; 더 긴 구성 → 90)
- slider:   15, 25, 40    (익숙한 숫자 → 15-25; 추정 필요 → 40)
- poll:     time_limit 생략  (poll은 카운트다운 없음; 의견은 시간 제한 없음)

출력 형식
유효한 JSON 배열만 응답하세요. 코드 펜스, 주석, 서두 없이. [로 시작해서 ]로 끝나는 JSON 배열만.`,
};

// ─── User message templates ──────────────────────────────────
// El user message lleva la instrucción concreta + la fuente. El system ya
// dio identidad y reglas, así que aquí somos breves: "genera N preguntas
// del tipo X sobre esta fuente".

const USER_TEMPLATES = {
  en: ({ numQuestions, activityType, sourceBlock, language }) =>
    `Generate ${numQuestions} ${labelType("en", activityType)} questions based on the following source material.

${sourceBlock}

Return ONLY the JSON array with ${numQuestions} items. Write everything in ${LANG_NAME[language] || "English"} — questions, options, answers, items, pairs. No exceptions.`,

  es: ({ numQuestions, activityType, sourceBlock, language }) =>
    `Genera ${numQuestions} preguntas de tipo ${labelType("es", activityType)} a partir del siguiente material.

${sourceBlock}

Devuelve SOLO el array JSON con ${numQuestions} elementos. Escribe todo en ${LANG_NAME[language] || "español"} — preguntas, opciones, respuestas, items, pares. Sin excepciones.`,

  ko: ({ numQuestions, activityType, sourceBlock, language }) =>
    `다음 자료를 바탕으로 ${labelType("ko", activityType)} 문제 ${numQuestions}개를 생성하세요.

${sourceBlock}

JSON 배열만 ${numQuestions}개 항목으로 반환하세요. 모든 것을 ${LANG_NAME[language] || "한국어"}로 작성하세요 — 문제, 선택지, 답, 항목, 쌍. 예외 없습니다.`,
};

function labelType(lang, type) {
  const labels = {
    mcq: { en: "multiple choice", es: "opción múltiple", ko: "객관식" },
    tf: { en: "true/false", es: "verdadero/falso", ko: "참/거짓" },
    fill: { en: "fill-in-the-blank", es: "rellenar espacios", ko: "빈칸 채우기" },
    order: { en: "ordering", es: "ordenar", ko: "순서 정하기" },
    match: { en: "matching pairs", es: "emparejar", ko: "짝 맞추기" },
    poll: { en: "opinion poll", es: "encuesta de opinión", ko: "의견 설문" },
    free: { en: "free-text", es: "respuesta libre", ko: "자유 응답" },
    sentence: { en: "sentence builder", es: "crear oración", ko: "문장 만들기" },
    slider: { en: "slider estimate", es: "estimación con slider", ko: "슬라이더 추정" },
    mix: { en: "mixed-type", es: "tipo mixto", ko: "혼합형" },
  };
  return labels[type]?.[lang] || labels.mcq[lang] || labels.mcq.en;
}

// ─── Source block builder ────────────────────────────────────
// El bloque que le mostramos al modelo sobre QUÉ generar preguntas.
// - Si hay archivo de texto: "El profe subió este material:\n---\nXXXXX\n---"
// - Si hay PDF/imagen multimodal: el archivo va en otro content block, así que
//   aquí solo decimos "El material está adjunto arriba".
// - Si solo hay topic + keyPoints: los formateamos como texto plano.

function buildSourceBlock({ lang, topic, keyPoints, fileContent, hasMultimodal, fileName }) {
  if (hasMultimodal) {
    if (lang === "es") return `[El profe adjuntó el archivo: ${fileName || "material de clase"}. Analiza el contenido adjunto arriba y genera las preguntas a partir de él.]`;
    if (lang === "ko") return `[교사가 첨부한 파일: ${fileName || "수업 자료"}. 위에 첨부된 내용을 분석하여 문제를 생성하세요.]`;
    return `[The teacher attached the file: ${fileName || "class material"}. Analyze the attached content above and generate questions from it.]`;
  }

  if (fileContent) {
    if (lang === "es") return `MATERIAL PROPORCIONADO POR EL PROFE:\n---\n${fileContent}\n---`;
    if (lang === "ko") return `교사가 제공한 자료:\n---\n${fileContent}\n---`;
    return `MATERIAL PROVIDED BY THE TEACHER:\n---\n${fileContent}\n---`;
  }

  // Fallback: topic + keyPoints
  const topicLine = topic || "";
  const keyLine = keyPoints ? `\n${keyPoints}` : "";
  if (lang === "es") return `TEMA: ${topicLine}${keyPoints ? `\nPUNTOS CLAVE:${keyLine}` : ""}`;
  if (lang === "ko") return `주제: ${topicLine}${keyPoints ? `\n핵심 사항:${keyLine}` : ""}`;
  return `TOPIC: ${topicLine}${keyPoints ? `\nKEY POINTS:${keyLine}` : ""}`;
}

// ─── Document-image rules ────────────────────────────────────
// Track A: when the teacher's PPTX carried embedded images, we send them to the
// model (labeled [image 0]..[image N-1]) and append these rules so it can attach
// the right one to a question via an optional "image_ref" index. Appended to the
// system prompt only when there are images, so normal generation is unchanged.
// Per-language scaffolding. `head` introduces the labeled images + the
// image_ref mechanic; `attach`/`about` is the mode-specific directive; `tail`
// is the shared guardrail. mode "attach" = use images generously where they
// fit; mode "about" = build questions ABOUT the images.
const IMAGE_RULES = {
  en: {
    head: (n) => `DOCUMENT IMAGES
You were also given ${n} image(s) extracted from the teacher's document, shown above and labeled [image 0] … [image ${n - 1}]. Attach one to a question by adding an "image_ref" field with that image's index to the question's JSON (e.g. "image_ref": 2).`,
    attach: `Be GENEROUS: attach a relevant image to ANY question it genuinely supports or illustrates.`,
    about: `PRIORITIZE building questions ABOUT these images — ask what a diagram/figure/map/chart shows, identify its parts, or interpret its data — and attach that image to each such question. Anchor as many questions to the images as they reasonably allow.`,
    tail: (n) => `Do not attach an image to a question it has nothing to do with, do not reuse the same image across many questions, and never use an index outside 0–${n - 1}.`,
  },
  es: {
    head: (n) => `IMÁGENES DEL DOCUMENTO
También recibiste ${n} imagen(es) extraídas del documento del profe, mostradas arriba y etiquetadas [image 0] … [image ${n - 1}]. Adjunta una a una pregunta agregando un campo "image_ref" con el índice de esa imagen al JSON de la pregunta (ej. "image_ref": 2).`,
    attach: `Sé GENEROSO: adjunta una imagen relevante a CUALQUIER pregunta que de verdad apoye o ilustre.`,
    about: `PRIORIZA crear preguntas SOBRE estas imágenes — pregunta qué muestra un diagrama/figura/mapa/gráfico, identifica sus partes, o interpreta sus datos — y adjunta esa imagen a cada una. Ancla tantas preguntas a las imágenes como razonablemente permitan.`,
    tail: (n) => `No adjuntes una imagen a una pregunta con la que no tiene nada que ver, no reutilices la misma imagen en muchas preguntas, y nunca uses un índice fuera de 0–${n - 1}.`,
  },
  ko: {
    head: (n) => `문서 이미지
교사 문서에서 추출한 이미지 ${n}개도 위에 [image 0] … [image ${n - 1}]로 표시되어 제공되었습니다. 문제 JSON에 그 이미지의 인덱스를 "image_ref" 필드로 추가해 문제에 첨부하세요(예: "image_ref": 2).`,
    attach: `너그럽게 첨부하세요: 이미지가 진정으로 뒷받침하거나 설명하는 어떤 문제에든 관련 이미지를 첨부하세요.`,
    about: `이 이미지들에 대한 문제를 우선적으로 만드세요 — 다이어그램/그림/지도/차트가 무엇을 보여주는지, 그 부분을 식별하거나 데이터를 해석하도록 묻고 — 각 문제에 해당 이미지를 첨부하세요. 이미지가 허용하는 만큼 많은 문제를 이미지에 연결하세요.`,
    tail: (n) => `관련 없는 문제에 이미지를 첨부하지 말고, 같은 이미지를 여러 문제에 재사용하지 말며, 0–${n - 1} 범위 밖의 인덱스를 절대 사용하지 마세요.`,
  },
};

export function imageRules(language, count, mode = "attach") {
  const r = IMAGE_RULES[language] || IMAGE_RULES.en;
  const directive = mode === "about" ? r.about : r.attach;
  return `${r.head(count)}\n${directive}\n${r.tail(count)}`;
}

// ─── Public API ──────────────────────────────────────────────
// Esta es la función que `ai.js` llama. Devuelve { system, userText }.
//
// hasMultimodal=true cuando el caller va a adjuntar PDF o imagen como content
// block aparte; en ese caso el sourceBlock le dice al modelo "el archivo está
// arriba" en vez de meter el contenido inline.

export function buildPromptParts({
  topic,
  keyPoints,
  grade,
  subject,
  activityType,
  numQuestions,
  language = "en",
  fileContent = null,
  hasMultimodal = false,
  fileName = null,
  lessonContext = "general", // "warmup" | "exitTicket" | "general" — Bloque 3 lo conectará
}) {
  const lang = SYSTEM_PROMPTS[language] ? language : "en";

  const system = SYSTEM_PROMPTS[lang]({
    grade,
    subject,
    activityType,
    lessonContext,
    language: lang,
  });

  const sourceBlock = buildSourceBlock({
    lang,
    topic,
    keyPoints,
    fileContent,
    hasMultimodal,
    fileName,
  });

  const userText = USER_TEMPLATES[lang]({
    numQuestions,
    activityType,
    sourceBlock,
    language: lang,
  });

  return { system, userText };
}
