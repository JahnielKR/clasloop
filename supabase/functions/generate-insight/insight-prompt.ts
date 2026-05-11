// ─── insight-prompt.ts ──────────────────────────────────────────────────
//
// Builds the prompt sent to Haiku 4.5 to generate label text for each
// weak-point candidate.
//
// Why Haiku only:
//   The task is constrained writing — a short phrase describing the
//   content of a question. No reasoning, no synthesis. Haiku handles
//   this well at a fraction of Sonnet's cost.
//
// Why this prompt is so defensive:
//   Haiku has four common failure modes on this task:
//     1. Theorizing  ("students confuse copula verbs")
//     2. Advising    ("review tomorrow", "consider re-teaching")
//     3. Inventing   ("60% failed", "Pedro got it wrong")
//     4. Hedging     ("seems to suggest", "might indicate")
//   The negative examples in the prompt block each of these explicitly.

export interface PromptCandidate {
  question_text: string;
  correct_answer: string | null;
}

export interface PromptResult {
  system: string;
  user: string;
}

const SYSTEM = `You write short labels describing what a quiz question tests, based purely on its content. Your output is a phrase a teacher will read in 2 seconds. You never invent statistics, never invent student names, never add advice. You only describe what the question is about.`;

const LANG_INSTRUCTION: Record<string, string> = {
  es: "Write in Spanish.",
  en: "Write in English.",
  ko: "Write in Korean.",
};

const START_PHRASE: Record<string, string> = {
  es: `Start with "Las preguntas con..." or "Las preguntas sobre..." or "Las preguntas que..."`,
  en: `Start with "The questions with..." or "The questions about..." or "The questions that..."`,
  ko: "Start naturally in Korean, describing what the questions test.",
};

const EXAMPLES: Record<string, string[]> = {
  es: [
    'Good: "Las preguntas con `estar` para ubicación física"',
    'Good: "Las preguntas sobre el pretérito de `pude` y `puede`"',
    'Bad (theoretical): "Estudiantes confunden cópula con verbos de estado"',
    'Bad (advice): "Las preguntas de `estar` — repasar mañana"',
    'Bad (numbers): "Las preguntas con `estar`, 60% fallaron"',
  ],
  en: [
    'Good: "The questions with `to be` for physical location"',
    'Good: "The questions about the past tense of `could` and `can`"',
    'Bad (theoretical): "Students confusing copula verbs"',
    'Bad (advice): "Questions with `to be` — review tomorrow"',
    'Bad (numbers): "Questions with `to be`, 60% failed"',
  ],
  ko: [
    'Good: "신체적 위치를 나타내는 `estar` 문제들"',
    "Bad (advice): include action recommendations",
    "Bad (numbers): include percentages",
  ],
};

export function buildInsightPrompt(
  candidates: PromptCandidate[],
  uiLang: string,
): PromptResult {
  const lang = LANG_INSTRUCTION[uiLang] ? uiLang : "en";

  const examples = EXAMPLES[lang] || EXAMPLES.en;

  const user = `${LANG_INSTRUCTION[lang]}

You will receive 1 or 2 quiz questions where most students failed. For EACH question, write ONE SHORT PHRASE (maximum 12 words) describing what content the question tests.

RULES:
1. Describe the content of the question, not the underlying grammar/concept theory.
2. Use backticks around any specific word, conjugation, or term taken from the question. Example: \`estar\`, \`pude\`, \`Por\`.
3. ${START_PHRASE[lang]}
4. NEVER mention numbers, percentages, fractions, or how many students failed.
5. NEVER mention student names.
6. NEVER add advice, recommendations, or "should" statements.
7. NEVER explain the grammatical theory behind the error.

EXAMPLES:
${examples.map((e) => "  " + e).join("\n")}

INPUT QUESTIONS (in the order you should label them):
${
    JSON.stringify(
      candidates.map((c, i) => ({
        index: i,
        question_text: c.question_text,
        correct_answer: c.correct_answer,
      })),
      null,
      2,
    )
  }

OUTPUT (strict JSON, nothing else, no markdown fences):
{
  "labels": [
    "first label here",
    "second label here (if there are 2 input questions)"
  ]
}

If 1 input question → return 1 label. If 2 input questions → return 2 labels. Order must match input order.`;

  return { system: SYSTEM, user };
}

/**
 * Parse Haiku's response tolerantly. The prompt asks for strict JSON
 * but Haiku occasionally wraps with markdown fences or adds a brief
 * preamble. This handles both cases.
 */
export function parseHaikuResponse(text: string): string[] | null {
  if (!text) return null;
  let cleaned = text.trim();

  // Strip markdown fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?\s*/i, "").replace(/```\s*$/i, "");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract the first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  if (!parsed || !Array.isArray(parsed.labels)) return null;

  const labels = parsed.labels.filter(
    (l: any) => typeof l === "string" && l.length > 0 && l.length <= 200,
  );

  return labels.length > 0 ? labels : null;
}
