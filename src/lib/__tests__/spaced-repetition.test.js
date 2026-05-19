// ─── spaced-repetition.test.js ─────────────────────────────────────────
//
// PR 70: tests para las funciones puras de spaced-repetition.js.
//
// El módulo es enorme (1164 líneas) pero la mayoría son async functions
// que tocan Supabase. Solo testeamos las funciones PURAS de cálculo:
//
//   - percentToQuality(percent): mapea % correctas a quality 0-5
//   - calculateSM2({...}): el algoritmo SM-2 (ease factor, interval, repetition)
//   - calculateRetention(lastReviewedAt, intervalDays, correctRate): forgetting curve
//
// Estos son los CORES del spaced repetition. Si están rotos, el "review
// pool" sugiere cosas equivocadas y el feature pierde valor.

import { describe, it, expect } from "vitest";
import { _internal } from "../spaced-repetition";

const { percentToQuality, calculateSM2, calculateRetention } = _internal;

// ═══════════════════════════════════════════════════════════════════════
// percentToQuality — mapping del % al quality del SM-2
// ═══════════════════════════════════════════════════════════════════════
describe("percentToQuality", () => {
  it("90%+ → quality 5 (perfect)", () => {
    expect(percentToQuality(100)).toBe(5);
    expect(percentToQuality(95)).toBe(5);
    expect(percentToQuality(90)).toBe(5);
  });

  it("80-89% → quality 4 (good)", () => {
    expect(percentToQuality(89)).toBe(4);
    expect(percentToQuality(85)).toBe(4);
    expect(percentToQuality(80)).toBe(4);
  });

  it("70-79% → quality 3 (acceptable, still passes the threshold)", () => {
    expect(percentToQuality(79)).toBe(3);
    expect(percentToQuality(70)).toBe(3);
  });

  it("50-69% → quality 2 (fail — gets reset in SM-2)", () => {
    expect(percentToQuality(69)).toBe(2);
    expect(percentToQuality(50)).toBe(2);
  });

  it("30-49% → quality 1 (poor)", () => {
    expect(percentToQuality(49)).toBe(1);
    expect(percentToQuality(30)).toBe(1);
  });

  it("0-29% → quality 0 (complete failure)", () => {
    expect(percentToQuality(29)).toBe(0);
    expect(percentToQuality(15)).toBe(0);
    expect(percentToQuality(0)).toBe(0);
  });

  it("threshold boundary: 70 vs 69 (3 vs 2 — el límite passes/fails!)", () => {
    // En SM-2, quality >= 3 = passes, < 3 = reset. Este boundary es CRÍTICO.
    expect(percentToQuality(70)).toBe(3);   // pasa
    expect(percentToQuality(69)).toBe(2);   // falla → reset
  });
});

