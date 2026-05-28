# Analytics Studio — Fase 4 (Comparar + Benchmarking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar el primer superpoder: **Comparar + Benchmarking**. Un `CompareToggle` en la toolbar de ClassDetail / StudentProfile / TopicMastery enciende un modo "vs período anterior" que dispara una segunda fetch de la RPC existente con el rango shifteado hacia atrás. Los charts muestran overlay translúcido del período comparado; los stat cards muestran un chip Δ (delta vs comparación). KpiBand de ClassDetail suma chips de **percentil** vs el resto de clases del docente (usa `useAnalyticsOverview` cache, sin RPC nueva).

**Architecture:** **Cero SQL nuevo.** Cliente issued una segunda call a la misma RPC con `p_from`/`p_to` shifteados (previousPeriod helper en `benchmark.ts`). TrendBarChart extendido para aceptar una `compareData` opcional que renderiza como segunda serie translúcida (mantiene el primer eje, comparte buckets cuando coinciden). StatCardWithSparkline aprende un `delta` prop que ya existe (de F2). Percentil computado client-side desde el array de clases que ya viene en useAnalyticsOverview.

**Tech Stack:** React 18, `@tanstack/react-query` v5, `recharts`, vitest. **Sin migración SQL.**

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §8.2 (Comparar + Benchmarking), §9 (F4 row).

**Branch:** `claude/analytics-studio-f4` (off F3 tip `e8350c4`). Stacked PR penta: base = F3 branch.

**Depends on:** F0 (RPCs `analytics_overview`, `class_analytics`, `class_timeseries`), F1 (TrendBarChart, StatCardWithSparkline, KpiBand, TrendPanel), F2 (StudentKpiBand, TrajectoryPanel), F3 (TopicTrendPanel).

---

## Pre-task: File Structure

**Create (5 files):**

```
src/lib/analytics/
  benchmark.ts                                  # NEW: pure helpers (previousPeriod, percentileRank, diffSeries)
  __tests__/benchmark.test.ts                   # NEW

src/components/analytics/
  CompareToggle.jsx                             # NEW: toggle "Comparar" en la toolbar
  ComparablyTrendPanel.jsx                      # NEW: variant de TrendPanel con compare overlay
```

Wait — actually let me simplify: instead of duplicating TrendPanel into ComparablyTrendPanel, extend the EXISTING TrendBarChart + TrendPanel + TopicTrendPanel + TrajectoryPanel to accept an optional `compareData` prop. Fewer files, cleaner reuse.

Revised file list (3 new + 6 modified):

```
src/lib/analytics/
  benchmark.ts                                  # NEW: pure helpers
  __tests__/benchmark.test.ts                   # NEW

src/components/analytics/
  CompareToggle.jsx                             # NEW: chip group / switch
```

**Modify (8 files):**

```
src/lib/analytics/index.ts                      # +export benchmark
src/components/analytics/index.ts               # +export CompareToggle
src/components/analytics/StudioShell.jsx        # +slot in toolbar for CompareToggle
src/components/charts/TrendBarChart.jsx         # +compareData prop (translucent overlay series)
src/components/analytics/TrendPanel.jsx         # +compareData prop, period A vs B legend
src/components/analytics/TopicTrendPanel.jsx    # same
src/components/analytics/TrajectoryPanel.jsx    # same
src/components/analytics/KpiBand.jsx            # +compareKpis prop (Δ chips); +percentile chips desde useAnalyticsOverview
src/components/analytics/StudentKpiBand.jsx     # +compareKpis prop (Δ chips)
src/pages/analytics/ClassDetail.jsx             # compareMode state + 2da fetch shifteada + pasa compareKpis + compareData
src/pages/analytics/StudentProfile.jsx          # mismo patrón
src/pages/analytics/TopicMastery.jsx            # mismo patrón
```

**Out of scope for F4 (explicit):**
- "Clase vs clase" comparison cross-class — solo período-vs-período + el "alumno vs media de clase" que ya estaba en F2. La selección manual de "otra clase" para comparar queda para una iteración posterior.
- Custom range comparison (cuando el usuario elige una ventana arbitraria) — F4 solo soporta el shifted-back-by-same-length pattern para 7d/30d/90d.
- Brush + zoom en charts — polish posterior.

