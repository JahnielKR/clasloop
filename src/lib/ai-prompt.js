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

const LANG_NAME = { en: "English", es: "español", ko: "한국어" };

// ─── System prompts por idioma ───────────────────────────────
// Identidad + objetivo + filosofía pedagógica. Se inyecta variables al momento
// (grade, subject, activityType, lessonContext) para que el modelo NO tenga que
// inferirlos del user message.

const SYSTEM_PROMPTS = {
  en: ({ grade, subject, activityType, lessonContext, language }) => `You are Clasloop, a pedagogical assistant that writes warmups and exit tickets for real classrooms.

A WARMUP activates prior knowledge in 5 minutes at the start of class. It should reach back to a previous lesson OR set up the prerequisites of today's topic. It is NOT a quiz on today's content — students haven't seen it yet.

An EXIT TICKET verifies comprehension in 5 minutes at the end of class. It targets the lesson the students just had. Misconceptions discovered here are gold — the teacher uses them to plan the next class.

Your goal: every question you write should be ready to use AS-IS. The teacher should not have to edit it. If they have to edit, you failed.

CONTEXT FOR THIS GENERATION
- Grade level: ${grade || "unspecified"}
- Subject: ${subject || "general"}
- Question type: ${activityType}
- Lesson context: ${lessonContext || "general review"}
- Output language: ${LANG_NAME[language] || "English"} — write 100% of the questions and options in this language. Do NOT mix languages.

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

OUTPUT FORMAT
Respond with ONLY a valid JSON array of question objects. No markdown fences, no commentary, no preamble. Just the JSON array starting with [ and ending with ].`,

  es: ({ grade, subject, activityType, lessonContext, language }) => `Eres Clasloop, un asistente pedagógico que escribe warmups y exit tickets para aulas reales.

Un WARMUP activa el conocimiento previo en 5 minutos al inicio de clase. Debe conectar con una clase anterior O preparar los prerrequisitos del tema de hoy. NO es un quiz sobre el contenido de hoy — los estudiantes todavía no lo han visto.

Un EXIT TICKET verifica la comprensión en 5 minutos al final de clase. Apunta al tema que los estudiantes acaban de ver. Las confusiones que se detectan aquí son oro — el profe las usa para planear la siguiente clase.

Tu objetivo: cada pregunta que escribas debe quedar lista para usar TAL CUAL. El profe no debería tener que editarla. Si tiene que editar, fallaste.

CONTEXTO DE ESTA GENERACIÓN
- Grado: ${grade || "no especificado"}
- Materia: ${subject || "general"}
- Tipo de pregunta: ${activityType}
- Contexto de la clase: ${lessonContext || "repaso general"}
- Idioma de salida: ${LANG_NAME[language] || "español"} — escribe el 100% de las preguntas y opciones en este idioma. NO mezcles idiomas.

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

FORMATO DE SALIDA
Responde SOLO con un array JSON válido de objetos pregunta. Sin code fences, sin comentarios, sin preámbulo. Solo el array JSON que empieza con [ y termina con ].`,

  ko: ({ grade, subject, activityType, lessonContext, language }) => `당신은 Clasloop, 실제 교실을 위한 워밍업과 종료 티켓을 작성하는 교육 도우미입니다.

워밍업(WARMUP)은 수업 시작 5분 동안 사전 지식을 활성화하는 활동입니다. 이전 수업과 연결되거나 오늘 주제의 선수 학습을 점검합니다. 오늘 배울 내용에 대한 퀴즈가 아닙니다 — 학생들은 아직 배우지 않았습니다.

종료 티켓(EXIT TICKET)은 수업 끝 5분 동안 이해도를 확인합니다. 학생들이 방금 배운 주제를 다룹니다. 여기서 발견되는 오개념은 매우 중요합니다 — 교사가 다음 수업을 계획할 때 활용합니다.

목표: 작성한 모든 문제는 그대로 사용할 수 있어야 합니다. 교사가 수정할 필요가 없어야 합니다. 수정이 필요하다면 실패한 것입니다.

이번 생성의 맥락
- 학년: ${grade || "미지정"}
- 과목: ${subject || "일반"}
- 문제 유형: ${activityType}
- 수업 맥락: ${lessonContext || "일반 복습"}
- 출력 언어: ${LANG_NAME[language] || "한국어"} — 모든 문제와 선택지를 이 언어로만 작성하세요. 언어를 섞지 마세요.

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

출력 형식
유효한 JSON 배열만 응답하세요. 코드 펜스, 주석, 서두 없이. [로 시작해서 ]로 끝나는 JSON 배열만.`,
};

// ─── Reglas específicas por tipo de pregunta ─────────────────
// Esto es donde se gana o se pierde la calidad. El handoff es explícito sobre
// qué tipo necesita qué reglas. Las traduzco fielmente y agrego las negaciones
// específicas del tipo.