// ═══════════════════════════════════════════════════════════════════════
// calculateSM2 — el algoritmo de Anki/SuperMemo
// ═══════════════════════════════════════════════════════════════════════
describe("calculateSM2 — first review (repetition=0)", () => {
  it("good first answer (quality 5) → interval becomes 1 day", () => {
    const result = calculateSM2({ quality: 5 });
    expect(result.interval).toBe(1);  // first time → always 1 day
    expect(result.repetition).toBe(1);
    // EF aumenta porque quality fue alto
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  it("perfect first answer doesn't skip ahead — still interval=1", () => {
    // SM-2 quiere ver al menos 2 reviews antes de hacer intervalos largos
    const result = calculateSM2({ quality: 5, repetition: 0 });
    expect(result.interval).toBe(1);
  });

  it("failed first answer → interval=1, repetition resets to 0", () => {
    const result = calculateSM2({ quality: 1, repetition: 0 });
    expect(result.interval).toBe(1);
    expect(result.repetition).toBe(0);
    // EF baja porque quality fue bajo
    expect(result.easeFactor).toBeLessThan(2.5);
  });
});

describe("calculateSM2 — second review (repetition=1)", () => {
  it("good second answer (quality >= 3) → interval=3 days", () => {
    const result = calculateSM2({ quality: 4, repetition: 1, interval: 1 });
    expect(result.interval).toBe(3);  // segunda vez bien → 3 días
    expect(result.repetition).toBe(2);
  });

  it("failed second answer → reset (interval=1, rep=0)", () => {
    const result = calculateSM2({ quality: 1, repetition: 1, interval: 1 });
    expect(result.interval).toBe(1);
    expect(result.repetition).toBe(0);
  });
});

describe("calculateSM2 — third+ review (uses ease factor)", () => {
  it("good third answer multiplies interval by easeFactor", () => {
    // rep=2, interval=3, EF=2.5 → newInterval = 3 * 2.5 = 7.5 → 8
    const result = calculateSM2({ quality: 4, repetition: 2, interval: 3, easeFactor: 2.5 });
    expect(result.interval).toBe(8);  // round(3 * 2.5)
    expect(result.repetition).toBe(3);
  });

  it("higher EF = longer intervals (after several reviews)", () => {
    const lowEF = calculateSM2({ quality: 4, repetition: 3, interval: 10, easeFactor: 1.5 });
    const highEF = calculateSM2({ quality: 4, repetition: 3, interval: 10, easeFactor: 3.0 });
    expect(highEF.interval).toBeGreaterThan(lowEF.interval);
  });

  it("interval gets capped at 180 days (6 months)", () => {
    // interval grande * EF alto → resultado debería capped a 180
    const result = calculateSM2({ quality: 5, repetition: 5, interval: 100, easeFactor: 2.5 });
    expect(result.interval).toBeLessThanOrEqual(180);
  });

  it("any wrong answer resets everything", () => {
    // Aunque el alumno tenía rep=5 e interval=80, una respuesta mal lo manda al principio
    const result = calculateSM2({ quality: 2, repetition: 5, interval: 80, easeFactor: 2.7 });
    expect(result.interval).toBe(1);
    expect(result.repetition).toBe(0);
    // EF baja (pero no se resetea)
    expect(result.easeFactor).toBeLessThan(2.7);
  });
});

describe("calculateSM2 — ease factor bounds", () => {
  it("EF doesn't go below 1.3 (SM-2 minimum)", () => {
    // Hacer N reviews fallidas consecutivas — EF debería frenar en 1.3
    let state = { quality: 0, repetition: 0, interval: 1, easeFactor: 1.3 };
    for (let i = 0; i < 10; i++) {
      state = calculateSM2({ ...state, quality: 0 });
    }
    expect(state.easeFactor).toBe(1.3);
  });

  it("EF round to 2 decimal places", () => {
    const result = calculateSM2({ quality: 5, repetition: 0, easeFactor: 2.5 });
    // EF debería ser número con 2 decimales máximo
    const str = String(result.easeFactor);
    const decimals = str.includes(".") ? str.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// calculateRetention — forgetting curve
// ═══════════════════════════════════════════════════════════════════════
describe("calculateRetention", () => {
  it("returns 0 if no last review (never studied)", () => {
    expect(calculateRetention(null, 1, 0.8)).toBe(0);
    expect(calculateRetention(undefined, 1, 0.8)).toBe(0);
  });

  it("retention is high right after a perfect review", () => {
    const justNow = new Date().toISOString();
    const retention = calculateRetention(justNow, 7, 1.0);
    // Justo después de un review perfecto, retention debería ser ~100%
    expect(retention).toBeGreaterThan(90);
  });

  it("retention drops over time (forgetting curve)", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const recent = calculateRetention(fiveDaysAgo, 7, 1.0);
    const older = calculateRetention(tenDaysAgo, 7, 1.0);

    // Más viejo = menos retention
    expect(older).toBeLessThan(recent);
  });

  it("low correctRate scales retention down proportionally", () => {
    const justNow = new Date().toISOString();
    const perfect = calculateRetention(justNow, 7, 1.0);
    const half = calculateRetention(justNow, 7, 0.5);

    // Con la mitad del correct rate, retention base es ~la mitad
    expect(half).toBeLessThan(perfect);
    expect(half).toBeGreaterThan(perfect * 0.3);  // pero no es 0
  });

  it("retention is between 0 and 100", () => {
    const justNow = new Date().toISOString();
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    expect(calculateRetention(justNow, 1, 1.0)).toBeLessThanOrEqual(100);
    expect(calculateRetention(yearAgo, 1, 0.0)).toBeGreaterThanOrEqual(0);
  });

  it("longer interval (stability) = slower forgetting", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    // Mismo tiempo desde el review, pero con intervalos distintos
    const shortInterval = calculateRetention(tenDaysAgo, 5, 1.0);
    const longInterval = calculateRetention(tenDaysAgo, 30, 1.0);

    // Si el alumno tiene un interval largo (= conoce bien el tema), retention
    // se mantiene más alta a los mismos N días.
    expect(longInterval).toBeGreaterThan(shortInterval);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Integración: percentToQuality + calculateSM2 (workflow real)
// ═══════════════════════════════════════════════════════════════════════
describe("integration: percentToQuality + calculateSM2", () => {
  it("simula 5 sesiones de un alumno que mejora", () => {
    // Sesión 1: alumno saca 60% (q=2, falla, reset)
    // Sesión 2: 70% (q=3, primera vez bien → interval=1)
    // Sesión 3: 80% (q=4, segunda vez bien → interval=3)
    // Sesión 4: 90% (q=5, tercera → 3 * EF)
    // Sesión 5: 100% (q=5, cuarta → previo * EF)
    let state = { easeFactor: 2.5, interval: 1, repetition: 0 };

    state = calculateSM2({ ...state, quality: percentToQuality(60) });
    expect(state.interval).toBe(1);  // falló, reset

    state = calculateSM2({ ...state, quality: percentToQuality(70) });
    expect(state.interval).toBe(1);  // primera vez bien

    state = calculateSM2({ ...state, quality: percentToQuality(80) });
    expect(state.interval).toBe(3);  // segunda vez bien

    state = calculateSM2({ ...state, quality: percentToQuality(90) });
    expect(state.interval).toBeGreaterThanOrEqual(6);  // tercera (3 * EF ≈ 6)

    state = calculateSM2({ ...state, quality: percentToQuality(100) });
    expect(state.interval).toBeGreaterThanOrEqual(12);  // sigue creciendo (~6 * EF)
  });

  it("un alumno que falla TODO siempre vuelve a interval=1", () => {
    let state = { easeFactor: 2.5, interval: 1, repetition: 0 };

    for (let i = 0; i < 5; i++) {
      state = calculateSM2({ ...state, quality: percentToQuality(20) });
      expect(state.interval).toBe(1);  // siempre interval=1
      expect(state.repetition).toBe(0);  // siempre rep=0
    }
    // EF debería estar en el mínimo (1.3)
    expect(state.easeFactor).toBe(1.3);
  });
});