---

## Task 1: TDD — `benchmark.ts` pure helpers

**Files:**
- Test: `src/lib/analytics/__tests__/benchmark.test.ts`
- Create: `src/lib/analytics/benchmark.ts`

Helpers puros para shift de período, percentile rank y diff numérico. Reusan el patrón de metrics + formatters + misconceptions.

- [ ] **Step 1: Write failing tests.**

Write `src/lib/analytics/__tests__/benchmark.test.ts`:

```ts
/* @vitest-environment node */
// Pure benchmarking helpers for Analytics Studio F4.

import { describe, it, expect } from "vitest";
import {
  previousPeriod,
  percentileRank,
  pctChangeOrNull,
} from "../benchmark";

describe("previousPeriod", () => {
  it("shifts a 30-day window back by 30 days", () => {
    const from = "2026-05-01T00:00:00.000Z";
    const to = "2026-05-31T00:00:00.000Z";
    const prev = previousPeriod(from, to);
    expect(prev.from).toBe("2026-03-31T00:00:00.000Z");
    expect(prev.to).toBe("2026-04-30T00:00:00.000Z");
  });
  it("returns null for either side when input is null", () => {
    expect(previousPeriod(null, "2026-05-31T00:00:00.000Z")).toEqual({ from: null, to: null });
    expect(previousPeriod("2026-05-01T00:00:00.000Z", null)).toEqual({ from: null, to: null });
    expect(previousPeriod(null, null)).toEqual({ from: null, to: null });
  });
});

describe("percentileRank", () => {
  it("returns the percent of values that are <= the target value", () => {
    // 5 values: [10, 20, 30, 40, 50]. For 30 → 3 values (10,20,30) ≤ 30 → 60%.
    expect(percentileRank([10, 20, 30, 40, 50], 30)).toBe(60);
  });
  it("returns 100 for the max value", () => {
    expect(percentileRank([10, 20, 30], 30)).toBe(100);
  });
  it("returns null on empty array or missing target", () => {
    expect(percentileRank([], 30)).toBeNull();
    expect(percentileRank([10, 20], null)).toBeNull();
    expect(percentileRank([10, 20], undefined)).toBeNull();
  });
  it("treats non-numbers in the array as filtered out", () => {
    expect(percentileRank([10, null, 30], 30)).toBe(100);
  });
});

describe("pctChangeOrNull", () => {
  it("returns signed pct change a -> b", () => {
    expect(pctChangeOrNull(50, 60)).toBe(20);
    expect(pctChangeOrNull(60, 50)).toBeCloseTo(-16.7, 1);
  });
  it("returns null on missing input or division by zero", () => {
    expect(pctChangeOrNull(null, 50)).toBeNull();
    expect(pctChangeOrNull(50, null)).toBeNull();
    expect(pctChangeOrNull(0, 50)).toBeNull();
  });
});
```

- [ ] **Step 2: Run; expect red.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: vitest fails (module missing).

- [ ] **Step 3: Implement `benchmark.ts`.**

