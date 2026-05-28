# Analytics Studio — Fase 5 (Predictivo + Cleo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar el pilar **IA** del Analytics Studio: (1) forecast band en charts de tendencia, (2) student risk badges en el roster y vista de detalle, (3) Cleo con narrativas REALES (no placeholder) sobre los datos analíticos en `CleoStrip` / `CleoStudentStrip`, (4) class+student-scoped review generator que activa los chips "Generar repaso" / "Asignar repaso" que F1/F2 dejaron stub, y (5) nueva vista **Analista Cleo** en `/school/ask` — chat con datos donde Cleo recibe el payload de las RPCs como contexto.

**Architecture:** **1 RPC nuevo** (`student_risk` — devuelve insumos crudos por alumno; score se calcula en cliente con `risk.ts` para mantener la heurística testeable sin DB). **2 endpoints Vercel nuevos** (`api/analytics-narrative.js` para narrativas de strips, extiende `api/cleo-chat.js` para aceptar `analyticsContext`). **3 libs puras nuevas** (`forecast.ts` regresión lineal + proyección, `risk.ts` heurística at-risk + razones, `cleo-analytics.ts` payload builder para Cleo). **1 chart extension** (`TrendBarChart` acepta prop `forecast` y usa `ComposedChart` para mezclar barras + línea punteada de pronóstico). **1 generator wrapper** (`generateClassReviewQuestions` en `close-unit-ai.js` — reusa `/api/generate` pero con context class-scoped, no unit). **1 página nueva** (`CleoAnalyst` en `src/pages/analytics/`, ruta `/school/ask`, reusa pattern de `CleoChat` con scope analítico).

**Tech Stack:** React 18, `@tanstack/react-query` v5, `recharts` (ComposedChart), vitest, Postgres SECURITY DEFINER RPC, Vercel Functions, Gemini Flash (env `GEMINI_API_KEY` ya configurado).

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §8.1 (Predictivo + Cleo), §6.2 (RPC `student_risk`), §9 (F5 row).

**Branch:** `claude/analytics-studio-f5` — **FRESH off main** (lección aprendida en F0-F4: stacked PRs + squash rompe; cada fase off main desde el inicio).

**Depends on:** F0 (RPCs `analytics_overview`, `class_analytics`, `class_timeseries`, hooks, `StudioShell`), F1 (`CleoStrip`, `MostMissedList`, `RosterTable`, `TrendPanel`, `TrendBarChart`), F2 (`CleoStudentStrip`, `StudentMostFailedList`, `TrajectoryPanel`, `useStudentDetail`), F3 (`TopicMastery`), F4 (`benchmark.ts`, `CompareToggle`).

---

## Pre-task: File Structure

**Create (11 files):**

```
src/lib/analytics/
  forecast.ts                                   # NEW: linearRegression + forecastPoints
  __tests__/forecast.test.ts                    # NEW
  risk.ts                                       # NEW: riskScore + classify + reasons
  __tests__/risk.test.ts                        # NEW
  cleo-analytics.ts                             # NEW: pure-ish payload builder for Cleo
  __tests__/cleo-analytics.test.ts              # NEW

src/hooks/
  useStudentRisk.js                             # NEW: RQ wrapper for student_risk RPC

src/components/analytics/
  RiskBadge.jsx                                 # NEW: small chip "Alto/Medio/Bajo riesgo"
  StudentRiskCard.jsx                           # NEW: top-of-StudentProfile card showing score + reasons

src/pages/analytics/
  CleoAnalyst.jsx                               # NEW: /school/ask chat UI

api/
  analytics-narrative.js                        # NEW: POST endpoint that returns Cleo narrative

supabase/migrations/
  20240101000071_student_risk_rpc.sql           # NEW: student_risk RPC SECURITY DEFINER
```

**Modify (15 files):**

```
src/lib/analytics/index.ts                      # +export forecast, risk, cleo-analytics
src/components/analytics/index.ts               # +export RiskBadge, StudentRiskCard
src/lib/close-unit-ai.js                        # +generateClassReviewQuestions + generateStudentReviewQuestions
src/components/charts/TrendBarChart.jsx         # +forecast prop (ComposedChart, dashed line)
src/components/analytics/TrendPanel.jsx         # +forecast pass-through, drop "pronóstico en F5" hint
src/components/analytics/TrajectoryPanel.jsx    # +forecast pass-through, drop "pronóstico en F5" hint
src/components/analytics/TopicTrendPanel.jsx    # +forecast pass-through (optional; small chart)
src/components/analytics/CleoStrip.jsx          # real narrative fetch + chips activos
src/components/analytics/CleoStudentStrip.jsx   # real narrative fetch + chips activos
src/components/analytics/MostMissedList.jsx     # chip "Generar repaso" cableado
src/components/analytics/StudentMostFailedList.jsx  # chip "Asignar repaso" cableado
src/components/analytics/RosterTable.jsx        # +columna RiskBadge
src/pages/analytics/ClassDetail.jsx             # useStudentRisk + forecast en TrendPanel + roster con risk
src/pages/analytics/StudentProfile.jsx          # StudentRiskCard + forecast en TrajectoryPanel
src/pages/analytics/TopicMastery.jsx            # forecast en TopicTrendPanel
src/App.jsx                                     # +lazy import CleoAnalyst + route handler
src/routes.ts                                   # +ROUTES.ANALYTICS_ASK, +buildRoute.analyticsAsk, +pathToPage
api/cleo-chat.js                                # +analyticsContext handling (server-side RPC + system extension)
```

**Out of scope for F5 (explicit):**
- **Email digest** (F7).
- **CleoStudentStrip's "Mensaje a familia" chip** — F5 deja el chip pero queda stub (`pronto`) porque no hay infra de mensajería a familias todavía. El otro chip ("Asignarle repaso") sí se cablea.
- **"Reenseñar ahora" chip de CleoStrip** — gesto = abrir el `MostMissedList` highlightado. F5 cablea como `scrollIntoView` + glow (no flujo nuevo).
- **"Que vuelva mañana" chip de CleoStrip** — F5 deja stub. Implementación requiere infra de scheduling que no es F5.
- **Crossfilter compartido (Context useCrossfilter)** — spec §7.3 lo menciona pero es polish posterior.
- **Drawer lateral** (spec §5.2) — F5 no abre drawer al click; el click en alumno sigue navegando a `/school/student/...`.
- **Realtime risk updates** durante sesión activa (F6).

---

## Task 1: TDD — `forecast.ts` pure lib

**Files:**
- Test: `src/lib/analytics/__tests__/forecast.test.ts`
- Create: `src/lib/analytics/forecast.ts`

Regresión lineal simple + extensión a N puntos futuros. Reusa el patrón de `metrics.ts.trendSlope` pero devuelve `{slope, intercept}` para poder extrapolar.

- [ ] **Step 1: Write failing tests.**

Crear `src/lib/analytics/__tests__/forecast.test.ts`:

```ts
/* @vitest-environment node */
// Pure forecast helpers for Analytics Studio F5.

import { describe, it, expect } from "vitest";
import { linearRegression, forecastPoints } from "../forecast";

describe("linearRegression", () => {
  it("recovers slope and intercept of a perfect line", () => {
    // y = 2x + 5
    const pts = [
      { x: 0, y: 5 },
      { x: 1, y: 7 },
      { x: 2, y: 9 },
      { x: 3, y: 11 },
    ];
    const r = linearRegression(pts);
    expect(r).not.toBeNull();
    expect(r!.slope).toBeCloseTo(2, 6);
    expect(r!.intercept).toBeCloseTo(5, 6);
  });
  it("returns null when fewer than 2 points", () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 0, y: 1 }])).toBeNull();
  });
  it("returns null when all x are identical (vertical line)", () => {
    expect(linearRegression([{ x: 1, y: 0 }, { x: 1, y: 5 }])).toBeNull();
  });
  it("filters out non-finite values", () => {
    const pts = [
      { x: 0, y: 10 },
      { x: 1, y: Number.NaN },
      { x: 2, y: 30 },
    ];
    const r = linearRegression(pts);
    expect(r).not.toBeNull();
    expect(r!.slope).toBeCloseTo(10, 6);
    expect(r!.intercept).toBeCloseTo(10, 6);
  });
});

describe("forecastPoints", () => {
  it("extrapolates N points from a data series with linear trend", () => {
    // data: y = 10, 20, 30, 40 (slope=10, intercept=10)
    const data = [
      { bucket: "Mon", value: 10 },
      { bucket: "Tue", value: 20 },
      { bucket: "Wed", value: 30 },
      { bucket: "Thu", value: 40 },
    ];
    const fc = forecastPoints(data, 3);
    expect(fc).toHaveLength(3);
    expect(fc[0].value).toBeCloseTo(50, 4);
    expect(fc[1].value).toBeCloseTo(60, 4);
    expect(fc[2].value).toBeCloseTo(70, 4);
    expect(fc[0].bucket).toBe("+1");
    expect(fc[2].bucket).toBe("+3");
  });
  it("returns [] when data is too short to fit a line", () => {
    expect(forecastPoints([], 3)).toEqual([]);
    expect(forecastPoints([{ bucket: "x", value: 5 }], 3)).toEqual([]);
  });
  it("clamps negative forecasts to 0 (so % can't go below 0)", () => {
    // Strongly decreasing series; forecast would dip negative.
    const data = [
      { bucket: "a", value: 30 },
      { bucket: "b", value: 20 },
      { bucket: "c", value: 10 },
    ];
    const fc = forecastPoints(data, 3, { clampMin: 0 });
    expect(fc[0].value).toBe(0);
    expect(fc[2].value).toBe(0);
  });
  it("uses provided horizon count even on a flat series (slope = 0)", () => {
    const data = [
      { bucket: "a", value: 50 },
      { bucket: "b", value: 50 },
      { bucket: "c", value: 50 },
    ];
    const fc = forecastPoints(data, 2);
    expect(fc).toHaveLength(2);
    expect(fc[0].value).toBe(50);
    expect(fc[1].value).toBe(50);
  });
});
```

- [ ] **Step 2: Run; expect red.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: vitest fails — module missing.

- [ ] **Step 3: Implement `src/lib/analytics/forecast.ts`.**

```ts
// ─── src/lib/analytics/forecast.ts ─────────────────────────────────────
// Pure forecast helpers (regresión lineal simple + proyección a N puntos).
// Sin React, sin Supabase. Used por TrendBarChart's `forecast` prop en F5
// (banda de pronóstico al final de las series de tendencia).
//
// Heurística: ajusta y = slope*x + intercept por mínimos cuadrados sobre
// los datos del rango actual; extrapola N puntos hacia adelante (índices
// n, n+1, ...). Si el slope no se puede calcular (puntos insuficientes /
// x idénticos), devuelve null o []. Clamp opcional para evitar valores
// fuera de rango razonable (e.g. % no puede ser < 0).

export type Point = { x: number; y: number };

export interface RegressionResult {
  slope: number;
  intercept: number;
}

/**
 * Fits y = slope*x + intercept via ordinary least squares.
 * Returns null if fewer than 2 finite points or all x are identical.
 */
export function linearRegression(
  points: readonly Point[],
): RegressionResult | null {
  if (!points || points.length < 2) return null;
  const clean: Point[] = [];
  for (const p of points) {
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) clean.push(p);
  }
  if (clean.length < 2) return null;
  const n = clean.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of clean) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export interface ForecastBucket {
  bucket: string;
  value: number;
}

export interface ForecastOptions {
  /** Lower bound for forecasted values (e.g. 0 for %). Default: no clamp. */
  clampMin?: number;
  /** Upper bound (e.g. 100 for %). Default: no clamp. */
  clampMax?: number;
}

/**
 * Extrapolate `horizon` future points from a series. Each input bucket
 * becomes (i, value) for the regression; outputs are labeled "+1", "+2", …
 * Returns [] when the data is too short to fit a line.
 */
export function forecastPoints(
  data: readonly ForecastBucket[],
  horizon: number,
  opts: ForecastOptions = {},
): ForecastBucket[] {
  if (!data || data.length < 2 || horizon < 1) return [];
  const pts: Point[] = data.map((d, i) => ({ x: i, y: Number(d.value) }));
  const fit = linearRegression(pts);
  if (!fit) return [];
  const out: ForecastBucket[] = [];
  for (let k = 1; k <= horizon; k++) {
    const xNext = data.length - 1 + k;
    let v = fit.slope * xNext + fit.intercept;
    if (opts.clampMin != null) v = Math.max(opts.clampMin, v);
    if (opts.clampMax != null) v = Math.min(opts.clampMax, v);
    out.push({ bucket: `+${k}`, value: Math.round(v * 10) / 10 });
  }
  return out;
}
```

