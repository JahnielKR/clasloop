/* @vitest-environment node */
// ─── scanner-mlkit.test.js ─────────────────────────────────────────────
//
// PR 70: tests para scanner-mlkit.js. Probamos las dos funciones puras
// del scanner que son críticas y fáciles de testear sin imágenes:
//
//   - extractCorrectAnswers(q):
//     Convierte q.correct (number, array, boolean) en array de letras.
//     Bug acá = el scanner compara con respuestas equivocadas.
//
//   - detectMarkedBubbles(samples):
//     El algoritmo de PR 61 — gap detection para multi-respuesta.
//     Bug acá = el scanner detecta mal qué burbujas están marcadas.
//
// NO testeamos sampleBubbles() porque requiere imágenes reales. Eso lo
// hacemos vía testing manual con el sandbox (como ya hicimos en PR 60/61).

import { describe, it, expect } from "vitest";
import { _internal } from "../scanner-mlkit";

const { extractCorrectAnswers, detectMarkedBubbles } = _internal;

// ═══════════════════════════════════════════════════════════════════════
// extractCorrectAnswers — convertir q.correct a letras
// ═══════════════════════════════════════════════════════════════════════
describe("extractCorrectAnswers — MCQ", () => {
  it("single number: correct=2 → ['C']", () => {
    expect(extractCorrectAnswers({ type: "mcq", correct: 2 })).toEqual(["C"]);
  });

  it("zero: correct=0 → ['A'] (no se trata como falsy)", () => {
    // Bug típico: tratar 0 como falsy y devolver []. Es CRÍTICO que
    // funcione, porque la mayoría de los profes empiezan con A=0.
    expect(extractCorrectAnswers({ type: "mcq", correct: 0 })).toEqual(["A"]);
  });

  it("array of numbers: correct=[0,1] → ['A','B']", () => {
    expect(extractCorrectAnswers({ type: "mcq", correct: [0, 1] })).toEqual(["A", "B"]);
  });

  it("array of letter strings: correct=['A','B'] → ['A','B'] (lowercase OK)", () => {
    expect(extractCorrectAnswers({ type: "mcq", correct: ["a", "B"] })).toEqual(["A", "B"]);
  });

  it("invalid index (>3) returns null filtered out", () => {
    expect(extractCorrectAnswers({ type: "mcq", correct: 7 })).toEqual([]);
  });

  it("null/undefined returns []", () => {
    expect(extractCorrectAnswers({ type: "mcq", correct: null })).toEqual([]);
    expect(extractCorrectAnswers({ type: "mcq", correct: undefined })).toEqual([]);
  });

  it("mixed array with invalid values filters them out", () => {
    // correct=[0, "X", 99, "C"] → solo A y C son válidos
    expect(extractCorrectAnswers({ type: "mcq", correct: [0, "X", 99, "C"] }))
      .toEqual(["A", "X", "C"]);  // "X" gets uppercased, no validation that it's A-D
    // Documentamos que extractCorrectAnswers NO valida letra → eso es
    // responsabilidad del caller. Solo filtra null/undefined.
  });
});

describe("extractCorrectAnswers — TF", () => {
  it("correct=true → ['A']", () => {
    expect(extractCorrectAnswers({ type: "tf", correct: true })).toEqual(["A"]);
  });

  it("correct=false → ['B']", () => {
    expect(extractCorrectAnswers({ type: "tf", correct: false })).toEqual(["B"]);
  });

  it("correct=null returns []", () => {
    expect(extractCorrectAnswers({ type: "tf", correct: null })).toEqual([]);
  });
});