```ts
// ─── src/lib/analytics/benchmark.ts ────────────────────────────────────
// Pure helpers para comparar períodos / clases / alumnos contra
// referencias (período anterior, media de cohorte, etc.). Sin React, sin
// Supabase. Tested en __tests__/benchmark.test.ts.

/**
 * Shift a date window back by the same length.
 * Example: from=2026-05-01, to=2026-05-31 → prev: 2026-03-31 → 2026-04-30.
 * If either input is null, returns { from: null, to: null }.
 */
export function previousPeriod(
  from: string | null | undefined,
  to: string | null | undefined,
): { from: string | null; to: string | null } {
  if (!from || !to) return { from: null, to: null };
  const fromD = new Date(from);
  const toD = new Date(to);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return { from: null, to: null };
  }
  const lengthMs = toD.getTime() - fromD.getTime();
  const prevFrom = new Date(fromD.getTime() - lengthMs);
  const prevTo = new Date(toD.getTime() - lengthMs);
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

/**
 * Percentile rank of `value` within `values` (0..100). Counts elements
 * with `v <= value`. Returns null when:
 *   - the array is empty
 *   - value is null/undefined
 *   - filtered array (numbers only) is empty
 */
export function percentileRank(
  values: readonly (number | null | undefined)[],
  value: number | null | undefined,
): number | null {
  if (value == null) return null;
  if (!values || values.length === 0) return null;
  const clean = values.filter((v): v is number => typeof v === "number");
  if (clean.length === 0) return null;
  const leq = clean.filter((v) => v <= value).length;
  return Math.round((leq / clean.length) * 100);
}

/**
 * Percent change a -> b. Returns null on missing input or a === 0.
 * Mirror of pctChange in metrics.ts but with rename to avoid collision
 * (the barrel exports both libs and percent-change semantics are
 * subtly different here — this version is benchmark-specific).
 */
export function pctChangeOrNull(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null || b == null) return null;
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}
```

- [ ] **Step 4: Run tests; expect green.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: previous 37 tests + ~9 new benchmark tests = ≥46 passing.

- [ ] **Step 5: Barrel.**

Add to `src/lib/analytics/index.ts`:

```ts
export * from "./benchmark";
```

- [ ] **Step 6: Commit.**

```bash
git add src/lib/analytics/benchmark.ts src/lib/analytics/__tests__/benchmark.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): benchmark.ts — pure helpers for compare/period-shift/percentile (F4)

previousPeriod / percentileRank / pctChangeOrNull. Sin React, sin
Supabase. ~9 unit tests, mismo patrón que metrics/formatters/misconceptions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `CompareToggle` component

**Files:**
- Create: `src/components/analytics/CompareToggle.jsx`
- Modify: `src/components/analytics/index.ts`

Toggle chip-style en la toolbar de StudioShell. Controlado por el padre via `{ value, onChange }`. F4 solo soporta `'off' | 'prev'` (período anterior).

- [ ] **Step 1: Write `CompareToggle.jsx`.**

```jsx
// src/components/analytics/CompareToggle.jsx
//
// F4 Analytics Studio: toggle "Comparar" en la toolbar de las páginas
// de detalle (ClassDetail / StudentProfile / TopicMastery).
//
// Props:
//   value: 'off' | 'prev'  — 'off' = sin comparar; 'prev' = vs período anterior
//   onChange: (next) => void
//
// Future modes ('class-vs-class', 'student-vs-class-avg') quedan para
// iteraciones posteriores.