- [ ] **Step 4: Run tests; expect green.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: previos (46) + 9 nuevos forecast tests = ≥55 passing.

- [ ] **Step 5: Barrel.**

Agregar a `src/lib/analytics/index.ts`:

```ts
export * from "./forecast";
```

- [ ] **Step 6: Commit.**

```bash
git add src/lib/analytics/forecast.ts src/lib/analytics/__tests__/forecast.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): forecast.ts — linear regression + forecastPoints (F5)

Pure helpers para banda de pronóstico en TrendBarChart. linearRegression
fitting + forecastPoints extrapola N puntos con clamp opcional para
mantener % en [0,100]. Sin React, sin Supabase. ~9 unit tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: TDD — `risk.ts` pure lib

**Files:**
- Test: `src/lib/analytics/__tests__/risk.test.ts`
- Create: `src/lib/analytics/risk.ts`

Heurística at-risk: combina (a) slope de retención reciente, (b) participación reciente (% sesiones en las que participó), (c) días desde última actividad, (d) varianza, (e) recent_pct_correct, y devuelve `{score 0-100, level, reasons}`. Cada factor contribuye 0-20 puntos al riesgo (suma máx 100, pero distintos casos pueden no sumar todos).

- [ ] **Step 1: Write failing tests.**

Crear `src/lib/analytics/__tests__/risk.test.ts`:

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { riskScore, classifyRisk } from "../risk";

describe("riskScore", () => {
  it("returns score 0 + low + no reasons for a perfect student", () => {
    const r = riskScore({
      recentPctCorrect: 95,
      weeklyPctCorrect: [80, 85, 90, 95],
      recentParticipation: 100,
      daysSinceLastActivity: 0,
    });
    expect(r.score).toBe(0);
    expect(r.level).toBe("low");
    expect(r.reasons).toEqual([]);
  });

  it("flags low recent pct as a reason and adds points", () => {
    const r = riskScore({
      recentPctCorrect: 35,
      weeklyPctCorrect: [60, 55, 50, 35],
      recentParticipation: 100,
      daysSinceLastActivity: 1,
    });
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.some((s) => s.toLowerCase().includes("correcto") || s.toLowerCase().includes("rendimiento"))).toBe(true);
  });

  it("flags downward slope (declining trend)", () => {
    const r = riskScore({
      recentPctCorrect: 60,
      weeklyPctCorrect: [80, 75, 65, 55],
      recentParticipation: 100,
      daysSinceLastActivity: 0,
    });
    expect(r.reasons.some((s) => s.toLowerCase().includes("baja") || s.toLowerCase().includes("cae"))).toBe(true);
  });

  it("flags inactive student", () => {
    const r = riskScore({
      recentPctCorrect: 70,
      weeklyPctCorrect: [70, 70, 70],
      recentParticipation: 50,
      daysSinceLastActivity: 21,
    });
    expect(r.reasons.some((s) => s.toLowerCase().includes("día") || s.toLowerCase().includes("inactivo"))).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(20);
  });

  it("flags low participation", () => {
    const r = riskScore({
      recentPctCorrect: 75,
      weeklyPctCorrect: [75, 75],
      recentParticipation: 30,
      daysSinceLastActivity: 2,
    });
    expect(r.reasons.some((s) => s.toLowerCase().includes("participa"))).toBe(true);
  });

  it("caps the score at 100", () => {
    const r = riskScore({
      recentPctCorrect: 10,
      weeklyPctCorrect: [60, 50, 30, 10],
      recentParticipation: 5,
      daysSinceLastActivity: 60,
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.level).toBe("high");
  });

  it("handles missing inputs gracefully (returns score 0 + low)", () => {
    const r = riskScore({
      recentPctCorrect: null,
      weeklyPctCorrect: [],
      recentParticipation: null,
      daysSinceLastActivity: null,
    });
    expect(r.score).toBe(0);
    expect(r.level).toBe("low");
  });
});

describe("classifyRisk", () => {
  it("low under 30", () => {
    expect(classifyRisk(0)).toBe("low");
    expect(classifyRisk(29)).toBe("low");
  });
  it("med 30-59", () => {
    expect(classifyRisk(30)).toBe("med");
    expect(classifyRisk(59)).toBe("med");
  });
  it("high 60+", () => {
    expect(classifyRisk(60)).toBe("high");
    expect(classifyRisk(100)).toBe("high");
  });
});
```

- [ ] **Step 2: Run; expect red.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: fails — module missing.

- [ ] **Step 3: Implement `src/lib/analytics/risk.ts`.**

```ts
// ─── src/lib/analytics/risk.ts ─────────────────────────────────────────
// Pure at-risk heuristic. Combina 4 señales en un score 0-100 + razones.
// Sin React, sin Supabase. La RPC `student_risk` devuelve los INSUMOS
// crudos por alumno; este módulo calcula el score final en el cliente.
// (Mantener la heurística en JS la hace testeable sin DB y deja la RPC
// SQL al mínimo — un solo source of truth para la matemática.)
//
// Factores:
//   • recentPctCorrect (0-100): bajo desempeño suma riesgo. 50- = +20.
//   • slope (vía weeklyPctCorrect[]): cae rápido = +20. Sube = 0.
//   • recentParticipation (0-100): < 50% = +20.
//   • daysSinceLastActivity (días): > 14 = +20, > 7 = +10.
//
// Tope: 80 puntos en el caso pésimo (los 4 al máx). Sumamos un 5to "boost"
// de hasta 20 si recentPctCorrect < 30 (estudiantes en zona crítica), así
// el score llega a 100 en el caso real más extremo.

import { trendSlope } from "./metrics";

export type RiskLevel = "low" | "med" | "high";

export interface RiskInputs {
  /** Most-recent % correct (last 30d). Null/missing = neutral. */
  recentPctCorrect: number | null | undefined;
  /** Weekly pct_correct (chronological). 4+ buckets recommended for slope. */
  weeklyPctCorrect: readonly number[];
  /** % of class sessions the student joined in the window (0-100). */
  recentParticipation: number | null | undefined;
  /** Days since the student's last response. Null/missing = neutral. */
  daysSinceLastActivity: number | null | undefined;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  reasons: string[];
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 60) return "high";
  if (score >= 30) return "med";
  return "low";
}

export function riskScore(inputs: RiskInputs): RiskResult {
  const reasons: string[] = [];
  let score = 0;

  // (a) Bajo % correcto reciente
  const recent = inputs.recentPctCorrect;
  if (recent != null && Number.isFinite(recent)) {
    if (recent < 30) {
      score += 20;
      score += 20; // boost zona crítica (ver header)
      reasons.push(`Rendimiento muy bajo (${Math.round(recent)}% correcto).`);
    } else if (recent < 50) {
      score += 20;
      reasons.push(`Rendimiento bajo (${Math.round(recent)}% correcto).`);
    } else if (recent < 70) {
      score += 10;
      reasons.push(`Rendimiento promedio (${Math.round(recent)}% correcto).`);
    }
  }

  // (b) Slope de tendencia semanal
  const weekly = inputs.weeklyPctCorrect ?? [];
  if (weekly.length >= 3) {
    const pts = weekly.map((y, i) => ({ x: i, y }));
    const m = trendSlope(pts);
    if (m != null) {
      if (m <= -5) {
        score += 20;
        reasons.push("Su rendimiento baja rápido semana a semana.");
      } else if (m <= -2) {
        score += 10;
        reasons.push("Su rendimiento cae levemente.");
      }
    }
  }

  // (c) Baja participación
  const part = inputs.recentParticipation;
  if (part != null && Number.isFinite(part)) {
    if (part < 30) {
      score += 20;
      reasons.push(`Apenas participa (${Math.round(part)}% de las sesiones).`);
    } else if (part < 60) {
      score += 10;
      reasons.push(`Participa poco (${Math.round(part)}% de las sesiones).`);
    }
  }

  // (d) Días sin actividad
  const days = inputs.daysSinceLastActivity;
  if (days != null && Number.isFinite(days)) {
    if (days > 14) {
      score += 20;
      reasons.push(`Inactivo hace ${Math.floor(days)} días.`);
    } else if (days > 7) {
      score += 10;
      reasons.push(`Inactivo hace ${Math.floor(days)} días.`);
    }
  }

  score = Math.min(100, Math.max(0, score));
  return {
    score,
    level: classifyRisk(score),
    reasons,
  };
}
```

- [ ] **Step 4: Run tests; expect green.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: previos + 9 forecast + 9 risk = ≥64 tests passing.

- [ ] **Step 5: Barrel + commit.**

Agregar a `src/lib/analytics/index.ts`:

```ts
export * from "./risk";
```

```bash
git add src/lib/analytics/risk.ts src/lib/analytics/__tests__/risk.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): risk.ts — at-risk heuristic + reasons (F5)

Pure riskScore({recentPctCorrect, weeklyPctCorrect, recentParticipation,
daysSinceLastActivity}) → {score 0-100, level low/med/high, reasons[]}.
Suma 4 señales con razones en español. classifyRisk thresholds: <30 low,
<60 med, ≥60 high. 9 unit tests cubren cases positivos, edge (missing
inputs), y cap a 100.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: SQL migration 071 — `student_risk` RPC

**Files:**
- Create: `supabase/migrations/20240101000071_student_risk_rpc.sql`

RPC SECURITY DEFINER que devuelve por cada alumno de una clase los **insumos crudos** que `risk.ts` consume. NO calcula el score (heurística vive en JS).

- [ ] **Step 1: Write the migration.**

```sql
-- ─── Analytics Studio F5 · student_risk RPC ─────────────────────────────
-- Devuelve los INSUMOS CRUDOS de riesgo para cada alumno de una clase:
-- recent_pct_correct (últimos 30d), weekly_pct_correct (array de 4 semanas),
-- recent_participation (% sesiones), days_since_last_activity, last_activity.
--
-- El score final + razones se calcula en cliente con src/lib/analytics/risk.ts
-- (heurística testeable sin DB).
--
-- Mismo patrón SECURITY DEFINER + ownership guard que class_analytics (066).