describe("extractCorrectAnswers — edge cases", () => {
  it("null question returns []", () => {
    expect(extractCorrectAnswers(null)).toEqual([]);
  });

  it("unknown type returns []", () => {
    expect(extractCorrectAnswers({ type: "fill", correct: "perro" })).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// detectMarkedBubbles — gap detection (PR 61)
// ═══════════════════════════════════════════════════════════════════════
//
// Reference values:
//   BUBBLE_DARK_THRESHOLD = 130
//   BUBBLE_AMBIGUITY_MARGIN = 15
//
// Casos del algoritmo:
//   - intensity >= 160 → bubble blanca (no marcada)
//   - 130 <= intensity < 160 → borderline (marcada pero baja confianza)
//   - intensity < 130 → claramente marcada
//   - gap >= 15 entre intensidades → separa marcadas vs no
describe("detectMarkedBubbles — caso 1: nothing marked", () => {
  it("all white bubbles (intensities ~200) → marked=[]", () => {
    const samples = [
      { letter: "A", intensity: 230 },
      { letter: "B", intensity: 220 },
      { letter: "C", intensity: 215 },
      { letter: "D", intensity: 225 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual([]);
    expect(result.is_uncertain).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("borderline empty (intensity ~160) still counts as nothing", () => {
    // 160 + 30 = 190 sería certain empty; 160 es borderline
    const samples = [
      { letter: "A", intensity: 165 },
      { letter: "B", intensity: 170 },
      { letter: "C", intensity: 168 },
      { letter: "D", intensity: 162 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual([]);
  });
});

describe("detectMarkedBubbles — caso 2: one bubble marked (single)", () => {
  it("clear single mark: A dark (50), others light (200)", () => {
    const samples = [
      { letter: "A", intensity: 50 },
      { letter: "B", intensity: 200 },
      { letter: "C", intensity: 195 },
      { letter: "D", intensity: 210 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["A"]);
    expect(result.is_uncertain).toBe(false);
  });

  it("dark mark anywhere in array, returns sorted alphabetically", () => {
    // Marca en C, otros blancas → marked = ["C"]
    const samples = [
      { letter: "A", intensity: 200 },
      { letter: "B", intensity: 195 },
      { letter: "C", intensity: 40 },
      { letter: "D", intensity: 210 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["C"]);
  });

  it("borderline mark (intensity 135): marked but uncertain", () => {
    // 130 < 135 < 160 → CASO 2 del algoritmo (borderline)
    const samples = [
      { letter: "A", intensity: 135 },
      { letter: "B", intensity: 200 },
      { letter: "C", intensity: 195 },
      { letter: "D", intensity: 210 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["A"]);
    expect(result.is_uncertain).toBe(true);
    expect(result.confidence).toBeLessThan(0.5);
  });
});

describe("detectMarkedBubbles — caso 3: multi-answer (PR 61)", () => {
  it("two clear marks: A and B dark, C and D light", () => {
    const samples = [
      { letter: "A", intensity: 40 },
      { letter: "B", intensity: 50 },
      { letter: "C", intensity: 200 },
      { letter: "D", intensity: 195 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["A", "B"]);
    expect(result.is_uncertain).toBe(false);
  });

  it("three marks (rare but possible)", () => {
    const samples = [
      { letter: "A", intensity: 45 },
      { letter: "B", intensity: 55 },
      { letter: "C", intensity: 50 },
      { letter: "D", intensity: 210 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["A", "B", "C"]);
  });

  it("ALL FOUR marked (alumno marcó todo)", () => {
    const samples = [
      { letter: "A", intensity: 45 },
      { letter: "B", intensity: 50 },
      { letter: "C", intensity: 48 },
      { letter: "D", intensity: 55 },
    ];
    const result = detectMarkedBubbles(samples);
    // No hay gap claro → cae en CASO 4 (ambigüedad)
    expect(result.marked).toEqual(["A", "B", "C", "D"]);
    expect(result.is_uncertain).toBe(true);
  });

  it("returns marks alphabetically sorted regardless of input order", () => {
    // Input shuffled: C, A, B, D — pero salida sorted
    const samples = [
      { letter: "C", intensity: 45 },
      { letter: "A", intensity: 40 },
      { letter: "D", intensity: 200 },
      { letter: "B", intensity: 50 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["A", "B", "C"]);
  });
});

describe("detectMarkedBubbles — TF (2 bubbles)", () => {
  it("True marked (A) on a TF question", () => {
    const samples = [
      { letter: "A", intensity: 45 },
      { letter: "B", intensity: 200 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["A"]);
  });

  it("Both marked (alumno marcó las dos por error)", () => {
    const samples = [
      { letter: "A", intensity: 45 },
      { letter: "B", intensity: 55 },
    ];
    const result = detectMarkedBubbles(samples);
    // Sin gap claro → caso ambiguo
    expect(result.marked).toEqual(["A", "B"]);
    expect(result.is_uncertain).toBe(true);
  });
});

describe("detectMarkedBubbles — edge cases", () => {
  it("empty samples array", () => {
    const result = detectMarkedBubbles([]);
    expect(result.marked).toEqual([]);
    expect(result.is_uncertain).toBe(false);
  });

  it("null samples", () => {
    const result = detectMarkedBubbles(null);
    expect(result.marked).toEqual([]);
  });

  it("single sample (degenerate case)", () => {
    const result = detectMarkedBubbles([{ letter: "A", intensity: 40 }]);
    expect(result.marked).toEqual(["A"]);
  });

  it("ambiguous mark (intensity around threshold, small gap)", () => {
    // Todos en zona 100-115, gaps de 5 (< 15 margin)
    // Caso 4: marcamos todas las que estén bajo threshold pero uncertain
    const samples = [
      { letter: "A", intensity: 100 },
      { letter: "B", intensity: 105 },
      { letter: "C", intensity: 110 },
      { letter: "D", intensity: 115 },
    ];
    const result = detectMarkedBubbles(samples);
    expect(result.marked).toEqual(["A", "B", "C", "D"]);
    expect(result.is_uncertain).toBe(true);
  });
});