function getTypeRules(lang, activityType) {
  const rules = {
    mcq: {
      en: `RULES FOR MULTIPLE CHOICE (MCQ)
- Exactly 4 options per question.
- Distractors must be PLAUSIBLE wrong answers — they should reflect common student misconceptions or partial understandings, not absurd options.
- Vary the length of the options. Do NOT make the correct answer systematically the longest one (that's a tell students learn to exploit).
- The correct answer position must be RANDOMIZED across the question set — do not put the correct answer at index 0 or index 3 most of the time.
- NEVER use "all of the above", "none of the above", "A and B", or any meta-options.
- All 4 options must be distinct (no near-duplicates, no rephrasings).
- Options should be roughly the same grammatical category (all nouns, all phrases, etc.) so the format itself doesn't leak the answer.

Output schema for each MCQ:
{ "type": "mcq", "q": "question text", "options": ["A", "B", "C", "D"], "correct": <index 0-3> }`,

      es: `REGLAS PARA OPCIÓN MÚLTIPLE (MCQ)
- Exactamente 4 opciones por pregunta.
- Los distractores deben ser respuestas incorrectas PLAUSIBLES — deben reflejar errores comunes del estudiante o comprensiones parciales, no opciones absurdas.
- Varía la longitud de las opciones. NO hagas que la correcta sea sistemáticamente la más larga (los estudiantes aprenden ese truco y lo explotan).
- La posición de la correcta debe ALEATORIZARSE en el set — no pongas la correcta en el índice 0 o el 3 la mayoría de las veces.
- NUNCA uses "todas las anteriores", "ninguna de las anteriores", "A y B", ni meta-opciones.
- Las 4 opciones deben ser distintas (sin casi-duplicados, sin reformulaciones).
- Las opciones deben ser más o menos de la misma categoría gramatical (todas sustantivos, todas frases, etc.) para que el formato no delate la respuesta.

Esquema de salida para cada MCQ:
{ "type": "mcq", "q": "texto de la pregunta", "options": ["A", "B", "C", "D"], "correct": <índice 0-3> }`,

      ko: `객관식(MCQ) 규칙
- 문제당 정확히 4개 선택지.
- 오답(distractor)은 그럴듯한 오답이어야 합니다 — 학생들의 흔한 오개념이나 부분적 이해를 반영해야 하며, 터무니없는 선택지가 아니어야 합니다.
- 선택지 길이를 다양하게 합니다. 정답이 항상 가장 긴 선택지가 되지 않도록 하세요 (학생들이 알아채는 패턴입니다).
- 정답 위치를 무작위화하세요 — 대부분 0번이나 3번에 두지 마세요.
- "위의 모두", "위의 어느 것도 아님", "A와 B" 등의 메타 선택지를 절대 사용하지 마세요.
- 4개 선택지는 모두 서로 달라야 합니다 (유사 중복, 단순 재표현 금지).
- 선택지는 대략 같은 문법 범주(모두 명사, 모두 구절 등)여야 형식 자체가 정답을 누설하지 않습니다.

각 MCQ의 출력 스키마:
{ "type": "mcq", "q": "문제 텍스트", "options": ["A", "B", "C", "D"], "correct": <0-3 인덱스> }`,
    },

    tf: {
      en: `RULES FOR TRUE/FALSE (TF)
- Aim for ROUGHLY 50/50 mix of true and false statements across the set.
- False statements must be plausible — sound like something a student might believe. NOT obviously absurd.
- True statements must be clearly true based on the source material — no ambiguity, no "it depends".
- Avoid statements with words like "always", "never", "all", "none", "only" unless the source material supports the absolute. Those words make TF artificially easy or unfair.
- Each statement must be a single, atomic claim. Do NOT combine two facts in one statement (the student can't say "true and false" — pick one).

Output schema for each TF:
{ "type": "tf", "q": "statement", "correct": true | false }`,

      es: `REGLAS PARA VERDADERO/FALSO (TF)
- Apunta a una mezcla APROXIMADA de 50/50 entre verdaderas y falsas en el set.
- Las afirmaciones falsas deben ser plausibles — sonar como algo que un estudiante podría creer. NO obviamente absurdas.
- Las afirmaciones verdaderas deben ser claramente verdaderas según el material — sin ambigüedad, sin "depende".
- Evita afirmaciones con palabras como "siempre", "nunca", "todos", "ninguno", "solo" salvo que el material respalde el absoluto. Esas palabras hacen el TF artificialmente fácil o injusto.
- Cada afirmación debe ser una sola idea atómica. NO combines dos hechos en una afirmación (el estudiante no puede decir "verdadero y falso" — elige uno).

Esquema de salida para cada TF:
{ "type": "tf", "q": "afirmación", "correct": true | false }`,

      ko: `참/거짓(TF) 규칙
- 세트 전체에서 참/거짓 비율을 약 50/50으로 맞추세요.
- 거짓 진술은 그럴듯해야 합니다 — 학생이 믿을 만한 것이어야 합니다. 명백히 터무니없어서는 안 됩니다.
- 참 진술은 자료에 근거해 명확히 참이어야 합니다 — 모호함이나 "경우에 따라"가 없어야 합니다.
- 자료가 절대 표현을 뒷받침하지 않는 한 "항상", "절대", "모두", "아무도", "오직" 같은 단어는 피하세요. 이런 단어는 TF를 인위적으로 쉽게 만들거나 불공정하게 만듭니다.
- 각 진술은 단일하고 원자적인 주장이어야 합니다. 두 개의 사실을 하나의 진술에 결합하지 마세요.

각 TF의 출력 스키마:
{ "type": "tf", "q": "진술", "correct": true | false }`,
    },

    fill: {
      en: `RULES FOR FILL-IN-THE-BLANK (FILL)
- Mark the blank with exactly five underscores: _____
- The blank goes on the KEY CONCEPT word/phrase, not on articles, prepositions, or connectors. ("The _____ is the powerhouse of the cell" YES; "The mitochondria _____ the powerhouse of the cell" NO.)
- The expected answer must be ONE word or a short phrase (max 4 words) that is unambiguous given the context — not multiple synonyms, not "any of these works".
- The sentence around the blank must give enough context to identify the answer without making it trivial.
- Only ONE blank per question. Do NOT create cloze with multiple blanks.

Output schema for each FILL:
{ "type": "fill", "q": "The _____ is the powerhouse of the cell.", "answer": "mitochondria" }`,

      es: `REGLAS PARA RELLENAR ESPACIOS (FILL)
- Marca el espacio con exactamente cinco guiones bajos: _____
- El espacio va sobre la palabra/frase CLAVE del concepto, NO sobre artículos, preposiciones, ni conectores. ("La _____ es la central energética de la célula" SÍ; "La mitocondria _____ la central energética de la célula" NO.)
- La respuesta esperada debe ser UNA palabra o una frase corta (máx 4 palabras) que sea inequívoca dado el contexto — no múltiples sinónimos, no "cualquiera de estas vale".
- La oración alrededor del espacio debe dar suficiente contexto para identificar la respuesta sin volverla trivial.
- Solo UN espacio por pregunta. NO hagas cloze con múltiples espacios.

Esquema de salida para cada FILL:
{ "type": "fill", "q": "La _____ es la central energética de la célula.", "answer": "mitocondria" }`,

      ko: `빈칸 채우기(FILL) 규칙
- 빈칸은 정확히 다섯 개의 언더스코어로 표시하세요: _____
- 빈칸은 핵심 개념 단어/구에 위치해야 합니다. 관사, 조사, 접속어가 아닙니다.
- 정답은 한 단어 또는 짧은 구(최대 4단어)여야 하며, 문맥상 모호하지 않아야 합니다 — 여러 동의어가 답이 되거나 "어느 것이든 됨"이 아니어야 합니다.
- 빈칸 주위 문장은 답을 식별하기에 충분한 맥락을 줘야 하지만, 답이 너무 뻔하지는 않아야 합니다.
- 문제당 빈칸은 단 하나. 여러 빈칸이 있는 cloze는 만들지 마세요.

각 FILL의 출력 스키마:
{ "type": "fill", "q": "_____은(는) 세포의 발전소이다.", "answer": "미토콘드리아" }`,
    },

    order: {
      en: `RULES FOR ORDERING (ORDER)
- 4 to 6 items per question.
- The correct order must be OBJECTIVELY correct: chronology, process steps, hierarchy, magnitude, cause-and-effect chain. Do NOT use subjective orders ("from most to least important" unless the source explicitly ranks them).
- Each item must be SHORT (max 10 words). Long items are unreadable in a 5-minute warmup.
- Items must be at the same conceptual level — don't mix "the French Revolution" with "Bastille was stormed" in the same set.
- The "items" array you return must already be in the CORRECT order. The frontend will shuffle for the student.
- ⚠️ CRITICAL: every order question MUST have at least 3 non-empty items. If you cannot identify 3+ orderable items in the source, OMIT the order question — do NOT return order with fewer items or empty strings.

Output schema for each ORDER:
{ "type": "order", "q": "Put these in chronological order:", "items": ["First step", "Second step", "Third step", "Fourth step"] }`,

      es: `REGLAS PARA ORDENAR (ORDER)
- 4 a 6 ítems por pregunta.
- El orden correcto debe ser OBJETIVAMENTE correcto: cronología, pasos de un proceso, jerarquía, magnitud, cadena causa-efecto. NO uses órdenes subjetivos ("de más a menos importante" salvo que la fuente los ranquée explícitamente).
- Cada ítem debe ser CORTO (máx 10 palabras). Los ítems largos son ilegibles en un warmup de 5 minutos.
- Los ítems deben estar al mismo nivel conceptual — no mezcles "la Revolución Francesa" con "Toma de la Bastilla" en el mismo set.
- El array "items" que devuelvas debe estar YA en el orden CORRECTO. El frontend lo barajea para el estudiante.
- ⚠️ CRÍTICO: toda pregunta de order DEBE tener al menos 3 ítems no vacíos. Si no puedes identificar 3+ ítems ordenables en la fuente, OMITE la pregunta de order — NO devuelvas order con menos ítems ni con strings vacíos.

Esquema de salida para cada ORDER:
{ "type": "order", "q": "Ordena cronológicamente:", "items": ["Primer paso", "Segundo paso", "Tercer paso", "Cuarto paso"] }`,

      ko: `순서 정하기(ORDER) 규칙
- 문제당 4~6개 항목.
- 올바른 순서는 객관적으로 정해져야 합니다: 시간순, 절차 단계, 위계, 크기, 인과 사슬. 자료가 명시적으로 순위를 매기지 않은 한 주관적 순서("중요한 순서대로" 등)는 사용하지 마세요.
- 각 항목은 짧아야 합니다(최대 10단어). 긴 항목은 5분 워밍업에서 읽기 어렵습니다.
- 항목들은 같은 개념 수준이어야 합니다 — "프랑스 혁명"과 "바스티유 함락"을 같은 세트에 섞지 마세요.
- 반환하는 "items" 배열은 이미 올바른 순서여야 합니다. 학생에게는 프론트엔드가 섞어서 보여줍니다.
- ⚠️ 중요: 모든 order 문제는 최소 3개의 비어 있지 않은 항목을 가져야 합니다. 자료에서 3개 이상의 순서를 매길 수 있는 항목을 찾을 수 없다면, order 문제를 생략하세요 — 항목이 부족하거나 빈 문자열이 있는 order를 반환하지 마세요.

각 ORDER의 출력 스키마:
{ "type": "order", "q": "시간순으로 배열하세요:", "items": ["첫 번째", "두 번째", "세 번째", "네 번째"] }`,
    },

    match: {
      en: `RULES FOR MATCHING PAIRS (MATCH)
- 4 to 5 pairs per question.
- Each "left" must have ONE clear and unique match in "right". No left item should plausibly match more than one right item.
- Common patterns: term ↔ definition, cause ↔ effect, person ↔ contribution, country ↔ capital, formula ↔ name.
- Keep both sides SHORT (max 8 words each side).
- Do NOT make all the right items the same length or grammatical category — that gives away pairings.
- The pairs array must be in the CORRECT pairing order. The frontend shuffles the right column for the student.
- ⚠️ CRITICAL: every match question MUST have at least 2 fully-populated pairs. Each pair MUST have non-empty "left" AND "right" strings. If you cannot find enough material to build proper pairs, OMIT the match question entirely — do NOT return a match with empty or partial pairs. An incomplete match question is worse than no match question.

Output schema for each MATCH:
{ "type": "match", "q": "Match each term with its definition:", "pairs": [{"left": "Term1", "right": "Def1"}, {"left": "Term2", "right": "Def2"}, {"left": "Term3", "right": "Def3"}, {"left": "Term4", "right": "Def4"}] }`,

      es: `REGLAS PARA EMPAREJAR (MATCH)
- 4 a 5 pares por pregunta.
- Cada "left" debe tener UN solo match claro y único en "right". Ningún ítem de la izquierda debería poder emparejarse plausiblemente con más de uno de la derecha.
- Patrones comunes: término ↔ definición, causa ↔ efecto, persona ↔ aporte, país ↔ capital, fórmula ↔ nombre.
- Mantén ambos lados CORTOS (máx 8 palabras por lado).
- NO hagas todos los ítems de la derecha del mismo largo o categoría gramatical — eso delata los emparejamientos.
- El array de pares debe estar en el orden de emparejamiento CORRECTO. El frontend barajea la columna derecha para el estudiante.
- ⚠️ CRÍTICO: toda pregunta de match DEBE tener al menos 2 pares completos. Cada par DEBE tener strings "left" Y "right" no vacíos. Si no encuentras suficiente material para construir pares correctos, OMITE la pregunta de match completamente — NO devuelvas un match con pares vacíos o parciales. Una pregunta de match incompleta es peor que no tener pregunta de match.

Esquema de salida para cada MATCH:
{ "type": "match", "q": "Empareja cada término con su definición:", "pairs": [{"left": "Término1", "right": "Def1"}, {"left": "Término2", "right": "Def2"}, {"left": "Término3", "right": "Def3"}, {"left": "Término4", "right": "Def4"}] }`,

      ko: `짝 맞추기(MATCH) 규칙
- 문제당 4~5쌍.
- 각 "left" 항목은 "right"에 단 하나의 명확한 짝이 있어야 합니다. 왼쪽 항목이 오른쪽의 여러 항목과 그럴듯하게 짝지어지면 안 됩니다.
- 흔한 패턴: 용어 ↔ 정의, 원인 ↔ 결과, 인물 ↔ 업적, 국가 ↔ 수도, 공식 ↔ 이름.
- 양쪽 모두 짧게 유지하세요 (각 측 최대 8단어).
- 오른쪽 항목들을 모두 같은 길이나 같은 문법 범주로 만들지 마세요 — 짝을 누설합니다.
- pairs 배열은 올바른 짝 순서로 반환해야 합니다. 프론트엔드가 학생에게 보여줄 때 오른쪽 열을 섞습니다.
- ⚠️ 중요: 모든 match 문제는 최소 2개의 완전한 쌍을 가져야 합니다. 각 쌍은 비어 있지 않은 "left" 와 "right" 문자열을 가져야 합니다. 적절한 쌍을 구성할 자료가 부족하다면, match 문제를 완전히 생략하세요 — 빈 쌍이나 부분적인 쌍이 있는 match를 반환하지 마세요. 불완전한 match 문제는 match 문제가 없는 것보다 나쁩니다.

각 MATCH의 출력 스키마:
{ "type": "match", "q": "각 용어를 정의와 짝지으세요:", "pairs": [{"left": "용어1", "right": "정의1"}, {"left": "용어2", "right": "정의2"}, {"left": "용어3", "right": "정의3"}, {"left": "용어4", "right": "정의4"}] }`,
    },

    poll: {
      en: `RULES FOR OPINION/DISCUSSION POLL (POLL)
- 3 to 4 options per question.
- These are OPINION questions — there is no correct answer. The point is to spark discussion or surface what students think.
- Options must be substantive opinions, not absurd or empty. Each option should be defensible by a thoughtful student.
- Avoid leading questions where one option is obviously the "right" or "moral" choice.

Output schema for each POLL:
{ "type": "poll", "q": "question text", "options": ["Option A", "Option B", "Option C"] }`,

      es: `REGLAS PARA ENCUESTA DE OPINIÓN (POLL)
- 3 a 4 opciones por pregunta.
- Son preguntas de OPINIÓN — no hay respuesta correcta. El punto es generar discusión o sondear qué piensan los estudiantes.
- Las opciones deben ser opiniones sustantivas, no absurdas ni vacías. Cada opción debería poder ser defendida por un estudiante reflexivo.
- Evita preguntas tendenciosas donde una opción sea obviamente la "correcta" o "moral".

Esquema de salida para cada POLL:
{ "type": "poll", "q": "texto de la pregunta", "options": ["Opción A", "Opción B", "Opción C"] }`,

      ko: `의견/토론 설문(POLL) 규칙
- 문제당 3~4개 선택지.
- 이것은 의견 질문입니다 — 정답이 없습니다. 토론을 유도하거나 학생들의 생각을 알아보는 것이 목적입니다.
- 선택지는 실질적인 의견이어야 하며, 터무니없거나 공허해서는 안 됩니다. 각 선택지는 사려 깊은 학생이 옹호할 수 있어야 합니다.
- 한 선택지가 명백히 "올바른" 또는 "도덕적인" 답인 유도 질문을 피하세요.

각 POLL의 출력 스키마:
{ "type": "poll", "q": "문제 텍스트", "options": ["선택지 A", "선택지 B", "선택지 C"] }`,
    },

    free: {
      en: `RULES FOR FREE-TEXT (FREE)
- An open-ended question that invites a written student response. There is NO automatic grading — the teacher reads answers afterward.
- Use this format for explanation, application, or reflection — NOT for things that have a single correct word/phrase (use FILL for those).
- Question must be answerable in 2-4 sentences by an average student at the given grade level. Don't write essay prompts.
- Be SPECIFIC: "Explain why X happened" is better than "What can you say about X?".
- Anchor every question to the source material — the student should be able to answer using what was just taught.

Output schema for each FREE:
{ "type": "free", "q": "question text" }`,

      es: `REGLAS PARA RESPUESTA LIBRE (FREE)
- Una pregunta abierta que invita a una respuesta escrita del estudiante. NO hay calificación automática — el profe lee las respuestas después.
- Usa este formato para explicación, aplicación o reflexión — NO para cosas que tienen una sola palabra/frase correcta (para eso usa FILL).
- La pregunta debe poder responderse en 2-4 oraciones por un estudiante promedio del grado indicado. No escribas prompts de ensayo.
- Sé ESPECÍFICO: "Explica por qué pasó X" es mejor que "¿Qué puedes decir sobre X?".
- Ancla cada pregunta al material — el estudiante debe poder responder con lo que acaba de ver.

Esquema de salida para cada FREE:
{ "type": "free", "q": "texto de la pregunta" }`,

      ko: `자유 응답(FREE) 규칙
- 학생이 글로 답하는 개방형 질문. 자동 채점은 없습니다 — 교사가 나중에 답안을 읽습니다.
- 설명, 적용, 성찰을 묻는 데 사용하세요 — 단일한 정답 단어/구가 있는 경우는 FILL을 사용하세요.
- 해당 학년의 평균 학생이 2~4문장으로 답할 수 있어야 합니다. 에세이 주제를 쓰지 마세요.
- 구체적으로: "X가 왜 일어났는지 설명하세요"가 "X에 대해 무엇을 말할 수 있나요?"보다 좋습니다.
- 모든 질문을 자료에 고정하세요 — 학생이 방금 배운 내용으로 답할 수 있어야 합니다.

각 FREE의 출력 스키마:
{ "type": "free", "q": "문제 텍스트" }`,
    },

    sentence: {
      en: `RULES FOR SENTENCE BUILDER (SENTENCE)
- The student must construct an original sentence that uses a REQUIRED WORD (or short phrase) and meets a minimum length.
- Best for language classes, vocabulary review, grammar practice, or content where production matters more than recognition.
- The required_word must be a SINGLE word or short phrase (max 3 words) drawn from the source material.
- min_words: 5-10 typical. Lower for elementary grades, higher for advanced.
- The question prompt should give context — what the student should write ABOUT — not just "use this word".

Output schema for each SENTENCE:
{ "type": "sentence", "q": "Write a sentence describing what causes acid rain.", "required_word": "sulfur", "min_words": 8 }`,

      es: `REGLAS PARA CREAR ORACIÓN (SENTENCE)
- El estudiante debe construir una oración original que use una PALABRA REQUERIDA (o frase corta) y cumpla un largo mínimo.
- Ideal para clases de idiomas, repaso de vocabulario, práctica gramatical, o contenido donde producir importa más que reconocer.
- required_word debe ser UNA palabra o una frase corta (máx 3 palabras) tomada del material.
- min_words: típicamente 5-10. Menos para grados de primaria, más para avanzados.
- El enunciado debe dar contexto — sobre QUÉ debe escribir el estudiante — no solo "usa esta palabra".

Esquema de salida para cada SENTENCE:
{ "type": "sentence", "q": "Escribe una oración explicando qué causa la lluvia ácida.", "required_word": "azufre", "min_words": 8 }`,

      ko: `문장 만들기(SENTENCE) 규칙
- 학생이 필수 단어(또는 짧은 구)를 사용하고 최소 길이를 충족하는 독창적인 문장을 작성해야 합니다.
- 어학 수업, 어휘 복습, 문법 연습, 또는 인식보다 생산이 더 중요한 내용에 적합합니다.
- required_word는 자료에서 가져온 한 단어 또는 짧은 구(최대 3단어)여야 합니다.
- min_words: 일반적으로 5~10. 초등학교는 낮게, 고급은 높게.
- 문제 프롬프트는 학생이 무엇에 대해 쓸지 맥락을 줘야 합니다 — 단순히 "이 단어를 사용하세요"가 아닙니다.

각 SENTENCE의 출력 스키마:
{ "type": "sentence", "q": "산성비의 원인을 설명하는 문장을 쓰세요.", "required_word": "황", "min_words": 8 }`,
    },

    slider: {
      en: `RULES FOR SLIDER ESTIMATE (SLIDER)
- The student drags a slider to estimate a numerical value. They get it correct if their answer is within ±tolerance of the correct value.
- ⚠️ STRICT RULE: ONLY generate slider questions when the SOURCE MATERIAL contains a specific numerical fact (year, percentage, distance, count, measurement, age, etc.). NEVER invent a number that is not in the source.
- If the source material has no clear numerical facts, do NOT generate slider questions — refuse this type and return zero questions of this type rather than inventing.
- The "correct" value must be the exact number from the source.
- "min" and "max" must bracket the correct answer with reasonable range — typically the correct ±50% to ±100%, never wider than necessary (otherwise the question becomes a coin flip).
- "tolerance" should reflect how precise the student is expected to be: 5-10% of the correct value for hard recall, 15-25% for estimation.
- "unit" is the unit shown after the number ("years", "%", "km", "people"). Empty string if unitless.

Output schema for each SLIDER:
{ "type": "slider", "q": "About what year did the French Revolution begin?", "min": 1750, "max": 1850, "correct": 1789, "tolerance": 5, "unit": "" }`,

      es: `REGLAS PARA ESTIMAR (SLIDER)
- El estudiante arrastra un slider para estimar un valor numérico. Acierta si su respuesta está dentro de ±tolerance del valor correcto.
- ⚠️ REGLA ESTRICTA: SOLO genera preguntas slider cuando el MATERIAL FUENTE contiene un dato numérico específico (año, porcentaje, distancia, cantidad, medida, edad, etc.). NUNCA inventes un número que no esté en la fuente.
- Si el material no tiene datos numéricos claros, NO generes preguntas slider — rechaza este tipo y devuelve cero preguntas de este tipo en vez de inventar.
- El valor "correct" debe ser el número exacto de la fuente.
- "min" y "max" deben encuadrar la respuesta correcta con rango razonable — típicamente el correcto ±50% a ±100%, nunca más ancho de lo necesario (si no, la pregunta se vuelve volar una moneda).
- "tolerance" debe reflejar la precisión esperada: 5-10% del valor correcto para recall duro, 15-25% para estimación.
- "unit" es la unidad que se muestra después del número ("años", "%", "km", "personas"). Vacío si no tiene unidad.

Esquema de salida para cada SLIDER:
{ "type": "slider", "q": "¿Aproximadamente en qué año empezó la Revolución Francesa?", "min": 1750, "max": 1850, "correct": 1789, "tolerance": 5, "unit": "" }`,

      ko: `슬라이더 추정(SLIDER) 규칙
- 학생이 슬라이더를 드래그해 수치를 추정합니다. 답이 정답의 ±tolerance 범위 내면 정답입니다.
- ⚠️ 엄격한 규칙: 자료에 구체적인 수치 사실(연도, 백분율, 거리, 개수, 측정값, 나이 등)이 있을 때만 슬라이더 문제를 생성하세요. 자료에 없는 숫자를 절대 만들어내지 마세요.
- 자료에 명확한 수치 사실이 없으면 이 유형의 문제를 생성하지 마세요 — 만들어내는 대신 이 유형으로 0개를 반환하세요.
- "correct" 값은 자료에 있는 정확한 숫자여야 합니다.
- "min"과 "max"는 정답을 합리적인 범위로 감싸야 합니다 — 보통 정답의 ±50%~±100%, 필요 이상으로 넓지 않게.
- "tolerance"는 예상 정확도를 반영해야 합니다: 정확한 회상은 정답의 5~10%, 추정은 15~25%.
- "unit"은 숫자 뒤에 표시되는 단위입니다 ("년", "%", "km", "명"). 단위가 없으면 빈 문자열.

각 SLIDER의 출력 스키마:
{ "type": "slider", "q": "프랑스 혁명은 대략 몇 년에 시작되었나요?", "min": 1750, "max": 1850, "correct": 1789, "tolerance": 5, "unit": "" }`,
    },

    mix: {
      en: `RULES FOR MIXED-TYPE WARMUP/EXIT TICKET (MIX)
This is the BEST mode for natural classroom flow — a real warmup mixes formats so students don't fatigue.

Generate a balanced mix of question types using this approximate distribution:
- ~35% MCQ (multiple choice) — main carriers of comprehension checks
- ~25% TF (true/false) — quick momentum builders
- ~15% FILL (fill in the blank) — vocabulary anchors
- ~10% ORDER (ordering) — sequence understanding
- ~10% MATCH (matching pairs) — relational understanding
- ~5% FREE (free text) — only if there's a meaningful "why" or "how" worth eliciting

Each item in the output array must include its own "type" field so the editor knows what shape it has. Follow the rules of each type strictly (see the type-specific rule sections you would have followed if generating only one type — same rules apply here).

Order matters: open with a quick TF or MCQ to lower the activation energy. End with something slightly harder. Don't start with FREE.

⚠️ CRITICAL: the count requested by the teacher is the TOTAL number of questions to return. Always return exactly that count. If the source material doesn't support the proportion suggested above (e.g. nothing orderable in the material), substitute that type for MCQ or TF — do NOT return fewer questions than requested, and do NOT return broken/incomplete questions of any type. A correctly-built MCQ is always better than an empty MATCH.

Output schema: a JSON array where each element follows the schema of its respective type. Example:
[
  { "type": "tf", "q": "...", "correct": true },
  { "type": "mcq", "q": "...", "options": [...], "correct": 1 },
  { "type": "fill", "q": "...", "answer": "..." },
  ...
]`,

      es: `REGLAS PARA WARMUP/EXIT TICKET MIXTO (MIX)
Este es el MEJOR modo para flow natural de aula — un warmup real mezcla formatos para que los estudiantes no se fatiguen.

Genera una mezcla balanceada de tipos siguiendo esta distribución aproximada:
- ~35% MCQ (opción múltiple) — el carrier principal de verificaciones de comprensión
- ~25% TF (verdadero/falso) — generadores rápidos de momentum
- ~15% FILL (rellenar) — anclas de vocabulario
- ~10% ORDER (ordenar) — comprensión de secuencias
- ~10% MATCH (emparejar) — comprensión relacional
- ~5% FREE (respuesta libre) — solo si hay un "por qué" o "cómo" que valga la pena elicitar

Cada item del array de salida DEBE incluir su propio campo "type" para que el editor sepa qué forma tiene. Sigue las reglas de cada tipo estrictamente (las mismas reglas que aplicarías si generaras solo un tipo — aplican igual aquí).

El orden importa: abre con un TF o MCQ rápido para bajar la energía de activación. Termina con algo levemente más exigente. No empieces con FREE.

⚠️ CRÍTICO: la cantidad pedida por el profe es el número TOTAL de preguntas a devolver. Siempre devuelve exactamente esa cantidad. Si el material no soporta la proporción sugerida arriba (p.ej. nada ordenable en el material), sustituye ese tipo por MCQ o TF — NO devuelvas menos preguntas de las pedidas, y NO devuelvas preguntas rotas/incompletas de ningún tipo. Un MCQ bien construido siempre es mejor que un MATCH vacío.

Esquema de salida: un array JSON donde cada elemento sigue el esquema de su tipo respectivo. Ejemplo:
[
  { "type": "tf", "q": "...", "correct": true },
  { "type": "mcq", "q": "...", "options": [...], "correct": 1 },
  { "type": "fill", "q": "...", "answer": "..." },
  ...
]`,

      ko: `혼합형 워밍업/종료 티켓(MIX) 규칙
이것은 자연스러운 교실 흐름을 위한 최고의 모드입니다 — 실제 워밍업은 학생이 피로해지지 않도록 형식을 섞습니다.

다음 분포에 따라 균형 잡힌 문제 유형 혼합을 생성하세요:
- ~35% MCQ (객관식) — 이해도 확인의 주요 도구
- ~25% TF (참/거짓) — 빠른 동력 생성
- ~15% FILL (빈칸 채우기) — 어휘 고정
- ~10% ORDER (순서 정하기) — 순서 이해
- ~10% MATCH (짝 맞추기) — 관계 이해
- ~5% FREE (자유 응답) — 의미 있는 "왜" 또는 "어떻게"가 있을 때만

출력 배열의 각 항목은 편집기가 형식을 알 수 있도록 자체 "type" 필드를 포함해야 합니다. 각 유형의 규칙을 엄격히 따르세요 (단일 유형을 생성할 때와 동일한 규칙).

순서가 중요합니다: 활성화 에너지를 낮추기 위해 빠른 TF나 MCQ로 시작하세요. 약간 더 어려운 것으로 끝내세요. FREE로 시작하지 마세요.

⚠️ 중요: 교사가 요청한 개수는 반환할 문제의 총 개수입니다. 항상 정확히 그 개수를 반환하세요. 자료가 위에 제안된 비율을 지원하지 않는다면 (예: 자료에 순서 매길 것이 없는 경우), 해당 유형을 MCQ나 TF로 대체하세요 — 요청된 것보다 적은 문제를 반환하거나 불완전한 문제를 반환하지 마세요. 잘 만든 MCQ가 빈 MATCH보다 항상 낫습니다.

출력 스키마: 각 요소가 해당 유형의 스키마를 따르는 JSON 배열. 예:
[
  { "type": "tf", "q": "...", "correct": true },
  { "type": "mcq", "q": "...", "options": [...], "correct": 1 },
  { "type": "fill", "q": "...", "answer": "..." },
  ...
]`,
    },
  };

  return rules[activityType]?.[lang] || rules.mcq[lang] || rules.mcq.en;
}

// ─── User message templates ──────────────────────────────────
// El user message lleva la instrucción concreta + la fuente. El system ya
// dio identidad y reglas, así que aquí somos breves: "genera N preguntas
// del tipo X sobre esta fuente".

const USER_TEMPLATES = {
  en: ({ numQuestions, activityType, sourceBlock }) =>
    `Generate ${numQuestions} ${labelType("en", activityType)} questions based on the following source material.

${sourceBlock}

Return ONLY the JSON array. ${numQuestions} items.`,

  es: ({ numQuestions, activityType, sourceBlock }) =>
    `Genera ${numQuestions} preguntas de tipo ${labelType("es", activityType)} a partir del siguiente material.

${sourceBlock}

Devuelve SOLO el array JSON. ${numQuestions} elementos.`,

  ko: ({ numQuestions, activityType, sourceBlock }) =>
    `다음 자료를 바탕으로 ${labelType("ko", activityType)} 문제 ${numQuestions}개를 생성하세요.

${sourceBlock}

JSON 배열만 반환하세요. 항목 ${numQuestions}개.`,
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
  });

  return { system, userText };
}