CREATE OR REPLACE FUNCTION "public"."student_risk"(
  p_class_id uuid,
  p_window_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
  v_from timestamptz;
  v_now timestamptz := now();
  v_total_sessions int;
  v_rows jsonb;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_from := v_now - (p_window_days || ' days')::interval;

  -- Total de sesiones COMPLETADAS de la clase en la ventana — denominador
  -- para participación.
  SELECT COUNT(*) INTO v_total_sessions
  FROM public.sessions s
  WHERE s.class_id = p_class_id
    AND s.completed_at IS NOT NULL
    AND s.completed_at >= v_from AND s.completed_at <= v_now;

  -- Por alumno (student_name como identidad — student_id queda como hint
  -- para dual-lookup en F5+ del schema)
  WITH per_student AS (
    SELECT
      sp.student_name,
      MAX(r.created_at) AS last_activity,
      EXTRACT(EPOCH FROM (v_now - MAX(r.created_at))) / 86400.0 AS days_since_last_activity,
      -- recent pct correct (toda la ventana)
      CASE
        WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL
      END AS recent_pct_correct,
      -- participación: # sesiones únicas del alumno / total clase
      COUNT(DISTINCT r.session_id) AS sessions_joined
    FROM public.responses r
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND r.created_at >= v_from AND r.created_at <= v_now
    GROUP BY sp.student_name
  ),
  -- 4 semanas más recientes por alumno (pct_correct semanal — para slope
  -- en cliente con metrics.trendSlope).
  weekly AS (
    SELECT
      sp.student_name,
      date_trunc('week', r.created_at)::date AS wk,
      CASE
        WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL
      END AS wk_pct
    FROM public.responses r
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND r.created_at >= (v_now - interval '28 days') AND r.created_at <= v_now
    GROUP BY sp.student_name, date_trunc('week', r.created_at)::date
  ),
  weekly_agg AS (
    SELECT
      student_name,
      COALESCE(
        jsonb_agg(wk_pct ORDER BY wk ASC) FILTER (WHERE wk_pct IS NOT NULL),
        '[]'::jsonb
      ) AS weekly_pct_correct
    FROM weekly
    GROUP BY student_name
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'student_name', ps.student_name,
    'last_activity', ps.last_activity,
    'days_since_last_activity', ROUND(ps.days_since_last_activity::numeric, 1),
    'recent_pct_correct', ps.recent_pct_correct,
    'recent_participation',
      CASE WHEN v_total_sessions > 0
        THEN ROUND((ps.sessions_joined::numeric / v_total_sessions) * 100, 1)
        ELSE NULL END,
    'sessions_joined', ps.sessions_joined,
    'weekly_pct_correct', COALESCE(w.weekly_pct_correct, '[]'::jsonb)
  ) ORDER BY ps.recent_pct_correct ASC NULLS LAST), '[]'::jsonb)
  INTO v_rows
  FROM per_student ps
  LEFT JOIN weekly_agg w ON w.student_name = ps.student_name;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'window_days', p_window_days,
    'from', v_from,
    'to', v_now,
    'total_sessions', v_total_sessions,
    'students', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."student_risk"(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."student_risk"(uuid, int) TO "authenticated";

COMMENT ON FUNCTION "public"."student_risk"(uuid, int) IS
  'Analytics Studio F5: insumos crudos de riesgo por alumno de una clase. Score final lo calcula el cliente con src/lib/analytics/risk.ts. SECURITY DEFINER + ownership guard.';
```

- [ ] **Step 2: NO ejecutar localmente — pedirle al usuario que aplique en Supabase SQL editor.**

El usuario aplica las migraciones de F0-F4 directamente en prod (memoria `project_analytics_studio.md`); F5 sigue el mismo patrón. Detener la implementación y pedir confirmación antes de mergear.

- [ ] **Step 3: Commit.**

```bash
git add supabase/migrations/20240101000071_student_risk_rpc.sql
git commit -m "feat(analytics): SQL student_risk RPC — raw at-risk inputs (F5)

Migration 071. SECURITY DEFINER RPC con ownership guard. Por cada alumno
de una clase devuelve recent_pct_correct, weekly_pct_correct[] (4 sem.),
recent_participation, days_since_last_activity, last_activity. El score
final lo calcula el cliente con src/lib/analytics/risk.ts.

User aplica con Supabase SQL editor antes de mergear (mismo flow que
migrations 064-070 de F0-F3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Hook `useStudentRisk`

**Files:**
- Create: `src/hooks/useStudentRisk.js`

Wrapper React Query del RPC. Mismo patrón que `useStudentDetail`.

- [ ] **Step 1: Write `src/hooks/useStudentRisk.js`.**

```js
// src/hooks/useStudentRisk.js
//
// F5 Analytics Studio: insumos at-risk por alumno de una clase.
// El score final se calcula en cliente con src/lib/analytics/risk.ts —
// el hook solo carga los inputs crudos via RPC student_risk (migration 071).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const studentRiskKey = (classId, windowDays) =>
  ["analytics", "studentRisk", classId, windowDays || 30];

async function fetchStudentRisk(classId, windowDays) {
  const { data, error } = await supabase.rpc("student_risk", {
    p_class_id: classId,
    p_window_days: windowDays || 30,
  });
  if (error) throw error;
  return data;
}

export function useStudentRisk(classId, { windowDays } = {}) {
  return useQuery({
    queryKey: studentRiskKey(classId, windowDays),
    enabled: !!classId,
    queryFn: () => fetchStudentRisk(classId, windowDays),
  });
}
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run build
git add src/hooks/useStudentRisk.js
git commit -m "feat(analytics): useStudentRisk hook (F5)

React Query wrapper del RPC student_risk. enabled gating en classId,
mismo patrón que useStudentDetail. windowDays default 30.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `TrendBarChart` — forecast prop con ComposedChart

**Files:**
- Modify: `src/components/charts/TrendBarChart.jsx`

Migrar el chart de `BarChart` a `ComposedChart` para poder mezclar Bar (la serie real) + Line (la proyección). El `forecast` prop es un array `[{bucket, value}]` que se concatena al final del eje X con un `stroke-dasharray` distinto.

- [ ] **Step 1: Update `src/components/charts/TrendBarChart.jsx`.**

Reemplazar el archivo completo:

```jsx
// src/components/charts/TrendBarChart.jsx
//
// F1 Analytics Studio: bar chart de tendencia (estilo Semrush).
// Recibe datos de useClassTimeseries: [{ bucket, value, responses_total, unique_participants }].
//
// F4: opcional compareData (mismo shape) → segunda serie translúcida overlay
// del período comparado.
// F5: opcional forecast (mismo shape) → puntos futuros (línea punteada al
// final). Internamente migra a ComposedChart para mezclar Bar + Line.
//
// Back-compat: si forecast y compareData son null, comportamiento idéntico a F1.

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const ACCENT = "#2563eb";
const COMPARE = "#bfdbfe";       // azul translúcido para el período comparado
const FORECAST = "#7c3aed";      // violeta Cleo para el pronóstico
const AXIS_COLOR = "#94a3b8";

function defaultFormatter(v) {
  return typeof v === "number" ? `${v}` : v;
}

export default function TrendBarChart({
  data = [],
  compareData = null,
  forecast = null,
  yLabel = "valor",
  yFormatter = defaultFormatter,
  height = 180,
}) {
  // Construir un dataset combinado para que recharts comparta el eje X.
  //  - Filas históricas: value + compare_value (si aplica).
  //  - Filas de pronóstico (al final): solo forecast_value.
  // Cada fila lleva una bandera para que tooltip/legend filtren correctamente.
  const baseRows = data.map((d, i) => {
    const row = { ...d };
    if (compareData) row.compare_value = compareData[i]?.value ?? null;
    return row;
  });
  const forecastRows = (forecast ?? []).map((f) => ({
    bucket: f.bucket,
    forecast_value: f.value,
  }));
  const merged = [...baseRows, ...forecastRows];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={merged} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            axisLine={{ stroke: "#e4e4e7" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={yFormatter}
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            cursor={{ fill: "#eff6ff" }}
            contentStyle={{
              border: "1px solid #e4e4e7",
              borderRadius: 6,
              fontSize: 12,
              padding: "6px 10px",
            }}
            formatter={(value, name) => {
              if (name === "compare_value") return [yFormatter(value), "Período anterior"];
              if (name === "forecast_value") return [yFormatter(value), "Pronóstico Cleo"];
              return [yFormatter(value), yLabel];
            }}
            labelFormatter={(label) => `${label}`}
          />
          {compareData && <Bar dataKey="compare_value" fill={COMPARE} radius={[2, 2, 0, 0]} />}
          <Bar dataKey="value" fill={ACCENT} radius={[3, 3, 0, 0]} />
          {forecast && forecast.length > 0 && (
            <Line
              type="monotone"
              dataKey="forecast_value"
              stroke={FORECAST}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: FORECAST, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls
            />
          )}
          {(compareData || (forecast && forecast.length > 0)) && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(value) => {
                if (value === "compare_value") return "Período anterior";
                if (value === "forecast_value") return "Pronóstico Cleo";
                return yLabel;
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/charts/TrendBarChart.jsx
git commit -m "feat(analytics): TrendBarChart + forecast prop (F5)

Migrar BarChart → ComposedChart para mezclar Bar (serie real + compare)
+ Line (forecast Cleo, color violeta #7c3aed, dashed). Optional forecast
prop array de {bucket, value}. Tooltip + Legend etiquetan 'Pronóstico
Cleo'. Back-compat: sin forecast = comportamiento idéntico a F4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire forecast en TrendPanel + TrajectoryPanel + TopicTrendPanel

**Files:**
- Modify: `src/components/analytics/TrendPanel.jsx`
- Modify: `src/components/analytics/TrajectoryPanel.jsx`
- Modify: `src/components/analytics/TopicTrendPanel.jsx`
- Modify: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/pages/analytics/StudentProfile.jsx`
- Modify: `src/pages/analytics/TopicMastery.jsx`

Cada panel obtiene `forecastPoints` de su `data` y lo pasa a TrendBarChart. Horizonte default = 3 puntos (3 días para day-granularity de ClassDetail; 3 semanas para los semanales).

- [ ] **Step 1: Update `src/components/analytics/TrendPanel.jsx`.**

```jsx
// src/components/analytics/TrendPanel.jsx
//
// F1 Analytics Studio: tendencia temporal del Class Detail.
// F4: compare overlay.
// F5: forecast band — proyección Cleo de los próximos 3 buckets.

import { TrendBarChart } from "../charts";
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
} from "../../lib/analytics/formatters";
import { forecastPoints } from "../../lib/analytics/forecast";

const METRICS = [
  { id: "pct_correct", label: "% correcto", formatter: (v) => formatPercent(v), clampMin: 0, clampMax: 100 },
  { id: "avg_time", label: "Tiempo medio", formatter: (v) => formatDurationShort(v), clampMin: 0 },
  { id: "participation", label: "Participación", formatter: (v) => formatNumber(v), clampMin: 0 },
];

export default function TrendPanel({
  metric = "pct_correct",
  onMetricChange,
  data = [],
  compareData = null,
  loading = false,
}) {
  const def = METRICS.find((m) => m.id === metric) || METRICS[0];
  // F5: forecast los próximos 3 días (mismo granularity que el chart).
  // Se omite cuando hay <3 puntos (forecastPoints devuelve []).
  const forecast = forecastPoints(data, 3, {
    clampMin: def.clampMin,
    clampMax: def.clampMax,
  });

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}>
        {METRICS.map((m) => {
          const active = m.id === metric;
          return (
            <button
              key={m.id}
              onClick={() => onMetricChange?.(m.id)}
              style={{
                background: "transparent",
                border: "none",
                padding: "2px 0",
                borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
                fontWeight: active ? 700 : 400,
                opacity: active ? 1 : 0.55,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {loading ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Cargando…
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Sin datos en esta ventana.
        </div>
      ) : (
        <TrendBarChart
          data={data}
          compareData={compareData}
          forecast={forecast}
          yLabel={def.label}
          yFormatter={def.formatter}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/analytics/TrajectoryPanel.jsx`.**

Leer el archivo, identificar la sección donde llama a TrendBarChart. Añadir el cómputo de forecast y pasarlo:

```jsx
// En TrajectoryPanel.jsx, top of file (junto a imports):
import { forecastPoints } from "../../lib/analytics/forecast";

// Dentro del component, antes del return:
const forecast = forecastPoints(data, 3, { clampMin: 0, clampMax: 100 });

// En el TrendBarChart call:
<TrendBarChart
  data={data}
  compareData={compareData}
  forecast={forecast}
  yLabel="% correcto"
  yFormatter={(v) => formatPercent(v)}
/>
```

Eliminar el hint "— pronóstico llega en F5" si existe.

- [ ] **Step 3: Update `src/components/analytics/TopicTrendPanel.jsx`.**

Mismo patrón. Forecast = 2 semanas (las series semanales suelen ser cortas).

```jsx
import { forecastPoints } from "../../lib/analytics/forecast";

const forecast = forecastPoints(data, 2, { clampMin: 0, clampMax: 100 });

<TrendBarChart
  data={data}
  compareData={compareData}
  forecast={forecast}
  yLabel="% correcto"
  yFormatter={(v) => formatPercent(v)}
/>
```

- [ ] **Step 4: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/TrendPanel.jsx \
        src/components/analytics/TrajectoryPanel.jsx \
        src/components/analytics/TopicTrendPanel.jsx
git commit -m "feat(analytics): forecast bands en TrendPanel/TrajectoryPanel/TopicTrendPanel (F5)

Cada panel computa forecastPoints sobre su data (3 días en ClassDetail,
3 semanas en Student trayectoria, 2 semanas en TopicMastery) con
clampMin/Max apropiados por métrica y lo pasa al chart como prop
forecast. Drop del hint legacy 'pronóstico llega en F5'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `RiskBadge` + `StudentRiskCard` components

**Files:**
- Create: `src/components/analytics/RiskBadge.jsx`
- Create: `src/components/analytics/StudentRiskCard.jsx`
- Modify: `src/components/analytics/index.ts` (barrel)

`RiskBadge` = chip "Bajo · Medio · Alto riesgo" con color (`#16a34a` verde / `#eab308` amarillo / `#dc2626` rojo). `StudentRiskCard` = card grande para el top del StudentProfile mostrando score + label + razones (lista).

- [ ] **Step 1: Write `src/components/analytics/RiskBadge.jsx`.**

```jsx
// src/components/analytics/RiskBadge.jsx
//
// F5 Analytics Studio: badge "Riesgo bajo/medio/alto" para roster + cards.
// Color sigue el patrón retention tier de scoring-thresholds.ts pero
// orientado a riesgo (verde = bajo, rojo = alto).

const COLOR_BY_LEVEL = {
  low:  { bg: "#dcfce7", fg: "#15803d", label: "Bajo" },
  med:  { bg: "#fef3c7", fg: "#a16207", label: "Medio" },
  high: { bg: "#fee2e2", fg: "#b91c1c", label: "Alto" },
};

export default function RiskBadge({ level = "low", score = null, compact = false }) {
  const c = COLOR_BY_LEVEL[level] || COLOR_BY_LEVEL.low;
  return (
    <span
      title={score != null ? `Score: ${score}/100` : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: c.bg,
        color: c.fg,
        padding: compact ? "1px 6px" : "2px 8px",
        borderRadius: 999,
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {compact ? c.label : `Riesgo ${c.label.toLowerCase()}`}
      {!compact && score != null && (
        <span style={{ opacity: 0.65, fontWeight: 400 }}>· {score}</span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Write `src/components/analytics/StudentRiskCard.jsx`.**

```jsx
// src/components/analytics/StudentRiskCard.jsx
//
// F5 Analytics Studio: card de riesgo del Student Profile.
// Muestra el score numérico + level badge + lista de razones (en español)
// devueltas por riskScore() en src/lib/analytics/risk.ts.
//
// Props:
//   inputs: lo que riskScore() consume (recentPctCorrect, weeklyPctCorrect,
//           recentParticipation, daysSinceLastActivity)
//   loading: boolean — opcional, mientras student_risk fetcha
//
// El cálculo del score se hace ACÁ (no en el padre) para que el componente
// sea autosuficiente y la heurística viva en un solo lugar (risk.ts).

import { riskScore } from "../../lib/analytics/risk";
import RiskBadge from "./RiskBadge";

const ACCENT = "#7c3aed";

export default function StudentRiskCard({ inputs, loading = false, studentName }) {
  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, opacity: 0.55 }}>Calculando riesgo…</div>
      </div>
    );
  }
  if (!inputs) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, opacity: 0.55 }}>
          Sin datos de riesgo para este alumno.
        </div>
      </div>
    );
  }
  const r = riskScore(inputs);
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Análisis de riesgo {studentName ? `— ${studentName}` : ""}
        </div>
        <RiskBadge level={r.level} score={r.score} />
      </div>
      {r.reasons.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.6 }}>
          Sin señales de riesgo detectadas en la ventana actual.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, lineHeight: 1.55 }}>
          {r.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e4e4e7",
  borderLeft: `3px solid ${ACCENT}`,
  borderRadius: 8,
  padding: "10px 14px",
  margin: "10px 0",
};
```

- [ ] **Step 3: Update barrel `src/components/analytics/index.ts`.**

Agregar:

```ts
export { default as RiskBadge } from "./RiskBadge";
export { default as StudentRiskCard } from "./StudentRiskCard";
```

- [ ] **Step 4: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run build
git add src/components/analytics/RiskBadge.jsx \
        src/components/analytics/StudentRiskCard.jsx \
        src/components/analytics/index.ts
git commit -m "feat(analytics): RiskBadge + StudentRiskCard (F5)

RiskBadge chip 3-color (low verde / med amarillo / high rojo) con score
opcional como tooltip + suffix. StudentRiskCard wraps riskScore() y
renderiza score + level + lista de razones (en español). El cálculo
vive en el componente para que la heurística se invoque desde un solo
lugar (single source of truth en src/lib/analytics/risk.ts).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Wire risk en RosterTable + ClassDetail + StudentProfile

**Files:**
- Modify: `src/components/analytics/RosterTable.jsx`
- Modify: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/pages/analytics/StudentProfile.jsx`

`RosterTable` gana una columna "Riesgo" que renderiza `RiskBadge compact`. `ClassDetail` carga `useStudentRisk(classId)` y arma un mapa `{ student_name → risk inputs }` que pasa al `RosterTable` (que dispatch a `riskScore` por fila). `StudentProfile` también consume `useStudentRisk` para alimentar `StudentRiskCard`.

- [ ] **Step 1: Edit `src/components/analytics/RosterTable.jsx`.**

Agregar 2 imports al top del archivo (después de la línea 15):

```jsx
import RiskBadge from "./RiskBadge";
import { riskScore } from "../../lib/analytics/risk";
```

Cambiar la signatura del default export (línea 71):

```jsx
// FROM:
export default function RosterTable({ students = [], onRowClick }) {
// TO:
export default function RosterTable({ students = [], riskInputsByName = {}, onRowClick }) {
```

En el `<thead>` (líneas 89-95), agregar `<th>Riesgo</th>` antes del `<th>Estado</th>`:

```jsx
<tr>
  <th style={{ padding: "5px 0" }}>Alumno</th>
  <th>Retención</th>
  <th>Disp. por tema</th>
  <th>Última actividad</th>
  <th>Riesgo</th>
  <th>Estado</th>
</tr>
```

En el cuerpo del `map` de alumnos (después del `const lastDate = lastReviewedDate(s);` y `const points = topicRetentionPoints(s);` que están en líneas 100-101), agregar dos líneas para calcular el risk score:

```jsx
const riskInputs = riskInputsByName[s.name];
const risk = riskInputs ? riskScore(riskInputs) : null;
```

En el `<tr>` body, agregar la celda `<td>` con el `RiskBadge` antes del `<td>` con el badge de "Estado" (línea 135-137):

```jsx
<td>
  {risk ? (
    <RiskBadge level={risk.level} score={risk.score} compact />
  ) : (
    <span style={{ opacity: 0.4 }}>—</span>
  )}
</td>
<td>
  <span style={badgeStyle(status.tone)}>{status.label}</span>
</td>
```

- [ ] **Step 2: Update `src/pages/analytics/ClassDetail.jsx`.**

Agregar import + fetch + pass-through al roster:

```jsx
import { useStudentRisk } from "../../hooks/useStudentRisk";

// Inside the component, después de los otros hooks:
const riskQ = useStudentRisk(classId);
// Map student_name → input object para que RosterTable lookup por nombre.
const riskInputsByName = (riskQ.data?.students ?? []).reduce((acc, s) => {
  acc[s.student_name] = {
    recentPctCorrect: s.recent_pct_correct,
    weeklyPctCorrect: Array.isArray(s.weekly_pct_correct) ? s.weekly_pct_correct : [],
    recentParticipation: s.recent_participation,
    daysSinceLastActivity: s.days_since_last_activity,
  };
  return acc;
}, {});

// En el render, pasar al RosterTable:
<RosterTable
  students={students}
  riskInputsByName={riskInputsByName}
  onRowClick={(s) => navigate(buildRoute.analyticsStudent(classId, s.name))}
/>
```

- [ ] **Step 3: Update `src/pages/analytics/StudentProfile.jsx`.**

Agregar imports + fetch + render del `StudentRiskCard` arriba del KpiBand (debajo del header del shell):

```jsx
import StudentRiskCard from "../../components/analytics/StudentRiskCard";
import { useStudentRisk } from "../../hooks/useStudentRisk";

// Inside component:
const riskQ = useStudentRisk(classId);
const myRisk = (riskQ.data?.students ?? []).find((s) => s.student_name === studentRef);
const riskInputs = myRisk
  ? {
      recentPctCorrect: myRisk.recent_pct_correct,
      weeklyPctCorrect: Array.isArray(myRisk.weekly_pct_correct) ? myRisk.weekly_pct_correct : [],
      recentParticipation: myRisk.recent_participation,
      daysSinceLastActivity: myRisk.days_since_last_activity,
    }
  : null;

// En el render, justo después de `<StudentKpiBand …/>`:
<StudentRiskCard inputs={riskInputs} loading={riskQ.isPending && !riskQ.data} studentName={studentRef} />
```

- [ ] **Step 4: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/RosterTable.jsx \
        src/pages/analytics/ClassDetail.jsx \
        src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): risk badges en roster + StudentRiskCard (F5)

ClassDetail carga useStudentRisk y pasa map student_name → inputs al
RosterTable, que renderiza RiskBadge compact por fila (riskScore()
calculado fila por fila). StudentProfile renderiza StudentRiskCard
arriba del KpiBand con score + razones del alumno.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: TDD — `cleo-analytics.ts` payload builder

**Files:**
- Test: `src/lib/analytics/__tests__/cleo-analytics.test.ts`
- Create: `src/lib/analytics/cleo-analytics.ts`

Toma la salida de `class_analytics` y/o `student_detail` y construye un objeto **compacto** que va al endpoint de narrativa (y al chat /school/ask). Resume: KPIs principales + top 3 temas críticos + top 3 temas dominados + top 3 preguntas más falladas + tendencia 4 últimos buckets. Sin React, sin Supabase — la entrada son los objetos plain que la RPC ya devolvió.

- [ ] **Step 1: Write tests.**

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import {
  buildClassNarrativeContext,
  buildStudentNarrativeContext,
} from "../cleo-analytics";

describe("buildClassNarrativeContext", () => {
  it("returns kpis, top critical topics, top dominated topics, most-missed and trend tail", () => {
    const classAnalytics = {
      kpis: {
        pct_correct: 68.5,
        unique_participants: 22,
        responses_total: 412,
        avg_time_ms: 11400,
      },
      topic_mastery: [
        { topic: "Fracciones", retention_score: 25 },
        { topic: "Decimales", retention_score: 35 },
        { topic: "Geometría", retention_score: 38 },
        { topic: "Suma", retention_score: 88 },
        { topic: "Resta", retention_score: 82 },
        { topic: "Multiplicación", retention_score: 80 },
      ],
      most_missed: [
        { question_index: 3, topic: "Fracciones", error_rate: 80 },
        { question_index: 7, topic: "Decimales", error_rate: 65 },
        { question_index: 12, topic: "Fracciones", error_rate: 60 },
      ],
    };
    const trend = [
      { bucket: "Mon", value: 60 },
      { bucket: "Tue", value: 65 },
      { bucket: "Wed", value: 68 },
      { bucket: "Thu", value: 70 },
      { bucket: "Fri", value: 68 },
    ];
    const ctx = buildClassNarrativeContext({
      className: "5to A",
      classAnalytics,
      timeseries: trend,
      lang: "es",
    });
    expect(ctx.scope).toBe("class");
    expect(ctx.className).toBe("5to A");
    expect(ctx.kpis.pct_correct).toBe(68.5);
    expect(ctx.weakTopics).toHaveLength(3);
    expect(ctx.weakTopics[0].topic).toBe("Fracciones");
    expect(ctx.strongTopics).toHaveLength(3);
    expect(ctx.strongTopics[0].topic).toBe("Suma");
    expect(ctx.mostMissed).toHaveLength(3);
    expect(ctx.recentTrend).toHaveLength(4); // tail of 4
  });
  it("tolerates empty inputs (returns valid skeleton)", () => {
    const ctx = buildClassNarrativeContext({
      className: "x",
      classAnalytics: {},
      timeseries: [],
      lang: "es",
    });
    expect(ctx.weakTopics).toEqual([]);
    expect(ctx.strongTopics).toEqual([]);
    expect(ctx.mostMissed).toEqual([]);
    expect(ctx.recentTrend).toEqual([]);
  });
});

describe("buildStudentNarrativeContext", () => {
  it("returns student kpis + weak topics + delta vs class + recent trajectory tail", () => {
    const detail = {
      kpis: { pct_correct: 55, session_count: 8 },
      topic_mastery: [
        { topic: "Fracciones", retention_score: 22 },
        { topic: "Decimales", retention_score: 40 },
      ],
      most_failed: [
        { question_index: 1, topic: "Fracciones", error_rate: 80 },
      ],
      trajectory: [
        { bucket: "wk1", value: 60 },
        { bucket: "wk2", value: 58 },
        { bucket: "wk3", value: 55 },
      ],
      class_avg_retention: 68,
    };
    const ctx = buildStudentNarrativeContext({
      studentName: "Lucía",
      detail,
      lang: "es",
    });
    expect(ctx.scope).toBe("student");
    expect(ctx.studentName).toBe("Lucía");
    expect(ctx.weakTopics[0].topic).toBe("Fracciones");
    expect(ctx.deltaVsClass).toBeLessThan(0);
    expect(ctx.recentTrajectory).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Implement `src/lib/analytics/cleo-analytics.ts`.**

```ts
// ─── src/lib/analytics/cleo-analytics.ts ───────────────────────────────
// Pure-ish payload builder: toma la salida de class_analytics /
// student_detail (objetos JSON que ya vienen del RPC) y arma un objeto
// COMPACTO que el endpoint de narrativa (api/analytics-narrative.js) o
// la vista Analista Cleo (/school/ask) pasan a Gemini como contexto.
//
// Sin React, sin Supabase. Testeable. La regla "compacto": <2 KB de JSON
// para no inflar el system prompt.

export interface ClassNarrativeContext {
  scope: "class";
  lang: string;
  className: string;
  kpis: Record<string, number | null>;
  weakTopics: { topic: string; retention_score: number }[];
  strongTopics: { topic: string; retention_score: number }[];
  mostMissed: { question_index: number; topic: string; error_rate: number }[];
  recentTrend: { bucket: string; value: number }[];
}

export interface StudentNarrativeContext {
  scope: "student";
  lang: string;
  studentName: string;
  kpis: Record<string, number | null>;
  weakTopics: { topic: string; retention_score: number }[];
  mostFailed: { question_index: number; topic: string; error_rate: number }[];
  recentTrajectory: { bucket: string; value: number }[];
  deltaVsClass: number | null;
}

function pickWeakTopics(arr: any[], k = 3) {
  return [...(arr || [])]
    .filter((t) => t.retention_score != null)
    .sort((a, b) => Number(a.retention_score) - Number(b.retention_score))
    .slice(0, k)
    .map((t) => ({ topic: t.topic, retention_score: Number(t.retention_score) }));
}

function pickStrongTopics(arr: any[], k = 3) {
  return [...(arr || [])]
    .filter((t) => t.retention_score != null)
    .sort((a, b) => Number(b.retention_score) - Number(a.retention_score))
    .slice(0, k)
    .map((t) => ({ topic: t.topic, retention_score: Number(t.retention_score) }));
}

function pickMissed(arr: any[], k = 3) {
  return [...(arr || [])]
    .slice(0, k)
    .map((m) => ({
      question_index: Number(m.question_index),
      topic: m.topic || "",
      error_rate: Number(m.error_rate),
    }));
}

function tailTrend(arr: any[], k = 4) {
  return (arr || [])
    .slice(-k)
    .map((d) => ({ bucket: String(d.bucket), value: Number(d.value) }));
}

export function buildClassNarrativeContext(args: {
  className: string;
  classAnalytics: any;
  timeseries: any[];
  lang: string;
}): ClassNarrativeContext {
  const ca = args.classAnalytics || {};
  return {
    scope: "class",
    lang: args.lang || "es",
    className: args.className || "",
    kpis: {
      pct_correct: ca.kpis?.pct_correct ?? null,
      unique_participants: ca.kpis?.unique_participants ?? null,
      responses_total: ca.kpis?.responses_total ?? null,
      avg_time_ms: ca.kpis?.avg_time_ms ?? null,
    },
    weakTopics: pickWeakTopics(ca.topic_mastery, 3),
    strongTopics: pickStrongTopics(ca.topic_mastery, 3),
    mostMissed: pickMissed(ca.most_missed, 3),
    recentTrend: tailTrend(args.timeseries || [], 4),
  };
}

export function buildStudentNarrativeContext(args: {
  studentName: string;
  detail: any;
  lang: string;
}): StudentNarrativeContext {
  const d = args.detail || {};
  const topics = d.topic_mastery || [];
  const studentAvg =
    topics.length > 0
      ? topics.reduce((s: number, t: any) => s + (Number(t.retention_score) || 0), 0) /
        topics.length
      : null;
  const classAvg = d.class_avg_retention != null ? Number(d.class_avg_retention) : null;
  const delta =
    studentAvg != null && classAvg != null ? Math.round(studentAvg - classAvg) : null;

  return {
    scope: "student",
    lang: args.lang || "es",
    studentName: args.studentName || "",
    kpis: {
      pct_correct: d.kpis?.pct_correct ?? null,
      session_count: d.kpis?.session_count ?? null,
      avg_time_ms: d.kpis?.avg_time_ms ?? null,
    },
    weakTopics: pickWeakTopics(topics, 3),
    mostFailed: pickMissed(d.most_failed, 3),
    recentTrajectory: tailTrend(d.trajectory || [], 3),
    deltaVsClass: delta,
  };
}
```

- [ ] **Step 3: Run tests + barrel + commit.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: previos + ~5 cleo-analytics tests = ≥73 passing.

Barrel — agregar a `src/lib/analytics/index.ts`:

```ts
export * from "./cleo-analytics";
```

```bash
git add src/lib/analytics/cleo-analytics.ts \
        src/lib/analytics/__tests__/cleo-analytics.test.ts \
        src/lib/analytics/index.ts
git commit -m "feat(analytics): cleo-analytics.ts — Cleo payload builder (F5)

Pure builders buildClassNarrativeContext y buildStudentNarrativeContext.
Toman salida de class_analytics / student_detail y arman un objeto
compacto (<2KB) con kpis + weakTopics/strongTopics + mostMissed/Failed
+ tail de tendencia + deltaVsClass. Reusable desde el endpoint de
narrativa y desde la vista Analista Cleo. ~5 unit tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `api/analytics-narrative.js` endpoint

**Files:**
- Create: `api/analytics-narrative.js`

POST endpoint que recibe `{ context: ClassNarrativeContext | StudentNarrativeContext }` y devuelve `{ narrative: string }`. Reusa el patrón `requireTeacher` + `callGemini` de `api/cleo-chat.js` con un system prompt corto, dedicado a narrativas pedagógicas.

- [ ] **Step 1: Write `api/analytics-narrative.js`.**

```js
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
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run build
git add api/analytics-narrative.js
git commit -m "feat(analytics): api/analytics-narrative.js endpoint (F5)

POST endpoint que recibe context (class | student narrative) y devuelve
narrativa Cleo via Gemini Flash. Auth requireTeacher; modelo + key
compartidos con cleo-chat. System prompts en es/en/ko, max 3 frases,
< 300 chars, sin emojis, interpreta el JSON sin echo verbatim. Context
ceiling 4KB para mantener latencia baja.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Class-level + student-level review generator (extender `close-unit-ai.js`)

**Files:**
- Modify: `src/lib/close-unit-ai.js`

`close-unit-ai.js` ya tiene `generateSuggestedReviewQuestions({unit, classObj, summary, lang})` y `saveReviewDeck({unit, classObj, questions, lang, authorId})` para flow unit-level. F5 agrega dos wrappers nuevos:

1. `generateClassReviewQuestions({classObj, weakTopics, lang})` — sin unit, prompts class-scoped. Llama a `/api/generate` con un system prompt construido del set de `weakTopics` (string[]).
2. `generateStudentReviewQuestions({classObj, studentName, weakTopics, mostFailed, lang})` — extiende con foco individual.

Ambas devuelven `{ok, questions, inferredLang}` (mismo contrato que el unit-level). El caller (CleoStrip / MostMissedList / CleoStudentStrip / StudentMostFailedList) llama después a una versión adaptada de `saveReviewDeck` que acepta el caso sin `unit`.

- [ ] **Step 1: Read y modify `src/lib/close-unit-ai.js`.**

Identificar el final del archivo (helpers `buildReviewTitle` / `buildReviewDescription`) y agregar antes del final del módulo:

```js
// ─── F5: class-level + student-level review generators ────────────────
//
// El generator unit-level (generateSuggestedReviewQuestions) requiere
// {unit, classObj, summary} — y `summary` es el output del
// getUnitRetentionSummary, que solo existe en el flow de cerrar unidad.
// Las acciones de CleoStrip / MostMissedList son class-scoped (no hay
// unit cerrándose); las de CleoStudentStrip / StudentMostFailedList
// son student-scoped. Estos dos wrappers construyen contexts mínimos
// equivalentes y reusan el mismo /api/generate pipeline.

import { REVIEW_DECK_SYSTEM } from './close-unit-prompt';

function buildClassReviewMessages({ classObj, weakTopics, lang }) {
  const topicsList = (weakTopics || []).map((t) => `- ${t}`).join('\n') || '- (sin temas críticos identificados)';
  const langName = lang === 'es' ? 'Spanish' : lang === 'ko' ? 'Korean' : 'English';
  return [{
    role: 'user',
    content: [{
      type: 'text',
      text: `Build a 7-question review deck (no unit context, class-level only) for class "${classObj?.name || ''}" (subject: ${classObj?.subject || 'general'}, grade: ${classObj?.grade || 'unspecified'}).\n\nWEAK TOPICS (focus the deck here):\n${topicsList}\n\nLanguage: ${langName}.\n\nMix question types (MCQ, true/false, fill-blank). Difficulty: recap-level. Return a valid JSON array of question objects (or {questions: [...]}). Do NOT wrap in markdown.`,
    }],
  }];
}

function buildStudentReviewMessages({ classObj, studentName, weakTopics, mostFailed, lang }) {
  const topicsList = (weakTopics || []).map((t) => `- ${t}`).join('\n') || '- (no critical topics)';
  const missedList = (mostFailed || []).map((m) => `- Q${m.question_index + 1} (${m.topic || 'topic?'}, ${Math.round(m.error_rate)}% error)`).join('\n') || '- (no missed questions data)';
  const langName = lang === 'es' ? 'Spanish' : lang === 'ko' ? 'Korean' : 'English';
  return [{
    role: 'user',
    content: [{
      type: 'text',
      text: `Build a 7-question targeted review deck for STUDENT "${studentName}" in class "${classObj?.name || ''}" (subject: ${classObj?.subject || 'general'}, grade: ${classObj?.grade || 'unspecified'}).\n\nSTUDENT'S WEAK TOPICS:\n${topicsList}\n\nMOST-MISSED QUESTIONS:\n${missedList}\n\nLanguage: ${langName}.\n\nMix question types. Difficulty: recap-level, scaffolded. Return a valid JSON array (or {questions: [...]}). Do NOT wrap in markdown.`,
    }],
  }];
}

async function callGenerateApi({ accessToken, system, messages, classObj, activity }) {
  let resp;
  try {
    resp = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: 'primary',
        system,
        messages,
        max_tokens: 5000,
        validate: true,
        activity_type: activity,
        num_questions: 7,
        input_type: activity,
        grade: classObj?.grade || null,
        subject: classObj?.subject || null,
      }),
    });
  } catch (err) {
    return { ok: false, error: 'network' };
  }
  if (!resp.ok) {
    let errMsg = `http_${resp.status}`;
    try { const body = await resp.json(); errMsg = body.error || body.message || errMsg; } catch {}
    return { ok: false, error: errMsg };
  }
  const data = await resp.json();
  const text = (data?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  let parsed;
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(json)?\s*/i, '').replace(/```\s*$/i, '');
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: 'parse_failed' };
  }
  const questions = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.questions) ? parsed.questions : null);
  if (!questions || questions.length === 0) return { ok: false, error: 'no_questions_returned' };
  return { ok: true, questions };
}

export async function generateClassReviewQuestions({ classObj, weakTopics = [], lang = 'es' }) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { ok: false, error: 'not_authenticated' };
  const messages = buildClassReviewMessages({ classObj, weakTopics, lang });
  const r = await callGenerateApi({ accessToken, system: REVIEW_DECK_SYSTEM, messages, classObj, activity: 'general_review' });
  if (r.ok) r.inferredLang = lang;
  return r;
}

export async function generateStudentReviewQuestions({ classObj, studentName, weakTopics = [], mostFailed = [], lang = 'es' }) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { ok: false, error: 'not_authenticated' };
  const messages = buildStudentReviewMessages({ classObj, studentName, weakTopics, mostFailed, lang });
  const r = await callGenerateApi({ accessToken, system: REVIEW_DECK_SYSTEM, messages, classObj, activity: 'general_review' });
  if (r.ok) r.inferredLang = lang;
  return r;
}

/**
 * F5: save the generated deck as a stand-alone class-scoped review deck.
 * Same as saveReviewDeck but accepts no unit (title comes from a static
 * label + class name). Returns {ok, deckId}.
 */
export async function saveClassReviewDeck({ classObj, questions, lang = 'es', authorId, studentName = null }) {
  const titlePrefix = lang === 'es' ? 'Repaso de clase' : lang === 'ko' ? '학급 복습' : 'Class review';
  const className = classObj?.name || '';
  const studentTag = studentName ? ` — ${studentName}` : '';
  const title = `${titlePrefix}: ${className}${studentTag}`;
  const description = studentName
    ? (lang === 'es' ? `Repaso enfocado en ${studentName}.` : `Targeted review for ${studentName}.`)
    : (lang === 'es' ? `Repaso de los temas más débiles de la clase.` : 'Review of the class's weakest topics.');

  const { data, error } = await supabase
    .from('decks')
    .insert({
      title,
      description,
      class_id: classObj?.id || null,
      unit_id: null,
      section: 'general_review',
      author_id: authorId,
      subject: classObj?.subject || '',
      grade: classObj?.grade || '',
      language: lang,
      questions,
      is_public: false,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, deckId: data.id };
}
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run build
git add src/lib/close-unit-ai.js
git commit -m "feat(analytics): class+student review generators in close-unit-ai (F5)

generateClassReviewQuestions({classObj, weakTopics, lang}) y
generateStudentReviewQuestions({classObj, studentName, weakTopics,
mostFailed, lang}) — wrappers que reusan /api/generate con prompts
class/student-scoped (no unit summary needed). saveClassReviewDeck
guarda el resultado como section='general_review', unit_id=null.
Cablea chips 'Generar repaso' de F1/F2 que estaban stub.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Wire `CleoStrip` con narrativa real + chip "Generar repaso" activo

**Files:**
- Modify: `src/components/analytics/CleoStrip.jsx`

Reemplazar el placeholder narrative + stub chips por: (1) fetch a `/api/analytics-narrative` cuando hay weakTopics; (2) chip "Generar repaso de lo flojo" cableado a `generateClassReviewQuestions` + `saveClassReviewDeck`; (3) chip "Reenseñar ahora" → `scrollIntoView` al `MostMissedList`; (4) chip "Que vuelva mañana" → queda stub (`pronto`) por ahora (sin infra de scheduling).

- [ ] **Step 1: Reemplazar el archivo completo.**

```jsx
// src/components/analytics/CleoStrip.jsx
//
// F5 Analytics Studio: franja Cleo del Class Detail — narrativa real
// (via /api/analytics-narrative) + chips de acción cableados.
//
// Props:
//   classId, weakTopics (top temas críticos)
//   classObj: { id, name, subject, grade } — para el generator
//   profile: para author_id
//   classAnalytics: la respuesta cruda de class_analytics (para construir
//                   el context con cleo-analytics.ts)
//   timeseries: serie temporal de ClassDetail
//   onReviewCreated: (deckId) => void — callback para navegar al deck
//   onReteachNow: () => void  — scroll al MostMissedList
//   lang: 'es' | 'en' | 'ko'

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { generateClassReviewQuestions, saveClassReviewDeck } from "../../lib/close-unit-ai";
import { buildClassNarrativeContext } from "../../lib/analytics/cleo-analytics";

const ACCENT = "#7c3aed";
const ACCENT_BG = "#ede9fe";

function ActionChip({ label, onClick, disabled = false, stub = false, title }) {
  return (
    <button
      onClick={disabled || stub ? undefined : onClick}
      disabled={disabled || stub}
      title={title}
      style={{
        border: `1px solid ${stub ? "#d4d4d8" : "#c4b5fd"}`,
        color: stub ? "#71717a" : "#5b21b6",
        background: stub ? "transparent" : "#f5f3ff",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "wait" : (stub ? "not-allowed" : "pointer"),
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {label}{stub ? " · pronto" : ""}
    </button>
  );
}

export default function CleoStrip({
  classId,
  weakTopics = [],
  classObj = null,
  profile = null,
  classAnalytics = null,
  timeseries = [],
  onReviewCreated,
  onReteachNow,
  lang = "es",
}) {
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch narrative cuando hay weakTopics + classAnalytics
  useEffect(() => {
    if (!classAnalytics || weakTopics.length === 0) {
      setNarrative("");
      return;
    }
    let cancelled = false;
    setNarrativeLoading(true);
    setError(null);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled) setNarrativeLoading(false);
        return;
      }
      const context = buildClassNarrativeContext({
        className: classObj?.name || "",
        classAnalytics,
        timeseries,
        lang,
      });
      try {
        const resp = await fetch("/api/analytics-narrative", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ context }),
        });
        const data = await resp.json();
        if (cancelled) return;
        if (resp.ok && data?.narrative) {
          setNarrative(data.narrative);
        } else {
          setNarrative("");
        }
      } catch {
        if (!cancelled) setNarrative("");
      } finally {
        if (!cancelled) setNarrativeLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [classId, weakTopics.join("|"), classAnalytics, lang]); // eslint-disable-line

  async function handleGenerateReview() {
    if (!classObj || weakTopics.length === 0) return;
    setGenerating(true);
    setError(null);
    const gen = await generateClassReviewQuestions({ classObj, weakTopics, lang });
    if (!gen.ok) {
      setError(gen.error);
      setGenerating(false);
      return;
    }
    const save = await saveClassReviewDeck({
      classObj,
      questions: gen.questions,
      lang: gen.inferredLang || lang,
      authorId: profile?.id || null,
    });
    setGenerating(false);
    if (save.ok && onReviewCreated) onReviewCreated(save.deckId);
    else if (!save.ok) setError(save.error || "save_failed");
  }

  // Placeholder narrative fallback (cuando todavía cargamos o no hay datos)
  const display = narrative ||
    (narrativeLoading ? "Cleo está analizando los datos…" :
      (weakTopics.length > 0
        ? `Los temas con menor retención son: ${weakTopics.slice(0, 3).join(", ")}.`
        : "Sin datos suficientes en esta ventana de fechas."));

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 8,
        padding: "12px 14px",
        margin: "10px 0",
      }}
      data-class-id={classId}
    >
      <div
        style={{
          flex: "0 0 32px",
          height: 32,
          borderRadius: "50%",
          background: ACCENT_BG,
          color: ACCENT,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        C
      </div>
      <div style={{ flex: 1, fontSize: 14 }}>
        <b>Cleo:</b> {display}
        {error && (
          <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
            No pude generar el repaso ({error}). Intentá de nuevo.
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip
            label={generating ? "Generando…" : "Generar repaso de lo flojo"}
            onClick={handleGenerateReview}
            disabled={generating || weakTopics.length === 0}
            title="Crea un deck de repaso de 7 preguntas sobre los temas más débiles"
          />
          <ActionChip
            label="Reenseñar ahora"
            onClick={onReteachNow}
            title="Salta al panel de preguntas más falladas"
          />
          <ActionChip
            label="Que vuelva mañana"
            stub
            title="Llega cuando se sume el scheduler de tareas (F6+)"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/pages/analytics/ClassDetail.jsx`** para pasarle los props nuevos a `<CleoStrip />` y el ref del `MostMissedList`:

```jsx
import { useRef } from "react";
// …
const mostMissedRef = useRef(null);
const navigate = useNavigate();

// En el render, reemplazar el <CleoStrip ... /> existente:
<CleoStrip
  classId={classId}
  weakTopics={(a?.topic_mastery ?? [])
    .filter((t) => (t.retention_score ?? 0) < 40)
    .slice(0, 3)
    .map((t) => t.topic)}
  classObj={(() => {
    const row = overviewRows.find((r) => r.class_id === classId);
    return row ? {
      id: row.class_id,
      name: row.class_name || "",
      subject: row.class_subject || "",
      grade: row.class_grade || "",
    } : { id: classId, name: "", subject: "", grade: "" };
  })()}
  profile={null /* o levantar desde props si está disponible */}
  classAnalytics={a}
  timeseries={ts}
  lang="es"
  onReviewCreated={(deckId) => navigate(buildRoute.deckEdit(deckId))}
  onReteachNow={() => {
    mostMissedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }}
/>

// Wrap el MostMissedList in a div con ref:
<div ref={mostMissedRef}>
  <MostMissedList … />
</div>
```

(Nota: el `profile` se levanta del App.jsx via props ya existentes — los componentes Analytics se inyectan dentro del shell que recibe `profile`. Si no llega, queda `null` y `author_id` queda `null` en el insert — el RLS de la tabla `decks` aceptará si `author_id IS NULL` o el insert fallará y queremos saberlo; verificar en QA.)

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/CleoStrip.jsx src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): CleoStrip narrativa real + chip 'Generar repaso' activo (F5)

CleoStrip ahora fetcha /api/analytics-narrative con el context construido
por cleo-analytics.buildClassNarrativeContext. Chip 'Generar repaso de
lo flojo' cableado a generateClassReviewQuestions + saveClassReviewDeck;
on success navega al deck editor. Chip 'Reenseñar ahora' hace scrollIntoView
al MostMissedList. Chip 'Que vuelva mañana' sigue stub (requiere infra
de scheduling).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Wire `CleoStudentStrip` con narrativa real + chip "Asignarle repaso"

**Files:**
- Modify: `src/components/analytics/CleoStudentStrip.jsx`
- Modify: `src/pages/analytics/StudentProfile.jsx`

Mismo patrón que Task 12 pero student-scoped. Chip "Mensaje a familia" sigue stub.

- [ ] **Step 1: Reemplazar `src/components/analytics/CleoStudentStrip.jsx`.**

```jsx
// src/components/analytics/CleoStudentStrip.jsx
//
// F5 Analytics Studio: franja Cleo del Student Profile — narrativa real
// + chip "Asignarle repaso" cableado a generateStudentReviewQuestions.

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  generateStudentReviewQuestions,
  saveClassReviewDeck,
} from "../../lib/close-unit-ai";
import { buildStudentNarrativeContext } from "../../lib/analytics/cleo-analytics";

const ACCENT = "#7c3aed";
const ACCENT_BG = "#ede9fe";

function ActionChip({ label, onClick, disabled = false, stub = false, title }) {
  return (
    <button
      onClick={disabled || stub ? undefined : onClick}
      disabled={disabled || stub}
      title={title}
      style={{
        border: `1px solid ${stub ? "#d4d4d8" : "#c4b5fd"}`,
        color: stub ? "#71717a" : "#5b21b6",
        background: stub ? "transparent" : "#f5f3ff",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "wait" : (stub ? "not-allowed" : "pointer"),
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {label}{stub ? " · pronto" : ""}
    </button>
  );
}

export default function CleoStudentStrip({
  studentRef,
  weakTopics = [],
  deltaVsClass = null,
  detail = null,           // F5: studentDetail RPC raw
  classObj = null,
  profile = null,
  onReviewCreated,
  lang = "es",
}) {
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!detail) {
      setNarrative("");
      return;
    }
    let cancelled = false;
    setNarrativeLoading(true);
    setError(null);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { if (!cancelled) setNarrativeLoading(false); return; }
      const context = buildStudentNarrativeContext({
        studentName: studentRef,
        detail,
        lang,
      });
      try {
        const resp = await fetch("/api/analytics-narrative", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ context }),
        });
        const data = await resp.json();
        if (cancelled) return;
        if (resp.ok && data?.narrative) setNarrative(data.narrative);
        else setNarrative("");
      } catch {
        if (!cancelled) setNarrative("");
      } finally {
        if (!cancelled) setNarrativeLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [studentRef, detail, lang]);

  async function handleAssignReview() {
    if (!classObj || !studentRef) return;
    setGenerating(true);
    setError(null);
    const gen = await generateStudentReviewQuestions({
      classObj,
      studentName: studentRef,
      weakTopics,
      mostFailed: detail?.most_failed || [],
      lang,
    });
    if (!gen.ok) { setError(gen.error); setGenerating(false); return; }
    const save = await saveClassReviewDeck({
      classObj,
      questions: gen.questions,
      lang: gen.inferredLang || lang,
      authorId: profile?.id || null,
      studentName: studentRef,
    });
    setGenerating(false);
    if (save.ok && onReviewCreated) onReviewCreated(save.deckId);
    else if (!save.ok) setError(save.error || "save_failed");
  }

  // Fallback narrative
  const parts = [];
  if (weakTopics.length > 0) parts.push(`Temas a reforzar: ${weakTopics.slice(0, 3).join(", ")}.`);
  if (deltaVsClass != null) {
    if (deltaVsClass >= 0) parts.push(`Está ${deltaVsClass}% por encima de la media de la clase.`);
    else parts.push(`Está ${Math.abs(deltaVsClass)}% por debajo de la media de la clase.`);
  }
  const display = narrative ||
    (narrativeLoading ? "Cleo está analizando al alumno…" :
      (parts.length > 0 ? parts.join(" ") : "Sin datos suficientes en esta ventana."));

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: 8,
        padding: "12px 14px",
        margin: "10px 0",
      }}
      data-student-ref={studentRef}
    >
      <div
        style={{
          flex: "0 0 32px",
          height: 32,
          borderRadius: "50%",
          background: ACCENT_BG,
          color: ACCENT,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        C
      </div>
      <div style={{ flex: 1, fontSize: 14 }}>
        <b>Cleo:</b> {display}
        {error && (
          <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
            No pude generar el repaso ({error}). Intentá de nuevo.
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip
            label={generating ? "Generando…" : "Asignarle repaso"}
            onClick={handleAssignReview}
            disabled={generating || !classObj}
            title="Crea un deck de repaso enfocado en este alumno"
          />
          <ActionChip
            label="Mensaje a familia"
            stub
            title="Llega cuando se sume mensajería a familias"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/pages/analytics/StudentProfile.jsx`** para pasarle los props nuevos.

```jsx
El `deltaVsClass` ya se computa inline en el F2 wiring actual (StudentProfile.jsx líneas 116-127); F5 reusa ese mismo bloque y lo extrae a una const para legibilidad. También importamos `useAnalyticsOverview` para resolver el `classObj` real con `subject/grade` (no solo `{id, name}` stub):

```jsx
// En StudentProfile.jsx, agregar al top:
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";

// Inside component, después de los hooks existentes:
const overviewQ = useAnalyticsOverview();
const classObj = (overviewQ.data ?? []).find((c) => c.class_id === classId) || null;

const topicMastery = d?.topic_mastery ?? [];
const studentAvg = topicMastery.length > 0
  ? topicMastery.reduce((s, t) => s + (Number(t.retention_score) || 0), 0) / topicMastery.length
  : null;
const classAvg = d?.class_avg_retention != null ? Number(d.class_avg_retention) : null;
const deltaVsClass = (studentAvg != null && classAvg != null)
  ? Math.round(studentAvg - classAvg)
  : null;
const weakTopics = topicMastery
  .filter((t) => (t.retention_score ?? 0) < 40)
  .slice(0, 3)
  .map((t) => t.topic);

// En el render, reemplazar el CleoStudentStrip existente:
<CleoStudentStrip
  studentRef={studentRef}
  weakTopics={weakTopics}
  deltaVsClass={deltaVsClass}
  detail={d}
  classObj={classObj ? {
    id: classObj.class_id,
    name: classObj.class_name || "",
    subject: classObj.class_subject || "",
    grade: classObj.class_grade || "",
  } : { id: classId, name: "", subject: "", grade: "" }}
  profile={null}
  lang="es"
  onReviewCreated={(deckId) => navigate(buildRoute.deckEdit(deckId))}
/>
```

Nota: `analytics_overview` ya expone `class_grade` y `class_subject` (verificado en migration 065 líneas 13-14). El mapeo `row.class_subject → classObj.subject` y `row.class_grade → classObj.grade` deja el shape que esperan `generateClassReviewQuestions` y `generateStudentReviewQuestions`.

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/CleoStudentStrip.jsx src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): CleoStudentStrip narrativa real + chip 'Asignarle repaso' (F5)

Fetch /api/analytics-narrative con buildStudentNarrativeContext. Chip
'Asignarle repaso' invoca generateStudentReviewQuestions con weakTopics
+ mostFailed y guarda con saveClassReviewDeck(studentName=...). Chip
'Mensaje a familia' sigue stub (requiere infra de mensajería).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Wire `MostMissedList` + `StudentMostFailedList` chips de generador

**Files:**
- Modify: `src/components/analytics/MostMissedList.jsx`
- Modify: `src/components/analytics/StudentMostFailedList.jsx`

El stub "Generar repaso · pronto" se activa: click llama al mismo generator que CleoStrip/CleoStudentStrip. Para evitar duplicar lógica, el botón **delega** vía un callback `onGenerateReview` que recibe del padre — el padre (ClassDetail / StudentProfile) ya tiene el wiring del Task 12/13 (el handler reusa el de Cleo strip).

- [ ] **Step 1: Update `src/components/analytics/MostMissedList.jsx`.**

Reemplazar el span stub de "Generar repaso · pronto" por un button cableado a `onGenerateReview` (nuevo prop):

```jsx
// En la prop signature:
export default function MostMissedList({ classId, items = [], onItemClick, onGenerateReview, generating = false }) {
  // …existing code…

  // Reemplazar el span con el stub por:
  <button
    onClick={onGenerateReview}
    disabled={!onGenerateReview || generating}
    title={generating ? "Generando…" : "Crear deck de repaso de lo más fallado"}
    style={{
      display: "inline-block",
      marginTop: 8,
      border: "1px solid #c4b5fd",
      color: "#5b21b6",
      background: "#f5f3ff",
      padding: "3px 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      cursor: onGenerateReview ? (generating ? "wait" : "pointer") : "not-allowed",
      opacity: onGenerateReview ? 1 : 0.55,
    }}
  >
    {generating ? "Generando…" : "Generar repaso"}
  </button>
```

- [ ] **Step 2: Update `src/components/analytics/StudentMostFailedList.jsx`.**

Mismo patrón con `onAssignReview` prop. El label cambia a "Asignar repaso".

- [ ] **Step 3: Update `src/pages/analytics/ClassDetail.jsx`.**

Levantar el handler de "generate review" a nivel ClassDetail (compartido con CleoStrip), y pasarlo a `<MostMissedList>` también:

```jsx
// useState para tracking + handler compartido
const [generatingReview, setGeneratingReview] = useState(false);

async function handleGenerateClassReview() {
  if (generatingReview) return;
  setGeneratingReview(true);
  const weakTopics = (a?.topic_mastery ?? [])
    .filter((t) => (t.retention_score ?? 0) < 40)
    .slice(0, 3)
    .map((t) => t.topic);
  const row = overviewRows.find((r) => r.class_id === classId);
  const cObj = row ? {
    id: row.class_id,
    name: row.class_name || "",
    subject: row.class_subject || "",
    grade: row.class_grade || "",
  } : { id: classId, name: "", subject: "", grade: "" };
  const gen = await generateClassReviewQuestions({ classObj: cObj, weakTopics, lang: "es" });
  if (!gen.ok) { setGeneratingReview(false); return; }
  const save = await saveClassReviewDeck({
    classObj: cObj,
    questions: gen.questions,
    lang: gen.inferredLang || "es",
    authorId: null,
  });
  setGeneratingReview(false);
  if (save.ok) navigate(buildRoute.deckEdit(save.deckId));
}

// Pasar al MostMissedList:
<MostMissedList
  classId={classId}
  items={a?.most_missed ?? []}
  onItemClick={(it) => { if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id)); }}
  onGenerateReview={handleGenerateClassReview}
  generating={generatingReview}
/>

// Y reemplazar el wiring de CleoStrip's onReviewCreated por:
// onReviewCreated={(deckId) => navigate(buildRoute.deckEdit(deckId))}
// — ya está; deja la dual-entry consistente.
```

(Importar `generateClassReviewQuestions` y `saveClassReviewDeck` al top de ClassDetail.jsx.)

- [ ] **Step 4: Update `src/pages/analytics/StudentProfile.jsx`** análogamente para el chip de StudentMostFailedList.

- [ ] **Step 5: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/MostMissedList.jsx \
        src/components/analytics/StudentMostFailedList.jsx \
        src/pages/analytics/ClassDetail.jsx \
        src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): cablear MostMissedList + StudentMostFailedList al generator (F5)

Reemplazar stub 'pronto · F5' por button activo que invoca al class /
student review generator. Padre (ClassDetail/StudentProfile) levanta
el handler compartido para que CleoStrip y la lista usen el mismo
flow (no duplicación). Loading state via prop generating.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Vista Analista Cleo `/school/ask` + extender `api/cleo-chat.js`

**Files:**
- Create: `src/pages/analytics/CleoAnalyst.jsx`
- Modify: `api/cleo-chat.js`
- Modify: `src/routes.ts`
- Modify: `src/App.jsx`

Página chat dedicada que invoca `/api/cleo-chat` con un payload `body.context.analyticsClassId` opcional. El endpoint detecta esto, llama a `class_analytics` server-side, y agrega el resumen al `systemText`. El front-end no necesita reusar `CleoChat.jsx` entero — es una UI más simple porque no incluye file upload ni planes; solo chat tipo "preguntale a tus datos".

- [ ] **Step 1: Update `api/cleo-chat.js`** para reconocer `analyticsClassId` en `body.context` y enriquecer `systemText`:

Buscar en `api/cleo-chat.js` la función `buildContextNote` (líneas ~155-177) y agregar otro bloque:

```js
async function buildContextNote(supabase, teacherId, context) {
  try {
    if (!context || typeof context !== 'object') return '';
    const lines = [];
    if (typeof context.page === 'string' && context.page.trim()) {
      lines.push(`The teacher is currently on the "${context.page.trim()}" page of Clasloop.`);
    }
    if (typeof context.classId === 'string' && context.classId) {
      const { data } = await supabase
        .from('classes')
        .select('name')
        .eq('id', context.classId)
        .eq('teacher_id', teacherId)
        .maybeSingle();
      if (data?.name) {
        lines.push(`They are viewing the class "${data.name}" — if they say "this class", they mean this one.`);
      }
    }

    // F5: Analista Cleo — el front-end pasa analyticsClassId para que Cleo
    // razone sobre los datos en vivo de esa clase. Llamamos class_analytics
    // server-side (RPC tiene ownership guard) y agregamos un resumen al system.
    if (typeof context.analyticsClassId === 'string' && context.analyticsClassId) {
      try {
        const { data: ca } = await supabase.rpc('class_analytics', {
          p_class_id: context.analyticsClassId,
          p_from: null,
          p_to: null,
        });
        if (ca) {
          // Resumen ULTRA compacto (< 1KB) para no inflar el prompt
          const k = ca.kpis || {};
          const top3Weak = (ca.topic_mastery || [])
            .filter((t) => t.retention_score != null)
            .sort((a, b) => a.retention_score - b.retention_score)
            .slice(0, 3)
            .map((t) => `${t.topic} (${t.retention_score}%)`)
            .join(', ');
          const missed = (ca.most_missed || [])
            .slice(0, 3)
            .map((m) => `Q${m.question_index + 1}/${m.topic || '?'} ${Math.round(m.error_rate)}% err`)
            .join('; ');
          lines.push(`ANALYTICS CONTEXT — class "${ca.class_id?.slice(0, 8) || ''}":
- pct_correct ${k.pct_correct ?? '?'}%, participants ${k.unique_participants ?? '?'}, responses ${k.responses_total ?? '?'}.
- Weakest topics: ${top3Weak || '(none)'}.
- Top missed questions: ${missed || '(none)'}.
Use these numbers when the teacher asks about THIS class. Do NOT echo them verbatim — interpret them.`);
        }
      } catch (e) {
        // Soft fail — la conversación sigue sin context
        console.warn('[cleo-chat] analytics context fetch failed:', e?.message);
      }
    }

    return lines.length ? `\n\nCURRENT CONTEXT:\n${lines.join('\n')}` : '';
  } catch {
    return '';
  }
}
```

- [ ] **Step 2: Write `src/pages/analytics/CleoAnalyst.jsx`.**

```jsx
// src/pages/analytics/CleoAnalyst.jsx
//
// F5 Analytics Studio: vista chat "Analista Cleo" en /school/ask.
// El docente le pregunta cosas a Cleo sobre los datos de UNA clase;
// el endpoint /api/cleo-chat recibe context.analyticsClassId y agrega
// los KPIs + temas críticos + más falladas al system prompt server-side.
//
// UI: minimalista (no es CleoChat full). Header con selector de clase,
// hilo de mensajes, input de texto + send. Sin file upload, sin plan
// confirmation cards.

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { supabase } from "../../lib/supabase";

const ACCENT = "#7c3aed";

export default function CleoAnalyst() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClassId = searchParams.get("class") || null;

  const overviewQ = useAnalyticsOverview();
  const classes = overviewQ.data ?? [];
  const [classId, setClassId] = useState(initialClassId);
  const [messages, setMessages] = useState([
    {
      role: "model",
      text:
        "Hola, soy Cleo. Elegí una clase arriba y preguntame lo que quieras de tus datos — quiénes vienen flojos, qué reenseñar, qué deck armar.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    if (initialClassId && !classId) setClassId(initialClassId);
  }, [initialClassId, classId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch("/api/cleo-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role === "model" ? "model" : "user", text: m.text })),
          lang: "es",
          context: { page: "analyticsAsk", analyticsClassId: classId || undefined },
        }),
      });
      const data = await resp.json();
      if (resp.ok && data?.reply) {
        setMessages((m) => [...m, { role: "model", text: data.reply }]);
      } else {
        setMessages((m) => [...m, { role: "model", text: "No pude responder ahora — probá de nuevo." }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "model", text: "Error de red — probá de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleClassChange(e) {
    const next = e.target.value || null;
    setClassId(next);
    if (next) setSearchParams({ class: next }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  return (
    <StudioShell view="ask" title="Analista Cleo">
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "10px 12px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Clase:</span>
          <select
            value={classId || ""}
            onChange={handleClassChange}
            style={{ padding: "4px 8px", fontSize: 13, borderRadius: 6, border: "1px solid #e4e4e7" }}
          >
            <option value="">— Selecciona —</option>
            {classes.map((c) => (
              <option key={c.class_id} value={c.class_id}>{c.class_name || c.class_id}</option>
            ))}
          </select>
          {!classId && (
            <span style={{ fontSize: 12, color: "#a16207" }}>
              Sin clase seleccionada Cleo responde general; con clase puede leer tus números reales.
            </span>
          )}
        </div>
        <div
          ref={threadRef}
          style={{
            flex: 1,
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: 8,
            padding: 12,
            overflowY: "auto",
            maxHeight: "60vh",
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? "#2563eb" : "#f5f3ff",
                color: m.role === "user" ? "#fff" : "#1e1b4b",
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: "78%",
                fontSize: 14,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.role === "model" && <b style={{ color: ACCENT }}>Cleo: </b>}
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", opacity: 0.55, fontSize: 13 }}>
              Cleo está pensando…
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="¿Qué le pregunto a Cleo sobre esta clase?"
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #e4e4e7",
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              borderRadius: 8,
              border: "none",
              background: ACCENT,
              color: "#fff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.6 : 1,
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </StudioShell>
  );
}
```

- [ ] **Step 3: Add route + page wiring.**

`src/routes.ts` — agregar:

```ts
// En ROUTES:
ANALYTICS_ASK: "/school/ask",

// En ROUTE_PATTERNS:
ANALYTICS_ASK: "/school/ask",

// En buildRoute:
analyticsAsk: (classId?: string) =>
  classId ? `/school/ask?class=${encodeURIComponent(classId)}` : `/school/ask`,

// En pathToPage (antes del "if (pathname === '/school')"):
if (pathname === "/school/ask") return "analyticsAsk";

// En TEACHER_ONLY_PAGES:
"analyticsAsk",
```

`src/App.jsx` — agregar lazy import + COMPONENTS entry:

```jsx
const importCleoAnalyst = () => import('./pages/analytics/CleoAnalyst');
const CleoAnalyst = lazy(importCleoAnalyst);

// En COMPONENTS:
analyticsAsk: CleoAnalyst,

// En COMPACT_PAGES set:
// (CleoAnalyst no es info-densa; queda comfortable — NO añadir aquí.)
```

- [ ] **Step 4: Final gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add api/cleo-chat.js \
        src/pages/analytics/CleoAnalyst.jsx \
        src/routes.ts src/App.jsx
git commit -m "feat(analytics): Analista Cleo view /school/ask + analyticsContext in cleo-chat (F5)

api/cleo-chat.js reconoce context.analyticsClassId: llama class_analytics
server-side (ownership guard de la RPC mantiene tenant isolation) y agrega
un resumen ultra-compacto (< 1KB) al systemText con KPIs + top weak topics
+ most-missed. La nueva vista CleoAnalyst en /school/ask es una UI chat
minimalista (sin file upload, sin plan cards) que toma class del query
?class=ID y envía el body.context apropiado.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Final gates + Code Review subagent + PR

- [ ] **Step 1: Final gates.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: 0 lint errors, 0 typecheck errors, ≥73 tests passing (previos + ~9 forecast + ~9 risk + ~5 cleo-analytics), build succeeds.

- [ ] **Step 2: Dispatch final code review subagent.**

```
Diff range: main..HEAD on claude/analytics-studio-f5
Focus areas:
- forecast.ts numerical correctness (slope/intercept) + clamp behavior.
- risk.ts scoring (cap at 100, "low" boundary at 30, reasons in Spanish).
- SQL migration 071 — ownership guard, EXTRACT EPOCH math for days_since,
  weekly_pct_correct array order chronological.
- TrendBarChart ComposedChart back-compat (no forecast → identical to F4).
- RiskBadge tone polarity (verde = bajo riesgo, rojo = alto).
- CleoStrip + CleoStudentStrip: narrative refetch loop bounded by
  [classId, weakTopics joined] / [studentRef, detail] — no infinite refetch.
- generateClassReviewQuestions + generateStudentReviewQuestions: prompts
  in correct lang, saveClassReviewDeck inserts NULL unit_id (no FK error).
- api/cleo-chat.js: analyticsClassId branch fails soft (no 500 if RPC fails),
  ownership via the RPC itself, ULTRA-compact summary < 1KB.
- /school/ask route guard for teachers only.
- All 3 panels' forecast prop pass-through doesn't break F4 compare overlay.
```

- [ ] **Step 3: User aplica SQL 071 en Supabase prod editor.**

Bloqueo manual: el plan no avanza hasta que el usuario confirme que ejecutó el contenido de `supabase/migrations/20240101000071_student_risk_rpc.sql`. Mismo flow que F0-F3.

- [ ] **Step 4: Push + open PR.**

```bash
git push -u origin claude/analytics-studio-f5
gh pr create --base main --head claude/analytics-studio-f5 \
  --title "feat(analytics): Analytics Studio F5 — Predictivo + Cleo" \
  --body "$(cat <<'EOF'
## Summary

Analytics Studio Fase 5 — el pilar IA. Cierra los stubs 'pronto · F5' que F1/F2 dejaron en CleoStrip / CleoStudentStrip / MostMissedList / StudentMostFailedList. Habilita:

- **Forecast band** en TrendPanel / TrajectoryPanel / TopicTrendPanel (regresión lineal en `forecast.ts`, dibujado como línea violeta punteada vía ComposedChart de recharts).
- **At-risk badges** en RosterTable + StudentRiskCard en StudentProfile (RPC `student_risk` devuelve insumos crudos; `risk.ts` calcula score + razones en cliente — single source of truth, testeable).
- **Narrativas Cleo reales** en CleoStrip y CleoStudentStrip (fetch a `api/analytics-narrative` con context compacto vía `cleo-analytics.ts`; Gemini Flash; max 3 frases, sin emojis, interpreta sin echo).
- **Class+student-scoped review generators** (`generateClassReviewQuestions`, `generateStudentReviewQuestions`, `saveClassReviewDeck`) — cablean los chips "Generar repaso" / "Asignar repaso" en CleoStrip, CleoStudentStrip, MostMissedList, StudentMostFailedList.
- **Analista Cleo** en `/school/ask` — chat con datos. `api/cleo-chat.js` reconoce `analyticsClassId` en context, llama `class_analytics` server-side, agrega resumen al systemText.

### Backend (1 SQL nuevo)
- `supabase/migrations/20240101000071_student_risk_rpc.sql` — RPC SECURITY DEFINER, ownership guard, devuelve insumos crudos por alumno.

### Endpoints nuevos
- `api/analytics-narrative.js` — POST narrativa Cleo grounded.
- `api/cleo-chat.js` — extendido para aceptar `analyticsContext`.

### Libs puras nuevas (con tests)
- `src/lib/analytics/forecast.ts` (linearRegression + forecastPoints) — 9 tests.
- `src/lib/analytics/risk.ts` (riskScore + classifyRisk) — 9 tests.
- `src/lib/analytics/cleo-analytics.ts` (build*NarrativeContext) — 5 tests.

### Out of scope
- "Mensaje a familia" + "Que vuelva mañana" chips siguen stub (requieren infra de mensajería / scheduling).
- Realtime risk updates (F6).
- Email digest (F7).

## Test plan

- [ ] User aplica migration 071 en Supabase SQL editor.
- [ ] `npm run test:run` → ≥73 passing.
- [ ] `npm run lint && npm run typecheck && npm run build` clean.
- [ ] /school/class/:id muestra forecast en TrendPanel + RiskBadge en RosterTable + narrativa Cleo real.
- [ ] /school/student/:classId/:studentRef muestra StudentRiskCard + narrativa Cleo real.
- [ ] /school/topics/:classId muestra forecast en TopicTrendPanel.
- [ ] /school/ask muestra chat; con clase seleccionada Cleo interpreta números reales.
- [ ] Chip "Generar repaso" crea deck y navega al editor.
- [ ] Chip "Reenseñar ahora" scrollea al MostMissedList.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec Coverage Self-Review

| Spec §8.1 F5 deliverable | Task |
|--------------------------|------|
| `student_risk` heurística RPC | Task 3 |
| `risk.ts` pura testeable | Task 2 |
| Flags en roster (riesgo) | Tasks 7-8 |
| Bandas de pronóstico | Tasks 1, 5, 6 |
| Conceptos errados ya en metrics.ts (F3) | — (existente) |
| Analista Cleo `/school/ask` | Task 15 |
| `api/cleo-chat.js` extendido con analytics context | Task 15 |
| Franja Cleo con contexto real | Tasks 12, 13 |
| `src/lib/cleo-analytics.ts` payload | Task 9 |

All §8.1 + F5 row mapped.

## Open notes

- **classObj resolution:** los componentes Cleo (Strip/StudentStrip) necesitan `{id, name, subject, grade}` para el generator. F5 levanta esto de `useAnalyticsOverview` (cache de F0). Si overview no incluye `subject/grade`, el generator igual funciona con `null` defaults — los prompts manejan "general / unspecified".
- **profile prop drilling:** F5 no agrega `profile` como prop a las analytics pages; el `author_id` queda `null` en el insert. Si Supabase RLS lo requiere `NOT NULL`, se ajusta levantando `profile` desde App.jsx hasta ClassDetail/StudentProfile en un follow-up.
- **Forecast clamp:** `forecast.ts` clampea al rango razonable (% en [0,100], tiempo en [0,∞]). La línea punteada nunca cruza por debajo de 0 ni arriba de 100.
- **Narrative cache:** F5 no cachea la narrativa (cada vez que cambia weakTopics se refetch). Se puede caché por `(classId, weakTopics)` con React Query en una iteración posterior; F5 keep it simple.
- **Risk heuristic tuning:** los thresholds (low <30, med <60, high ≥60) son razonables iniciales. Se ajustan tras observar la distribución real con tráfico de prod.