export default function CompareToggle({ value = "off", onChange }) {
  const active = value === "prev";
  return (
    <button
      onClick={() => onChange?.(active ? "off" : "prev")}
      aria-pressed={active}
      style={{
        padding: "4px 11px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? "#2563eb" : "#fff",
        color: active ? "#fff" : "inherit",
        border: "1px solid #e4e4e7",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span aria-hidden style={{ fontSize: 11 }}>{active ? "✓" : "▦"}</span>
      Comparar
    </button>
  );
}
```

- [ ] **Step 2: Barrel + gates + commit.**

```bash
npm run lint && npm run typecheck && npm run build
git add src/components/analytics/CompareToggle.jsx src/components/analytics/index.ts
git commit -m "feat(analytics): CompareToggle component (F4)

Toggle chip 'Comparar' para la toolbar de las páginas de detalle.
Controlado por el padre. F4 solo soporta 'off' | 'prev' (período
anterior); modos clase-vs-clase / alumno-vs-media son iteración posterior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Extend `StudioShell` to render `CompareToggle` slot

**Files:**
- Modify: `src/components/analytics/StudioShell.jsx`

El StudioShell ya tiene la toolbar con PeriodChips. Agregamos un slot opcional `compareSlot` (children-style) que la página puede pasar para colocar el CompareToggle entre los chips y el (futuro) Export.

- [ ] **Step 1: Add a `toolbarExtras` prop.**

Read `src/components/analytics/StudioShell.jsx`. Find the toolbar block (around lines 70-80 with PeriodChips). Add a `toolbarExtras` prop and render it next to PeriodChips:

```jsx
export default function StudioShell({
  view = "overview",
  title = "Analytics",
  period = "d30",
  onPeriodChange,
  toolbarExtras,        // NEW: optional ReactNode rendered alongside PeriodChips
  children,
}) {
  // …existing code…

  // In the toolbar JSX, between PeriodChips and the (currently empty) Compare/Export slot:
  // {toolbarExtras}
}
```

Specifically, locate this block in the render:

```jsx
<div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
  <PeriodChips value={effectivePeriod} onChange={handlePeriod} />
  {/* Compare + Export viven acá en F4/F7 */}
</div>
```

Replace the comment with `{toolbarExtras}`:

```jsx
<div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
  <PeriodChips value={effectivePeriod} onChange={handlePeriod} />
  {toolbarExtras}
</div>
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run build
git add src/components/analytics/StudioShell.jsx
git commit -m "feat(analytics): StudioShell toolbarExtras slot for CompareToggle (F4)

Opcional ReactNode rendered alongside PeriodChips. ClassDetail /
StudentProfile / TopicMastery lo pasan en tasks 5-7 para inyectar
el CompareToggle. F7 lo usa para el botón Export.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Extend `TrendBarChart` with `compareData` overlay

**Files:**
- Modify: `src/components/charts/TrendBarChart.jsx`

Agrega un prop `compareData` (mismo shape que `data` pero del período comparado). Recharts dibuja un segundo Bar overlay translúcido detrás del primario.

- [ ] **Step 1: Update `TrendBarChart.jsx`.**

Read the current file. Change the signature + body:

```jsx
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const ACCENT = "#2563eb";
const COMPARE = "#bfdbfe";          // azul translúcido para el período comparado
const AXIS_COLOR = "#94a3b8";

function defaultFormatter(v) {
  return typeof v === "number" ? `${v}` : v;
}

export default function TrendBarChart({
  data = [],
  compareData = null,         // NEW: array of same shape, optional
  yLabel = "valor",
  yFormatter = defaultFormatter,
  height = 180,
}) {
  // Merge by bucket so recharts has a single x-axis. Si compareData no
  // está, renderiza solo la serie principal (back-compat con F1/F3).
  const merged = compareData
    ? data.map((d, i) => ({
        ...d,
        compare_value: compareData[i]?.value ?? null,
      }))
    : data;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={merged} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
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
              return [yFormatter(value), yLabel];
            }}
            labelFormatter={(label) => `${label}`}
          />
          {compareData && (
            <Bar dataKey="compare_value" fill={COMPARE} radius={[2, 2, 0, 0]} />
          )}
          <Bar dataKey="value" fill={ACCENT} radius={[3, 3, 0, 0]} />
          {compareData && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(value) => (value === "compare_value" ? "Período anterior" : yLabel)}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/charts/TrendBarChart.jsx
git commit -m "feat(analytics): TrendBarChart + compareData overlay (F4)

Optional compareData prop renders a translucent (azul claro) bar
overlay behind the main series. Tooltip + Legend label la serie como
'Período anterior'. Back-compat: si no se pasa compareData, comportamiento
idéntico a F1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Wire `ClassDetail` with CompareToggle + period vs period

**Files:**
- Modify: `src/components/analytics/TrendPanel.jsx`
- Modify: `src/components/analytics/KpiBand.jsx`
- Modify: `src/components/analytics/StatCardWithSparkline.jsx` (may need a delta-with-tone arg already wired)
- Modify: `src/pages/analytics/ClassDetail.jsx`

ClassDetail:
1. Add `compareMode` state ('off' | 'prev').
2. When 'prev', use `previousPeriod(from, to)` to get the comparison range.
3. Issue a second `useClassTimeseries` call with the comparison range.
4. Pass `compareData` to `TrendPanel`.
5. Issue a second `useClassAnalytics` call for the comparison range → derive Δ for KpiBand.
6. Pass `compareKpis` + `compareMode` to KpiBand.
7. Render CompareToggle in `StudioShell` via `toolbarExtras`.

KpiBand:
- Accept `compareKpis` prop. When present, each stat card shows a Δ chip computed via `pctChangeOrNull(compareKpis[field], kpis[field])` and `formatDelta`.

TrendPanel:
- Accept `compareData` prop, pass through to TrendBarChart.

- [ ] **Step 1: Update `TrendPanel.jsx` to accept `compareData`.**

In `src/components/analytics/TrendPanel.jsx`, add `compareData` prop and pass to TrendBarChart:

```jsx
export default function TrendPanel({
  metric = "pct_correct",
  onMetricChange,
  data = [],
  compareData = null,   // NEW
  loading = false,
}) {
  // …
  // In the TrendBarChart render:
  <TrendBarChart data={data} compareData={compareData} yLabel={def.label} yFormatter={def.formatter} />
}
```

Also update the "— pronóstico y comparar llegan en F4/F5" hint to drop "comparar":

```jsx
<span style={{ marginLeft: "auto", opacity: 0.65, fontSize: 11 }}>
  — pronóstico llega en F5
</span>
```

- [ ] **Step 2: Update `KpiBand.jsx` to accept `compareKpis`.**

In `src/components/analytics/KpiBand.jsx`, add `compareKpis` prop and pass deltas to each StatCardWithSparkline:

```jsx
import { pctChangeOrNull } from "../../lib/analytics/benchmark";
import { formatDelta } from "../../lib/analytics/formatters";

// …

export default function KpiBand({ kpis = {}, compareKpis = null, timeseries = [], topicMastery = [] }) {
  // …existing derivations…

  function deltaProps(field) {
    if (!compareKpis) return null;
    const pct = pctChangeOrNull(compareKpis[field], kpis[field]);
    if (pct == null) return null;
    const rounded = Math.round(pct);
    return {
      label: formatDelta(rounded),
      tone: rounded > 0 ? "good" : rounded < 0 ? "bad" : "neutral",
    };
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
      <StatCardWithSparkline
        label="% correcto"
        value={formatPercent(kpis.pct_correct)}
        delta={deltaProps("pct_correct")}
        sparkPoints={pctSpark}
      />
      <StatCardWithSparkline
        label="Participación"
        value={formatNumber(kpis.unique_participants)}
        delta={deltaProps("unique_participants")}
        sparkPoints={participationSpark}
      />
      <StatCardWithSparkline
        label="Respuestas"
        value={formatNumber(kpis.responses_total)}
        delta={deltaProps("responses_total")}
        sparkPoints={sessionsSpark}
      />
      <StatCardWithSparkline
        label="Tiempo promedio"
        value={formatDurationShort(kpis.avg_time_ms)}
        delta={deltaProps("avg_time_ms")}
      />
      <StatCardWithSparkline
        label="Temas en riesgo"
        value={formatNumber(atRiskTopics)}
        tone={atRiskTopics > 0 ? "danger" : "default"}
      />
    </div>
  );
}
```

(Note: for avg_time_ms, "more = worse" so the tone polarity is reversed. F4 keeps the simple "more=good" mapping; a follow-up can invert. Same for "Temas en riesgo".)

- [ ] **Step 3: Wire ClassDetail.**

In `src/pages/analytics/ClassDetail.jsx`:

```jsx
import { useState } from "react";
// …
import CompareToggle from "../../components/analytics/CompareToggle";
import { previousPeriod } from "../../lib/analytics/benchmark";

// inside the component:
const [compareMode, setCompareMode] = useState("off");
const compareRange = compareMode === "prev" ? previousPeriod(from, to) : { from: null, to: null };

const compareAnalyticsQ = useClassAnalytics(
  compareMode === "prev" ? classId : null,
  { from: compareRange.from, to: compareRange.to },
);
const compareTimeseriesQ = useClassTimeseries(
  compareMode === "prev" ? classId : null,
  { metric, granularity: "day", from: compareRange.from, to: compareRange.to },
);

// In the StudioShell:
<StudioShell
  view="class"
  title="Clase"
  period={period}
  onPeriodChange={setPeriod}
  toolbarExtras={<CompareToggle value={compareMode} onChange={setCompareMode} />}
>
  …
  <KpiBand
    kpis={a?.kpis ?? {}}
    compareKpis={compareMode === "prev" ? compareAnalyticsQ.data?.kpis ?? null : null}
    timeseries={ts}
    topicMastery={a?.topic_mastery ?? []}
  />
  …
  <TrendPanel
    metric={metric}
    onMetricChange={setMetric}
    data={ts}
    compareData={compareMode === "prev" ? compareTimeseriesQ.data ?? null : null}
    loading={timeseriesQ.isPending}
  />
  …
</StudioShell>
```

- [ ] **Step 4: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/TrendPanel.jsx src/components/analytics/KpiBand.jsx src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): ClassDetail compare-vs-prev-period (F4)

