/* @vitest-environment node */
// ─── scoring.test.js ───────────────────────────────────────────────────
//
// PR 70: tests para scoring.js. Esta función decide si el alumno acertó
// o no — bug acá = profe pierde confianza en la app. CRÍTICO.
//
// Estos tests cubren TODOS los tipos de pregunta de Clasloop:
//   - mcq (single + multi-answer post PR 61 lenient)
//   - tf (true/false)
//   - fill (con alternativas + normalización)
//   - order (per-position scoring)
//   - match (per-pair scoring)
//   - free / open (needsReview)
//   - sentence (required word + min words)
//   - slider (con tolerance)
//
// Y los casos transversales:
//   - empty submission (null, undefined, [])
//   - wrong type del input (objeto cuando se esperaba string, etc)
//   - teacherGradeToPoints (post-review)

import { describe, it, expect } from "vitest";
import { evaluateAnswer, teacherGradeToPoints } from "../scoring";

// ═══════════════════════════════════════════════════════════════════════
// MCQ — single answer
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — MCQ single answer", () => {
  const q = { type: "mcq", correct: 2, options: ["A", "B", "C", "D"] };

  it("gives 1 point when student picks the correct option", () => {
    const result = evaluateAnswer(q, "mcq", 2);
    expect(result.isCorrect).toBe(true);
    expect(result.points).toBe(1);
    expect(result.maxPoints).toBe(1);
    expect(result.needsReview).toBe(false);
  });

  it("gives 0 points when student picks the wrong option", () => {
    const result = evaluateAnswer(q, "mcq", 0);
    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(0);
  });

  it("treats single-value answer as array internally", () => {
    // Backwards compat: student submits 2 (no array), q.correct=2 (no array)
    const result = evaluateAnswer(q, "mcq", 2);
    expect(result.isCorrect).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MCQ — multi-answer (strict rule)
// ═══════════════════════════════════════════════════════════════════════
//
// PR 83 NOTE: el comentario original decía "PR 61 lenient" pero esa regla
// nunca llegó a implementarse en `scoring.js`. La búsqueda de "PR 61"
// confirma 3 lugares donde quedó como TODO:
//   - scanner-mlkit.js:595 → "PR 61 hará el manejo completo..."
//   - scoring.js:166       → "no partial credit on multi-MCQ — pedagogically common"
//   - scoring.test.js:54   → "PR 61 lenient" (este test, asumía la regla)
//
// La regla ACTUAL del código (strict): para multi-correct, el set de
// respuestas del alumno debe igualar exactamente el set correcto. Marcar
// solo una de N correctas = incorrecto.
//
// Si en algún futuro PR queremos implementar realmente la regla lenient
// (parcial cuenta como bien), el cambio va en scoring.ts línea ~280
// (case "mcq" multi), y este test se actualiza junto con el cambio
// semántico.
describe("evaluateAnswer — MCQ multi-answer (strict)", () => {
  const q = { type: "mcq", correct: [0, 1], options: ["A", "B", "C", "D"] };

  it("gives 1 point when student marks ALL correct options", () => {
    const result = evaluateAnswer(q, "mcq", [0, 1]);
    expect(result.isCorrect).toBe(true);
    expect(result.points).toBe(1);
  });

  it("gives 0 points when student marks ONLY ONE of multiple correct (strict)", () => {
    // Regla actual (strict): set match exacto. Si A y B son correctas y
    // el alumno marca solo A, NO suma. Ver PR 83 NOTE arriba.
    //
    // TODO(PR-61): si se decide implementar lenient (parcial cuenta como
    // bien), cambiar este test para esperar { isCorrect: true, points: 1 }
    // y actualizar scoring.ts case "mcq" multi.
    const result = evaluateAnswer(q, "mcq", [0]);
    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(0);
  });

  it("gives 0 points when ANY marked option is wrong", () => {
    // Si el alumno marca A y C (C no está en correct), pierde.
    const result = evaluateAnswer(q, "mcq", [0, 2]);
    expect(result.isCorrect).toBe(false);
  });

  it("gives 0 points when student marks nothing", () => {
    const result = evaluateAnswer(q, "mcq", []);
    expect(result.isCorrect).toBe(false);
  });

  it("rejects single-correct answers where student marks extra (single→multi)", () => {
    // q.correct = 0 (single), pero alumno marca [0, 1]
    // Como el alumno agregó B que no es correcta, falla.
    const qSingle = { type: "mcq", correct: 0, options: ["A", "B", "C", "D"] };
    const result = evaluateAnswer(qSingle, "mcq", [0, 1]);
    expect(result.isCorrect).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// True / False
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — TF", () => {
  it("True correct, student picks true", () => {
    const result = evaluateAnswer({ correct: true }, "tf", true);
    expect(result.isCorrect).toBe(true);
    expect(result.points).toBe(1);
  });

  it("False correct, student picks true → wrong", () => {
    const result = evaluateAnswer({ correct: false }, "tf", true);
    expect(result.isCorrect).toBe(false);
  });

  it("strictly compares boolean (truthy 1 !== true)", () => {
    const result = evaluateAnswer({ correct: true }, "tf", 1);
    expect(result.isCorrect).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Fill in the blank — incluye alternativas + normalización
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — fill", () => {
  it("accepts the exact answer", () => {
    const q = { answer: "pollo" };
    expect(evaluateAnswer(q, "fill", "pollo").isCorrect).toBe(true);
  });

  it("normalizes case and whitespace", () => {
    const q = { answer: "pollo" };
    expect(evaluateAnswer(q, "fill", "  Pollo  ").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "fill", "POLLO").isCorrect).toBe(true);
  });

  it("normalizes accents — esp. importante para usuarios hispanohablantes", () => {
    const q = { answer: "México" };
    expect(evaluateAnswer(q, "fill", "mexico").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "fill", "México").isCorrect).toBe(true);
  });

  it("accepts alternatives", () => {
    const q = { answer: "pollo", alternatives: ["pavo", "gallina"] };
    expect(evaluateAnswer(q, "fill", "pavo").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "fill", "gallina").isCorrect).toBe(true);
    expect(evaluateAnswer(q, "fill", "pato").isCorrect).toBe(false);
  });

  it("collapses multiple spaces between words", () => {
    const q = { answer: "buenos dias" };
    expect(evaluateAnswer(q, "fill", "buenos   dias").isCorrect).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Order — per-position scoring (1 punto por slot correcto)
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — order", () => {
  const q = { items: ["uno", "dos", "tres", "cuatro"] };

  it("gives full points when all in correct order", () => {
    const result = evaluateAnswer(q, "order", ["uno", "dos", "tres", "cuatro"]);
    expect(result.points).toBe(4);
    expect(result.maxPoints).toBe(4);
    expect(result.isCorrect).toBe(true);
  });

  it("gives partial credit for some items in correct slot", () => {
    // uno (slot 0) y cuatro (slot 3) están bien — 2 puntos
    const result = evaluateAnswer(q, "order", ["uno", "tres", "dos", "cuatro"]);
    expect(result.points).toBe(2);
    expect(result.maxPoints).toBe(4);
    expect(result.isCorrect).toBe(false);
  });

  it("gives 0 when everything is wrong", () => {
    const result = evaluateAnswer(q, "order", ["cuatro", "tres", "dos", "uno"]);
    expect(result.points).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("handles partial submission (fewer items than expected)", () => {
    // Alumno solo envió 2 items. Si los 2 están bien, 2 puntos.
    const result = evaluateAnswer(q, "order", ["uno", "dos"]);
    expect(result.points).toBe(2);
    expect(result.isCorrect).toBe(false);  // length != items.length
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Match — per-pair scoring
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — match", () => {
  const q = {
    pairs: [
      { left: "perro", right: "dog" },
      { left: "gato", right: "cat" },
      { left: "casa", right: "house" },
    ],
  };

  it("gives full points when all pairs match", () => {
    const result = evaluateAnswer(q, "match", {
      perro: "dog", gato: "cat", casa: "house"
    });
    expect(result.points).toBe(3);
    expect(result.isCorrect).toBe(true);
  });

  it("gives partial credit for some correct pairs", () => {
    const result = evaluateAnswer(q, "match", {
      perro: "dog", gato: "house", casa: "cat"
    });
    expect(result.points).toBe(1);
    expect(result.isCorrect).toBe(false);
  });

  it("handles missing keys (no answer for some pairs)", () => {
    const result = evaluateAnswer(q, "match", { perro: "dog" });
    expect(result.points).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Free / Open — needs teacher review
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — free / open", () => {
  it("marks as needsReview, isCorrect=null", () => {
    const result = evaluateAnswer({}, "free", "Mi respuesta libre");
    expect(result.needsReview).toBe(true);
    expect(result.isCorrect).toBe(null);
    expect(result.points).toBe(0);
    expect(result.maxPoints).toBe(2);
  });

  it("open is treated the same as free", () => {
    const result = evaluateAnswer({}, "open", "Mi respuesta");
    expect(result.needsReview).toBe(true);
  });

  it("empty free still needsReview, but stored is empty string", () => {
    const result = evaluateAnswer({}, "free", null);
    expect(result.needsReview).toBe(true);
    expect(result.stored).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Sentence Builder
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — sentence", () => {
  const q = { required_word: "casa", min_words: 5 };

  it("accepts sentence with required word + enough words", () => {
    const result = evaluateAnswer(q, "sentence", "Mi casa es muy grande");
    expect(result.isCorrect).toBe(true);
  });

  it("rejects missing required word", () => {
    const result = evaluateAnswer(q, "sentence", "El perro corre por la calle");
    expect(result.isCorrect).toBe(false);
  });

  it("rejects too few words", () => {
    const result = evaluateAnswer(q, "sentence", "casa grande");
    expect(result.isCorrect).toBe(false);
  });

  it("case-insensitive for required word", () => {
    const result = evaluateAnswer(q, "sentence", "Mi CASA es muy grande");
    expect(result.isCorrect).toBe(true);
  });

  it("works without required_word (only min_words check)", () => {
    const q2 = { min_words: 3 };
    expect(evaluateAnswer(q2, "sentence", "uno dos tres").isCorrect).toBe(true);
    expect(evaluateAnswer(q2, "sentence", "solo dos").isCorrect).toBe(false);
  });

  it("honors a numeric-string min_words instead of falling back to 3", () => {
    // min_words can arrive as a string (JSON column / AI output). A 4-word
    // sentence would pass under the old default (3) but must fail at "5".
    const qStr = { required_word: "casa", min_words: "5" };
    expect(evaluateAnswer(qStr, "sentence", "Mi casa es grande").isCorrect).toBe(false);
    expect(evaluateAnswer(qStr, "sentence", "Mi casa es muy grande").isCorrect).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Slider — con tolerancia
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — slider", () => {
  it("accepts exact value", () => {
    const q = { correct: 50, tolerance: 0 };
    expect(evaluateAnswer(q, "slider", 50).isCorrect).toBe(true);
  });

  it("accepts within tolerance", () => {
    const q = { correct: 50, tolerance: 5 };
    expect(evaluateAnswer(q, "slider", 47).isCorrect).toBe(true);
    expect(evaluateAnswer(q, "slider", 53).isCorrect).toBe(true);
  });

  it("rejects outside tolerance", () => {
    const q = { correct: 50, tolerance: 5 };
    expect(evaluateAnswer(q, "slider", 44).isCorrect).toBe(false);
    expect(evaluateAnswer(q, "slider", 56).isCorrect).toBe(false);
  });

  it("rejects non-numeric values", () => {
    const q = { correct: 50, tolerance: 5 };
    const result = evaluateAnswer(q, "slider", "fifty");
    expect(result.isCorrect).toBe(false);
    expect(result.stored).toBe(null);
  });

  it("defaults tolerance to 0 if missing", () => {
    const q = { correct: 50 };
    expect(evaluateAnswer(q, "slider", 50).isCorrect).toBe(true);
    expect(evaluateAnswer(q, "slider", 51).isCorrect).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Empty / null / undefined — comportamiento crítico
// ═══════════════════════════════════════════════════════════════════════
describe("evaluateAnswer — empty submissions", () => {
  it("null submission → 0 points, isCorrect=false, stored=''", () => {
    const result = evaluateAnswer({}, "mcq", null);
    expect(result.points).toBe(0);
    expect(result.isCorrect).toBe(false);
    // PR 24.4.5: stored must be empty string, not null (Supabase constraint)
    expect(result.stored).toBe("");
  });

  it("undefined submission → 0 points", () => {
    const result = evaluateAnswer({}, "mcq", undefined);
    expect(result.points).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("empty array submission → 0 points", () => {
    const result = evaluateAnswer({}, "mcq", []);
    expect(result.points).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("null submission for free/open still needsReview", () => {
    const result = evaluateAnswer({}, "free", null);
    expect(result.needsReview).toBe(true);
    expect(result.isCorrect).toBe(null);
  });

  it("null for match/order returns maxPoints based on items (not 1)", () => {
    // Si la pregunta tiene 4 items y el alumno no respondió, max sigue siendo 4
    const result = evaluateAnswer({ items: ["a", "b", "c", "d"] }, "order", null);
    expect(result.maxPoints).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// teacherGradeToPoints — post-review
// ═══════════════════════════════════════════════════════════════════════
describe("teacherGradeToPoints", () => {
  it("correct = 2 points, isCorrect true", () => {
    expect(teacherGradeToPoints("correct")).toEqual({ points: 2, isCorrect: true });
  });

  it("partial = 1 point, isCorrect TRUE (cuenta como participación)", () => {
    // PR review: partial cuenta como participación → isCorrect=true.
    // Esto es contra-intuitive pero es la decisión de producto.
    expect(teacherGradeToPoints("partial")).toEqual({ points: 1, isCorrect: true });
  });

  it("incorrect = 0 points, isCorrect false", () => {
    expect(teacherGradeToPoints("incorrect")).toEqual({ points: 0, isCorrect: false });
  });

  it("unknown grade returns null (ungraded)", () => {
    expect(teacherGradeToPoints("maybe")).toBe(null);
    expect(teacherGradeToPoints(undefined)).toBe(null);
  });
});