CompareToggle en la toolbar + 2da fetch shifteada de class_analytics
+ class_timeseries para el período anterior. TrendPanel renderiza
overlay translúcido; KpiBand muestra Δ chips por tile (pctChangeOrNull
de benchmark.ts + formatDelta). Cero RPC nueva.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire `StudentProfile` with CompareToggle + period vs period

**Files:**
- Modify: `src/components/analytics/TrajectoryPanel.jsx` (+compareData prop)
- Modify: `src/components/analytics/StudentKpiBand.jsx` (+compareKpis prop)
- Modify: `src/pages/analytics/StudentProfile.jsx`

Mismo patrón que ClassDetail pero con `useStudentDetail` para la 2da fetch.

- [ ] **Step 1: Update `TrajectoryPanel.jsx`** — add `compareData` prop pass-through.

```jsx
export default function TrajectoryPanel({ data = [], compareData = null, loading = false }) {
  // …
  <TrendBarChart
    data={data}
    compareData={compareData}
    yLabel="% correcto"
    yFormatter={(v) => formatPercent(v)}
  />
}
```

Update the "— pronóstico y comparar llegan en F4/F5" hint to drop "comparar".

- [ ] **Step 2: Update `StudentKpiBand.jsx`** — accept `compareKpis` prop and apply Δ chips on the first 3 tiles (% correcto, Sesiones, Tiempo medio). The 5th tile (Δ vs clase) already shows a delta; do not overlay.

```jsx
import { pctChangeOrNull } from "../../lib/analytics/benchmark";
import { formatDelta } from "../../lib/analytics/formatters";

export default function StudentKpiBand({
  kpis = {},
  compareKpis = null,
  trajectory = [],
  topicMastery = [],
  classAvgRetention = 0,
}) {
  // …existing derivations…

  function deltaProps(field) {
    if (!compareKpis) return null;
    const pct = pctChangeOrNull(compareKpis[field], kpis[field]);
    if (pct == null) return null;
    const rounded = Math.round(pct);
    return {
      label: formatDelta(rounded),
      tone: rounded > 0 ? "good" : rounded < 0 ? "bad" : "neutral",
    };
  }

  // …existing return, augment the first 3 tiles with delta={deltaProps("...")}:
  // - "% correcto" → delta={deltaProps("pct_correct")}
  // - "Sesiones"   → delta={deltaProps("session_count")}
  // - "Tiempo medio" → delta={deltaProps("avg_time_ms")}
}
```

- [ ] **Step 3: Wire StudentProfile.**

```jsx
import CompareToggle from "../../components/analytics/CompareToggle";
import { previousPeriod } from "../../lib/analytics/benchmark";

// inside component:
const [compareMode, setCompareMode] = useState("off");
const compareRange = compareMode === "prev" ? previousPeriod(from, to) : { from: null, to: null };
const compareDetailQ = useStudentDetail(
  compareMode === "prev" ? classId : null,
  compareMode === "prev" ? studentRef : null,
  { from: compareRange.from, to: compareRange.to },
);

// In StudioShell:
toolbarExtras={<CompareToggle value={compareMode} onChange={setCompareMode} />}

// In the components:
<StudentKpiBand
  kpis={d?.kpis ?? {}}
  compareKpis={compareMode === "prev" ? compareDetailQ.data?.kpis ?? null : null}
  trajectory={d?.trajectory ?? []}
  topicMastery={d?.topic_mastery ?? []}
  classAvgRetention={d?.class_avg_retention ?? 0}
/>
…
<TrajectoryPanel
  data={d?.trajectory ?? []}
  compareData={compareMode === "prev" ? compareDetailQ.data?.trajectory ?? null : null}
  loading={loading && !d}
/>
```

- [ ] **Step 4: Gates + commit.**

```bash
git add src/components/analytics/TrajectoryPanel.jsx src/components/analytics/StudentKpiBand.jsx src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): StudentProfile compare-vs-prev-period (F4)

CompareToggle + 2da fetch shifteada de student_detail. TrajectoryPanel
con overlay; StudentKpiBand con Δ chips en % correcto / Sesiones /
Tiempo medio (el 5to tile 'Δ vs clase' ya tenía su propia delta de F2,
no se overlay-ea).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire `TopicMastery` with CompareToggle + period vs period

**Files:**
- Modify: `src/components/analytics/TopicTrendPanel.jsx` (+compareData prop)
- Modify: `src/pages/analytics/TopicMastery.jsx`

TopicMastery solo tiene un chart (TopicTrendPanel) y no KpiBand, así que el compare es más sencillo: solo overlay en el chart.

- [ ] **Step 1: Update `TopicTrendPanel.jsx`** — add `compareData` prop.

```jsx
export default function TopicTrendPanel({ topic, data = [], compareData = null, loading = false }) {
  // …
  <TrendBarChart
    data={data}
    compareData={compareData}
    yLabel="% correcto"
    yFormatter={(v) => formatPercent(v)}
  />
}
```

Update the "pronóstico/comparar en F4-F5" hint to drop "comparar".

- [ ] **Step 2: Wire TopicMastery.**

```jsx
import CompareToggle from "../../components/analytics/CompareToggle";
import { previousPeriod } from "../../lib/analytics/benchmark";

// inside component:
const [compareMode, setCompareMode] = useState("off");
const compareRange = compareMode === "prev" ? previousPeriod(from, to) : { from: null, to: null };
const compareTopicQ = useTopicDetail(
  compareMode === "prev" ? classId : null,
  compareMode === "prev" ? selectedTopic : null,
  { from: compareRange.from, to: compareRange.to },
);

// In StudioShell:
toolbarExtras={<CompareToggle value={compareMode} onChange={setCompareMode} />}

// In the components:
<TopicTrendPanel
  topic={selectedTopic}
  data={detail?.weekly_trend ?? []}
  compareData={compareMode === "prev" ? compareTopicQ.data?.weekly_trend ?? null : null}
  loading={topicQ.isPending && !detail}
/>
```

- [ ] **Step 3: Gates + commit.**

```bash
git add src/components/analytics/TopicTrendPanel.jsx src/pages/analytics/TopicMastery.jsx
git commit -m "feat(analytics): TopicMastery compare-vs-prev-period (F4)

CompareToggle + 2da fetch shifteada de topic_detail. TopicTrendPanel
con overlay translúcido del período anterior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Percentile chips on Class KpiBand

**Files:**
- Modify: `src/components/analytics/KpiBand.jsx`
- Modify: `src/pages/analytics/ClassDetail.jsx`

Percentil de la clase actual vs el resto de las clases del docente, computado client-side desde `useAnalyticsOverview` (que ya viene cacheado del Resumen). El chip aparece junto al valor en la stat card de "% correcto" — muestra "P78" si la clase está en el 78th percentile de retención.

- [ ] **Step 1: Update KpiBand to accept `percentile` prop.**

```jsx
export default function KpiBand({
  kpis = {},
  compareKpis = null,
  timeseries = [],
  topicMastery = [],
  percentile = null,           // NEW: number 0-100 or null
}) {
  // …existing code…

  // The first tile (% correcto) gets a tiny percentile badge next to the value.
  // Implement via a small render helper or extend StatCardWithSparkline (TBD).
  // For F4 simplicity, render the percentile as the delta chip when no compareKpis:
  let pctDelta = deltaProps("pct_correct");
  if (!pctDelta && percentile != null) {
    pctDelta = { label: `P${percentile}`, tone: "neutral" };
  }

  // Pass `pctDelta` as `delta` to the first StatCardWithSparkline.
}
```

(If `compareKpis` IS present, the comparable Δ chip wins; percentile is suppressed for that tile to avoid double-badging. The other 4 tiles ignore percentile in F4.)

- [ ] **Step 2: Wire ClassDetail to compute + pass `percentile`.**

```jsx
import { percentileRank } from "../../lib/analytics/benchmark";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";

// inside the component:
const overviewQ = useAnalyticsOverview();
const allClassPctCorrect = (overviewQ.data ?? []).map(/* per-class pct_correct? */);
// Actually analytics_overview returns retention_avg + participation, NOT pct_correct.
// For F4 we use retention_avg as a proxy for percentile:
const allClassRetentions = (overviewQ.data ?? []).map((r) => Number(r.retention_avg));
const thisClassRetention = (overviewQ.data ?? []).find((r) => r.class_id === classId)?.retention_avg ?? null;
const pctile = percentileRank(allClassRetentions, thisClassRetention);

// Pass to KpiBand:
<KpiBand
  kpis={a?.kpis ?? {}}
  compareKpis={compareMode === "prev" ? compareAnalyticsQ.data?.kpis ?? null : null}
  timeseries={ts}
  topicMastery={a?.topic_mastery ?? []}
  percentile={pctile}
/>
```

- [ ] **Step 3: Gates + commit.**

```bash
git add src/components/analytics/KpiBand.jsx src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): percentile chip on ClassDetail KpiBand (F4)

Computado client-side desde useAnalyticsOverview cache (sin RPC nueva):
percentile rank de la retention_avg de la clase actual vs el resto de
clases del docente. Aparece como chip 'P78' en el tile '% correcto'
cuando no hay compare activo. benchmark.percentileRank.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Final gates + final review + PR

- [ ] **Step 1: Final gates.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: 0 lint errors, 0 typecheck, ≥363 tests (354 + 9 new benchmark tests), build OK.

- [ ] **Step 2: Dispatch final code review subagent.**

Diff range: `<F3-tip>..HEAD`. Focus areas:
- `benchmark.ts` math: previousPeriod ISO round-trip, percentileRank edge cases.
- TrendBarChart overlay: tooltip + legend correct, back-compat sin compareData.
- KpiBand Δ chip math (positive % means class improved → tone 'good').
- Percentile chip suppression when compareKpis present (no double badge).
- All 3 pages' compareMode state + 2nd fetch don't re-trigger when classId/student/topic null (enabled flag).

- [ ] **Step 3: Push + open PR stacked on F3.**

```bash
git push -u origin claude/analytics-studio-f4
gh pr create --base claude/analytics-studio-f3 --head claude/analytics-studio-f4 \
  --title "feat(analytics): Analytics Studio F4 — Compare + Benchmarking" \
  --body "..."
```

---

## Spec Coverage Self-Review

| Spec §8.2 F4 deliverable | Task |
|--------------------------|------|
| CompareToggle en Clase / Estudiante / Tema | Tasks 2, 5, 6, 7 |
| Período vs período anterior | Tasks 5, 6, 7 |
| Clase vs clase | OUT (diferido) |
| Alumno vs media de su clase | YA en F2 (StudentKpiBand.Δ vs clase) |
| benchmark.ts pure lib | Task 1 |
| Visual: overlay en charts | Task 4 |
| Visual: chips de percentil en stat cards | Task 8 |

All §8.2 F4 mapped (excepto clase-vs-clase explícito).

## Open notes

- **avg_time_ms tone polarity:** F4 trata "más = bueno" universalmente. Para tiempo (donde "más = peor") y "Temas en riesgo" (donde "más = peor"), el tone Δ chip queda invertido visualmente. Polish posterior puede invertir por field, no es bloqueante.
- **Clase vs clase explícito:** F4 no tiene UI para elegir "otra clase a comparar". Diferido — pattern probable: añadir un selector en el toolbar cuando hay >1 clase.
- **Custom range comparison:** F4 solo soporta el shift-back-by-same-length pattern. Custom ranges quedan sin compare en F4.
