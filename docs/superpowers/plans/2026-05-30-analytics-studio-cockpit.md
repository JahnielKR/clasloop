# /school Cockpit Implementation Plan (Analytics Studio — Área 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy tabbed `Director.jsx` (`/school`) with a Semrush-rhythm cross-class **cockpit**: global KPI band + action center (today pulse + cross-class at-risk students + critical topics) + a sortable class table with per-class % correct sparklines.

**Architecture:** One thin orchestrator (`Director.jsx`) that fetches and composes presentational blocks. All cross-class math lives in a pure, unit-tested lib (`overview-aggregate.ts`). One new RPC (`overview_timeseries`) over the existing `mv_class_daily` feeds the sparklines. Risk is aggregated client-side with `useQueries` (N× `student_risk`, no new RPC). Primary metric = **% correct**; retention is reserved for critical topics, so no block mixes scales.

**Tech stack:** React + Vite, @tanstack/react-query v5 (`useQuery`/`useQueries`), Supabase RPC (Postgres `SECURITY DEFINER`), vitest. Spec: `docs/superpowers/specs/2026-05-30-analytics-studio-cockpit-design.md`.

**Branch:** `claude/analytics-studio-cockpit` (already created off `main` `b5503ab`). Test data already seeded in class `0b7d3ec3-994a-41c1-a0af-a1427e8d3801` (8 students, 6 sessions). Dev server: `localhost:3001`. Login: `pedro@hola.com`.

**Reused interfaces (verified — do not re-derive):**
- `StudioShell({ view, title, period, onPeriodChange, toolbarExtras, children })` — `period` is one of `"d7"|"d30"|"d90"|"custom"`.
- `StatCardWithSparkline({ label, value, delta:{tone:"good"|"bad"|"neutral", label}|null, sparkPoints:number[], sparkTrend:"up"|"down"|"flat"|"new", tone:"default"|"danger", hint })` — `value` is a ReactNode; pass `<AnimatedNumber value={n} format={fn} />`.
- `AnimatedNumber({ value:number, format:(n)=>string, duration })`.
- `SparklineCell({ points:number[], color, trend:"up"|"down"|"flat"|"new", width=80, height=18 })` — renders `—` when `points.length < 2`.
- `RiskBadge({ level:"low"|"med"|"high", score, compact })`.
- `PulseStrip` — no props; self-fetches via `useTodayPulse`.
- `ExportMenu({ baseName, disabled, buildModel })`.
- `StudioSkeleton({ variant:"class"|"student"|"topic"|"reports" })` — reuse `"class"`.
- `sortRows(rows, accessor, dir)` + `nextSortDir(_prev, currentDirForKey)` from `lib/analytics/table-sort` (`SortDir = "asc"|"desc"|null`).
- `riskScore({recentPctCorrect, weeklyPctCorrect:number[], recentParticipation, daysSinceLastActivity}) → { score, level:"low"|"med"|"high", reasons:string[] }` from `lib/analytics/risk`.
- `useAnalyticsOverview()` → array of rows `{ class_id, class_name, class_grade, class_subject, class_code, retention_avg, participation_pct, session_count, member_count, unique_students, last_activity_at, topics_snapshot:[{topic, retention_score, ...}], students_snapshot }`.
- `useStudentRisk(classId,{windowDays})` → `data.students:[{ student_name, recent_pct_correct, weekly_pct_correct:number[], recent_participation, days_since_last_activity }]`. (`fetchStudentRisk`/`studentRiskKey` are in the same file — Task 4 exports `fetchStudentRisk`.)
- `generateClassReviewQuestions({classObj, weakTopics, lang}) → { ok, questions, inferredLang }`; `saveClassReviewDeck({classObj, questions, lang, authorId}) → { ok, deckId }` from `lib/close-unit-ai`.
- `buildRoute.analyticsClass(id)`, `.analyticsStudent(classId, studentRef)`, `.analyticsTopics(classId)`, `.deckEdit(deckId)`.
- Formatters from `lib/analytics/formatters`: `formatPercent`, `formatNumber`, `formatRelativeDay`.
- Tokens from `components/tokens`: `C.{bg,bgSoft,border,text,textSecondary,textMuted,accent,accentSoft,green,greenSoft,orange,orangeSoft,red,redSoft,purple}`, `MONO`, `withAlpha`.
- `mv_class_daily` columns: `day date, class_id uuid, responses_total int, responses_correct int, points_sum int, max_points_sum int, avg_time_ms int, unique_participants int`.

---

## Task 1: New RPC `overview_timeseries` (per-class % correct series)

**Files:**
- Create: `supabase/migrations/20240101000075_overview_timeseries_rpc.sql`
- Apply to prod via MCP `apply_migration` (project `mhfwyeczzilcizawixqw`).

- [ ] **Step 1: Write the migration**

```sql
-- ─── Analytics Studio Área 3 · overview_timeseries RPC ─────────────────
-- Serie de % correcto por clase para los sparklines del cockpit /school.
-- Lee mv_class_daily (NO crea MV nueva). Una llamada → todas las clases.
-- Columnas de la MV CUALIFICADAS con alias `d` (lección del 42702 de
-- class_timeseries). SECURITY DEFINER + filtro por teacher_id = auth.uid().

CREATE OR REPLACE FUNCTION "public"."overview_timeseries"(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL,
  p_granularity text DEFAULT 'day'
)
RETURNS TABLE(
  class_id uuid,
  bucket date,
  value numeric,
  responses_total integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz := COALESCE(p_from, now() - interval '30 days');
  v_to   timestamptz := COALESCE(p_to, now());
BEGIN
  IF p_granularity NOT IN ('day','week') THEN
    RAISE EXCEPTION 'invalid granularity (allowed: day, week)' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH src AS (
    SELECT
      d.class_id AS class_id,
      CASE WHEN p_granularity = 'week'
        THEN (date_trunc('week', d.day))::date
        ELSE d.day END AS bucket,
      SUM(d.points_sum)::int     AS points_sum,
      SUM(d.max_points_sum)::int AS max_points_sum,
      SUM(d.responses_total)::int AS responses_total
    FROM public.mv_class_daily d
    WHERE d.class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
      AND d.day >= v_from::date AND d.day <= v_to::date
    GROUP BY d.class_id, 2
  )
  SELECT
    src.class_id,
    src.bucket,
    CASE WHEN src.max_points_sum > 0
      THEN ROUND((src.points_sum::numeric / src.max_points_sum::numeric) * 100, 1)
      ELSE NULL END AS value,
    src.responses_total
  FROM src
  ORDER BY src.class_id, src.bucket;
END;
$$;

REVOKE ALL ON FUNCTION "public"."overview_timeseries"(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."overview_timeseries"(timestamptz, timestamptz, text) TO "authenticated";

COMMENT ON FUNCTION "public"."overview_timeseries"(timestamptz, timestamptz, text) IS
  'Analytics Studio Área 3: per-class % correct time-series over mv_class_daily for the /school cockpit sparklines. SECURITY DEFINER + teacher_id guard.';
```

- [ ] **Step 2: Apply to prod via MCP**

Use MCP `apply_migration` with `project_id: mhfwyeczzilcizawixqw`, `name: overview_timeseries_rpc`, `query:` the CREATE FUNCTION + REVOKE + GRANT + COMMENT block above.
Expected: `{"success":true}`.

- [ ] **Step 3: Smoke-check the function exists with the right signature**

Use MCP `execute_sql` (project `mhfwyeczzilcizawixqw`):
```sql
select pg_get_function_identity_arguments(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='overview_timeseries';
```
Expected: `p_from timestamp with time zone, p_to timestamp with time zone, p_granularity text`.

(Note: calling it via `execute_sql` returns 0 rows because `auth.uid()` is null under the service role — that's expected; the live Playwright check in Task 9 exercises the authed path.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240101000075_overview_timeseries_rpc.sql
git commit -m "feat(analytics): overview_timeseries RPC for cockpit sparklines"
```

---

## Task 2: Pure lib `overview-aggregate.ts` (cross-class math)

**Files:**
- Create: `src/lib/analytics/overview-aggregate.ts`
- Test: `src/lib/analytics/__tests__/overview-aggregate.test.ts`

This is the testable heart. Four pure functions. TDD each.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/analytics/__tests__/overview-aggregate.test.ts
import { describe, it, expect } from "vitest";
import { globalKpis, classTrend, criticalTopics, topRiskStudents } from "../overview-aggregate";

describe("globalKpis", () => {
  it("weights % correct by responses_total across rows", () => {
    const ts = [
      { class_id: "a", bucket: "2026-05-01", value: 80, responses_total: 10 },
      { class_id: "a", bucket: "2026-05-02", value: 40, responses_total: 30 },
    ];
    const overview = [
      { class_id: "a", member_count: 8, session_count: 3 },
      { class_id: "b", member_count: 5, session_count: 2 },
    ];
    const k = globalKpis(ts, overview);
    // (80*10 + 40*30) / 40 = 2000/40 = 50
    expect(k.pctCorrect).toBe(50);
    expect(k.classesActive).toBe(2);
    expect(k.totalStudents).toBe(13);
    expect(k.totalSessions).toBe(5);
  });
  it("returns null pctCorrect when there are no responses", () => {
    expect(globalKpis([], []).pctCorrect).toBeNull();
  });
});

describe("classTrend", () => {
  it("groups by class_id and computes points + delta + trend", () => {
    const ts = [
      { class_id: "a", bucket: "2026-05-01", value: 40, responses_total: 5 },
      { class_id: "a", bucket: "2026-05-02", value: 60, responses_total: 5 },
      { class_id: "b", bucket: "2026-05-01", value: 70, responses_total: 5 },
    ];
    const map = classTrend(ts);
    expect(map.a.points).toEqual([40, 60]);
    expect(map.a.avg).toBe(50);   // (40*5 + 60*5) / 10
    expect(map.a.delta).toBe(20);
    expect(map.a.trend).toBe("up");
    expect(map.b.points).toEqual([70]);
    expect(map.b.avg).toBe(70);
    expect(map.b.trend).toBe("new"); // <2 points
  });
});

describe("criticalTopics", () => {
  it("flattens topics < threshold cross-class, sorted ascending", () => {
    const overview = [
      { class_id: "a", class_name: "Math", topics_snapshot: [
        { topic: "Fractions", retention_score: 30 },
        { topic: "Decimals", retention_score: 80 },
      ]},
      { class_id: "b", class_name: "Sci", topics_snapshot: [
        { topic: "Cells", retention_score: 20 },
      ]},
    ];
    const out = criticalTopics(overview, 40);
    expect(out.map((t) => t.topic)).toEqual(["Cells", "Fractions"]);
    expect(out[0]).toMatchObject({ classId: "b", className: "Sci", retention: 20 });
  });
});

describe("topRiskStudents", () => {
  it("flattens per-class risk, sorts by score desc, takes top n", () => {
    const perClass = [
      { classId: "a", className: "Math", students: [
        { name: "Ana", risk: { score: 70, level: "high", reasons: ["x"] } },
        { name: "Ben", risk: { score: 10, level: "low", reasons: [] } },
      ]},
      { classId: "b", className: "Sci", students: [
        { name: "Cleo", risk: { score: 50, level: "med", reasons: ["y"] } },
      ]},
    ];
    const out = topRiskStudents(perClass, 2);
    expect(out.map((s) => s.name)).toEqual(["Ana", "Cleo"]);
    expect(out[0]).toMatchObject({ classId: "a", className: "Math", score: 70, level: "high" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- overview-aggregate`
Expected: FAIL ("Failed to resolve import ../overview-aggregate" or "is not a function").

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/analytics/overview-aggregate.ts
// Pure cross-class aggregators for the /school cockpit. No React, no Supabase.
//
//  - globalKpis: % correct (weighted by volume) + totals for the KPI band.
//  - classTrend: per-class sparkline points + delta + trend, from overview_timeseries rows.
//  - criticalTopics: topics below a retention threshold, cross-class, ascending.
//  - topRiskStudents: per-class risk results flattened, sorted by score desc, top N.

export interface TsRow { class_id: string; bucket: string; value: number | null; responses_total: number; }
export interface OverviewRow {
  class_id: string; class_name?: string; member_count?: number; session_count?: number;
  topics_snapshot?: Array<{ topic: string; retention_score: number }>;
}

export interface GlobalKpis { pctCorrect: number | null; classesActive: number; totalStudents: number; totalSessions: number; }

export function globalKpis(ts: readonly TsRow[], overview: readonly OverviewRow[]): GlobalKpis {
  let num = 0, den = 0;
  for (const r of ts) {
    if (r.value == null || !Number.isFinite(Number(r.value))) continue;
    const w = Number(r.responses_total) || 0;
    num += Number(r.value) * w;
    den += w;
  }
  return {
    pctCorrect: den > 0 ? Math.round(num / den) : null,
    classesActive: overview.length,
    totalStudents: overview.reduce((s, r) => s + (Number(r.member_count) || 0), 0),
    totalSessions: overview.reduce((s, r) => s + (Number(r.session_count) || 0), 0),
  };
}

export type Trend = "up" | "down" | "flat" | "new";
export interface ClassTrend { points: number[]; avg: number | null; delta: number | null; trend: Trend; }

export function classTrend(ts: readonly TsRow[]): Record<string, ClassTrend> {
  const byClass: Record<string, TsRow[]> = {};
  for (const r of ts) (byClass[r.class_id] ||= []).push(r);
  const out: Record<string, ClassTrend> = {};
  for (const [id, rows] of Object.entries(byClass)) {
    const sorted = [...rows].sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));
    const points = sorted.map((r) => Number(r.value) || 0);
    // Weighted average % correct over the period (by responses per bucket) —
    // this is the stable representative number for the table column.
    let num = 0, den = 0;
    for (const r of sorted) {
      if (r.value == null || !Number.isFinite(Number(r.value))) continue;
      const w = Number(r.responses_total) || 0;
      num += Number(r.value) * w; den += w;
    }
    const avg = den > 0 ? Math.round(num / den) : null;
    if (points.length < 2) { out[id] = { points, avg, delta: null, trend: "new" }; continue; }
    const delta = points[points.length - 1] - points[0];
    out[id] = { points, avg, delta, trend: delta > 1 ? "up" : delta < -1 ? "down" : "flat" };
  }
  return out;
}

export interface CriticalTopic { classId: string; className: string; topic: string; retention: number; }

export function criticalTopics(overview: readonly OverviewRow[], threshold = 40): CriticalTopic[] {
  const out: CriticalTopic[] = [];
  for (const row of overview) {
    for (const t of row.topics_snapshot ?? []) {
      if ((t.retention_score ?? 0) < threshold) {
        out.push({ classId: row.class_id, className: row.class_name ?? "", topic: t.topic, retention: Math.round(t.retention_score ?? 0) });
      }
    }
  }
  return out.sort((a, b) => a.retention - b.retention);
}

export interface PerClassRisk {
  classId: string; className: string;
  students: Array<{ name: string; risk: { score: number; level: "low" | "med" | "high"; reasons: string[] } }>;
}
export interface RankedRiskStudent { classId: string; className: string; name: string; score: number; level: "low" | "med" | "high"; reasons: string[]; }

export function topRiskStudents(perClass: readonly PerClassRisk[], n = 5): RankedRiskStudent[] {
  const flat: RankedRiskStudent[] = [];
  for (const c of perClass) {
    for (const s of c.students) {
      flat.push({ classId: c.classId, className: c.className, name: s.name, score: s.risk.score, level: s.risk.level, reasons: s.risk.reasons });
    }
  }
  return flat.sort((a, b) => b.score - a.score).slice(0, n);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- overview-aggregate`
Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/overview-aggregate.ts src/lib/analytics/__tests__/overview-aggregate.test.ts
git commit -m "feat(analytics): pure cross-class aggregators for the cockpit"
```

---

## Task 3: Hook `useOverviewTimeseries`

**Files:**
- Create: `src/hooks/useOverviewTimeseries.js`

Mirrors `useClassTimeseries.js`. `from`/`to` are memoized by the CALLER (Director, Task 8) — same discipline that fixed the loop bug.

- [ ] **Step 1: Write the hook**

```js
// src/hooks/useOverviewTimeseries.js
//
// Analytics Studio Área 3: per-class % correct series for the /school cockpit
// sparklines. One RPC call (overview_timeseries over mv_class_daily) for all
// classes. Mismo patrón que useClassTimeseries; el caller memoiza from/to.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const overviewTimeseriesKey = (granularity, from, to) =>
  ["analytics", "overviewTimeseries", granularity, from || null, to || null];

async function fetchOverviewTimeseries(from, to, granularity) {
  const { data, error } = await supabase.rpc("overview_timeseries", {
    p_from: from || null,
    p_to: to || null,
    p_granularity: granularity,
  });
  if (error) throw error;
  return data || [];
}

export function useOverviewTimeseries({ from, to, granularity = "day" } = {}) {
  return useQuery({
    queryKey: overviewTimeseriesKey(granularity, from, to),
    queryFn: () => fetchOverviewTimeseries(from, to, granularity),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useOverviewTimeseries.js
git commit -m "feat(analytics): useOverviewTimeseries hook"
```

---

## Task 4: Hook `useRiskOverview` (N× student_risk via useQueries)

**Files:**
- Modify: `src/hooks/useStudentRisk.js` (export `fetchStudentRisk` so the new hook reuses it)
- Create: `src/hooks/useRiskOverview.js`

- [ ] **Step 1: Export `fetchStudentRisk` from `useStudentRisk.js`**

Change the declaration `async function fetchStudentRisk(...)` to `export async function fetchStudentRisk(...)` (line ~13). No other change.

```js
export async function fetchStudentRisk(classId, windowDays) {
  const { data, error } = await supabase.rpc("student_risk", {
    p_class_id: classId,
    p_window_days: windowDays || 30,
  });
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Write the hook**

```js
// src/hooks/useRiskOverview.js
//
// Analytics Studio Área 3: at-risk students across ALL the teacher's classes.
// Dynamic N queries (one student_risk per class) via React Query's useQueries
// — no new RPC. Each query is cached under the same key as useStudentRisk, so
// visiting a class' ClassDetail reuses the cockpit's fetch and vice-versa.

import { useQueries } from "@tanstack/react-query";
import { studentRiskKey, fetchStudentRisk } from "./useStudentRisk";

// classes: [{ id, name }] — returns [{ classId, className, data, isPending, error }]
export function useRiskOverview(classes = []) {
  const results = useQueries({
    queries: classes.map((c) => ({
      queryKey: studentRiskKey(c.id, 30),
      queryFn: () => fetchStudentRisk(c.id, 30),
      enabled: !!c.id,
    })),
  });
  return results.map((r, i) => ({
    classId: classes[i].id,
    className: classes[i].name,
    data: r.data,
    isPending: r.isPending,
    error: r.error,
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStudentRisk.js src/hooks/useRiskOverview.js
git commit -m "feat(analytics): useRiskOverview hook (cross-class risk via useQueries)"
```

---

## Task 5: Component `ClassTable`

**Files:**
- Create: `src/components/analytics/ClassTable.jsx`
- Modify: `src/components/analytics/index.ts` (export it)

Sortable class table modeled on `RosterTable`. Columns: Clase · % correcto (number + tier bar) · Tendencia (SparklineCell) · Participación · Sesiones · Alumnos · Última actividad. Row → drill to ClassDetail.

- [ ] **Step 1: Write the component**

```jsx
// src/components/analytics/ClassTable.jsx
//
// Analytics Studio Área 3: tabla de clases del cockpit /school. Modelada en
// RosterTable (mismo sort/filtro/keyboard). Métrica primaria: % correcto, con
// sparkline de tendencia del período (overview_timeseries). Fila → ClassDetail.

import { useMemo, useState } from "react";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";
import { formatRelativeDay } from "../../lib/analytics/formatters";
import { SparklineCell } from "../charts";
import { C } from "../tokens";

const tierColor = (v) => (v >= 70 ? C.green : v >= 40 ? C.orange : C.red);
const tierSoft = (v) => (v >= 70 ? C.greenSoft : v >= 40 ? C.orangeSoft : C.redSoft);

// rows: [{ class_id, class_name, pctCorrect:number|null, trend:{points,delta,trend},
//          participation_pct, session_count, member_count, last_activity_at }]
const COLUMNS = [
  { key: "name", label: "Clase", accessor: (r) => r.class_name },
  { key: "pct", label: "% correcto", accessor: (r) => r.pctCorrect },
  { key: "trend", label: "Tendencia", accessor: (r) => r.trend?.delta ?? null, sortable: false },
  { key: "part", label: "Participación", accessor: (r) => r.participation_pct },
  { key: "sessions", label: "Sesiones", accessor: (r) => r.session_count },
  { key: "students", label: "Alumnos", accessor: (r) => r.member_count },
  { key: "activity", label: "Última actividad", accessor: (r) => (r.last_activity_at ? new Date(r.last_activity_at).getTime() : null) },
];

export default function ClassTable({ rows = [], onRowClick }) {
  const [sortKey, setSortKey] = useState("pct");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.class_name || "").toLowerCase().includes(q));
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return sortRows(filtered, col.accessor, sortDir);
  }, [filtered, sortKey, sortDir]);

  function handleSort(key) {
    const col = COLUMNS.find((c) => c.key === key);
    if (col && col.sortable === false) return;
    if (key === sortKey) {
      const nd = nextSortDir(null, sortDir);
      if (nd === null) { setSortKey("pct"); setSortDir("desc"); } else { setSortDir(nd); }
    } else { setSortKey(key); setSortDir("asc"); }
  }
  const arrow = (key) => (key !== sortKey || !sortDir ? "" : sortDir === "asc" ? " ▲" : " ▼");

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Clases</div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre…"
          aria-label="Filtrar clases por nombre"
          style={{ marginLeft: "auto", padding: "4px 9px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}`, width: 170 }}
        />
      </div>
      {rows.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin clases registradas.</div>
      ) : sorted.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin clases que coincidan con "{filter}".</div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key}
                  onClick={() => handleSort(c.key)}
                  style={{ padding: "5px 0", cursor: c.sortable === false ? "default" : "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  title={c.sortable === false ? undefined : "Ordenar"}>
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const clickable = !!onRowClick;
              const drill = clickable ? () => onRowClick(r) : undefined;
              const pct = r.pctCorrect;
              return (
                <tr key={r.class_id}
                  onClick={drill}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drill(); } } : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  style={{ borderTop: `1px solid ${C.bgSoft}`, cursor: clickable ? "pointer" : "default" }}>
                  <td style={{ padding: "7px 0" }}>{r.class_name}</td>
                  <td>
                    {pct == null ? <span style={{ opacity: 0.4 }}>—</span> : (
                      <>
                        <div style={{ display: "inline-block", width: 70, marginRight: 6 }}>
                          <div style={{ background: tierSoft(pct), height: 6, width: `${Math.min(100, pct)}%`, borderRadius: 3 }} />
                        </div>
                        <span style={{ color: tierColor(pct), fontWeight: 600 }}>{pct}%</span>
                      </>
                    )}
                  </td>
                  <td><SparklineCell points={r.trend?.points ?? []} trend={r.trend?.trend} width={70} height={18} /></td>
                  <td>{r.participation_pct != null ? `${Math.round(r.participation_pct)}%` : "—"}</td>
                  <td>{r.session_count ?? 0}</td>
                  <td>{r.member_count ?? 0}</td>
                  <td>{formatRelativeDay(r.last_activity_at ? new Date(r.last_activity_at) : null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Export from the barrel**

Add to `src/components/analytics/index.ts`:
```ts
export { default as ClassTable } from "./ClassTable";
```

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/ClassTable.jsx src/components/analytics/index.ts
git commit -m "feat(analytics): ClassTable component for the cockpit"
```

---

## Task 6: Component `RiskOverviewList`

**Files:**
- Create: `src/components/analytics/RiskOverviewList.jsx`
- Modify: `src/components/analytics/index.ts`

Cross-class at-risk students. Each row: name + class + `RiskBadge` + top reason; click → student profile.

- [ ] **Step 1: Write the component**

```jsx
// src/components/analytics/RiskOverviewList.jsx
//
// Analytics Studio Área 3: alumnos en riesgo de TODAS las clases (cockpit).
// items: RankedRiskStudent[] de overview-aggregate.topRiskStudents().
// onStudentClick(item) → drill al perfil del alumno.

import RiskBadge from "./RiskBadge";
import { C } from "../tokens";

export default function RiskOverviewList({ items = [], onStudentClick, loading = false }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${C.red}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Alumnos en riesgo</div>
      {loading ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Calculando…</div>
      ) : items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Nadie en riesgo ahora mismo.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((s) => {
            const clickable = !!onStudentClick;
            const drill = clickable ? () => onStudentClick(s) : undefined;
            return (
              <div key={`${s.classId}-${s.name}`}
                onClick={drill}
                onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drill(); } } : undefined}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: C.bgSoft, cursor: clickable ? "pointer" : "default" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.className}{s.reasons?.[0] ? ` · ${s.reasons[0]}` : ""}
                  </div>
                </div>
                <RiskBadge level={s.level} score={s.score} compact />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Export from the barrel** — add `export { default as RiskOverviewList } from "./RiskOverviewList";`

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/RiskOverviewList.jsx src/components/analytics/index.ts
git commit -m "feat(analytics): RiskOverviewList component"
```

---

## Task 7: Component `CriticalTopicsList` (with "Generar repaso")

**Files:**
- Create: `src/components/analytics/CriticalTopicsList.jsx`
- Modify: `src/components/analytics/index.ts`

Cross-class critical topics (retention < 40). Each row: topic + class + retention% + drill to Topics view. A per-row "Generar repaso" reuses the F5 generator (same pattern as `CleoStrip`/`ClassDetail.handleGenerateClassReview`).

- [ ] **Step 1: Write the component**

```jsx
// src/components/analytics/CriticalTopicsList.jsx
//
// Analytics Studio Área 3: temas críticos (retención < 40) de TODAS las clases.
// items: CriticalTopic[] de overview-aggregate.criticalTopics().
// onTopicClick(item) → drill a la vista de Temas.
// onGenerateReview(item) → genera un repaso del tema (lo maneja el orquestador,
// que tiene el classObj + profile para llamar close-unit-ai).

import { useState } from "react";
import { C } from "../tokens";

const tierColor = (v) => (v >= 70 ? C.green : v >= 40 ? C.orange : C.red);

export default function CriticalTopicsList({ items = [], onTopicClick, onGenerateReview, generatingKey = null }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${C.orange}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Temas críticos</div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Ningún tema bajo el umbral.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((t) => {
            const key = `${t.classId}-${t.topic}`;
            const busy = generatingKey === key;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: C.bgSoft }}>
                <div
                  onClick={onTopicClick ? () => onTopicClick(t) : undefined}
                  onKeyDown={onTopicClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTopicClick(t); } } : undefined}
                  tabIndex={onTopicClick ? 0 : undefined}
                  role={onTopicClick ? "button" : undefined}
                  style={{ minWidth: 0, flex: 1, cursor: onTopicClick ? "pointer" : "default" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{t.className}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: tierColor(t.retention) }}>{t.retention}%</span>
                {onGenerateReview && (
                  <button
                    onClick={() => onGenerateReview(t)}
                    disabled={busy}
                    style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, cursor: busy ? "default" : "pointer", color: C.accent, whiteSpace: "nowrap" }}>
                    {busy ? "Generando…" : "Generar repaso"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Export from the barrel** — add `export { default as CriticalTopicsList } from "./CriticalTopicsList";`

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/CriticalTopicsList.jsx src/components/analytics/index.ts
git commit -m "feat(analytics): CriticalTopicsList component"
```

---

## Task 8: Rewrite `Director.jsx` as the cockpit orchestrator

**Files:**
- Rewrite: `src/pages/Director.jsx`
- Modify: `src/i18n/en.js`, `src/i18n/es.js`, `src/i18n/ko.ts` (the `director` namespace — keep `pageTitle`/`subtitle`/`backToMyClasses`/`noClasses`; the tab labels are no longer needed but leaving them is harmless).

The orchestrator: fetches, memoizes period range, composes blocks. Thin — all math is in `overview-aggregate.ts`.

- [ ] **Step 1: Write the new `Director.jsx`**

```jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudioShell, PulseStrip, ExportMenu, StatCardWithSparkline, StudioSkeleton, ClassTable, RiskOverviewList, CriticalTopicsList } from "../components/analytics";
import AnimatedNumber from "../components/analytics/AnimatedNumber";
import { buildOverviewReportModel } from "../lib/analytics/report-model";
import { globalKpis, classTrend, criticalTopics, topRiskStudents } from "../lib/analytics/overview-aggregate";
import { riskScore } from "../lib/analytics/risk";
import { formatPercent, formatNumber } from "../lib/analytics/formatters";
import { useAnalyticsOverview } from "../hooks/useAnalyticsOverview";
import { useOverviewTimeseries } from "../hooks/useOverviewTimeseries";
import { useRiskOverview } from "../hooks/useRiskOverview";
import { generateClassReviewQuestions, saveClassReviewDeck } from "../lib/close-unit-ai";
import { buildRoute, ROUTES } from "../routes";
import { C } from "../components/tokens";
import { useT } from "../i18n";

// 7d/30d/90d → from/to ISO. Memoized by caller so the queryKey is stable.
function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  if (period === "d7") return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
  if (period === "d90") return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
  if (period === "custom") return { from: null, to: null };
  return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
}

export default function Director({ profile = null, lang: pageLang = "en", setLang, onOpenMobileMenu }) {
  const navigate = useNavigate();
  const l = pageLang;
  const t = useT("director", l);
  const [period, setPeriod] = useState("d30");
  const { from, to } = useMemo(() => periodToRange(period), [period]);
  const [genKey, setGenKey] = useState(null);

  const overviewQ = useAnalyticsOverview();
  const tsQ = useOverviewTimeseries({ from, to, granularity: "day" });
  const overview = overviewQ.data ?? [];
  const ts = tsQ.data ?? [];

  const classesForRisk = useMemo(
    () => overview.map((r) => ({ id: r.class_id, name: r.class_name })),
    [overview],
  );
  const riskResults = useRiskOverview(classesForRisk);

  const kpis = useMemo(() => globalKpis(ts, overview), [ts, overview]);
  const trends = useMemo(() => classTrend(ts), [ts]);
  const critical = useMemo(() => criticalTopics(overview, 40), [overview]);

  const perClassRisk = useMemo(() => riskResults.map((r) => ({
    classId: r.classId, className: r.className,
    students: (r.data?.students ?? []).map((s) => ({
      name: s.student_name,
      risk: riskScore({
        recentPctCorrect: s.recent_pct_correct,
        weeklyPctCorrect: Array.isArray(s.weekly_pct_correct) ? s.weekly_pct_correct : [],
        recentParticipation: s.recent_participation,
        daysSinceLastActivity: s.days_since_last_activity,
      }),
    })),
  })), [riskResults]);
  const topRisk = useMemo(() => topRiskStudents(perClassRisk, 5), [perClassRisk]);
  const riskLoading = riskResults.some((r) => r.isPending);

  // Class table rows: overview + trend
  const classRows = useMemo(() => overview.map((r) => ({
    ...r,
    pctCorrect: trends[r.class_id]?.avg ?? null,
    trend: trends[r.class_id] ?? { points: [], avg: null, delta: null, trend: "new" },
  })), [overview, trends]);

  async function handleGenerateReview(topic) {
    const key = `${topic.classId}-${topic.topic}`;
    if (genKey) return;
    setGenKey(key);
    const row = overview.find((r) => r.class_id === topic.classId);
    const classObj = row
      ? { id: row.class_id, name: row.class_name || "", subject: row.class_subject || "", grade: row.class_grade || "" }
      : { id: topic.classId, name: topic.className, subject: "", grade: "" };
    const gen = await generateClassReviewQuestions({ classObj, weakTopics: [topic.topic], lang: "es" });
    if (!gen.ok) { setGenKey(null); return; }
    const save = await saveClassReviewDeck({ classObj, questions: gen.questions, lang: gen.inferredLang || "es", authorId: profile?.id ?? null });
    setGenKey(null);
    if (save.ok) navigate(buildRoute.deckEdit(save.deckId));
  }

  const loading = overviewQ.isPending;

  return (
    <StudioShell
      view="overview"
      title="Analytics"
      period={period}
      onPeriodChange={setPeriod}
      toolbarExtras={
        <ExportMenu
          baseName="reporte-general"
          disabled={overview.length === 0}
          buildModel={() => buildOverviewReportModel({
            period,
            stats: { avgRetention: kpis.pctCorrect ?? 0, classes: kpis.classesActive, students: kpis.totalStudents, sessions: kpis.totalSessions },
            perClass: overview.map((c) => ({ name: c.class_name, retention: Math.round(Number(c.retention_avg) || 0) })),
          })}
        />
      }
    >
      <div style={{ padding: 18, background: C.bgSoft, minHeight: "100%" }}>
        {loading && overview.length === 0 ? (
          <StudioSkeleton variant="class" />
        ) : overview.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: C.textMuted }}>{t.noClasses}</div>
        ) : (
          <>
            {/* KPI band — % correcto del período + totales */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
              <StatCardWithSparkline label="% correcto" value={<AnimatedNumber value={kpis.pctCorrect} format={formatPercent} />} />
              <StatCardWithSparkline label="Clases" value={<AnimatedNumber value={kpis.classesActive} format={formatNumber} />} />
              <StatCardWithSparkline label="Alumnos" value={<AnimatedNumber value={kpis.totalStudents} format={formatNumber} />} />
              <StatCardWithSparkline label="Sesiones" value={<AnimatedNumber value={kpis.totalSessions} format={formatNumber} />} />
            </div>

            {/* Action center */}
            <PulseStrip />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, margin: "12px 0" }}>
              <RiskOverviewList
                items={topRisk}
                loading={riskLoading}
                onStudentClick={(s) => navigate(buildRoute.analyticsStudent(s.classId, s.name))}
              />
              <CriticalTopicsList
                items={critical}
                generatingKey={genKey}
                onTopicClick={(tp) => navigate(`${buildRoute.analyticsTopics(tp.classId)}?topic=${encodeURIComponent(tp.topic)}`)}
                onGenerateReview={handleGenerateReview}
              />
            </div>

            {/* Class table */}
            <ClassTable rows={classRows} onRowClick={(r) => navigate(buildRoute.analyticsClass(r.class_id))} />
          </>
        )}
      </div>
    </StudioShell>
  );
}
```

- [ ] **Step 2: Sanity-check i18n keys exist**

Confirm `src/i18n/es.js` (and en/ko) `director` namespace has `noClasses`. If `t.noClasses` is missing in any locale, add it (`noClasses: "Aún no tienes clases."` / `"No classes yet."` / Korean equivalent). The old tab-label keys can stay unused.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Director.jsx src/i18n/
git commit -m "feat(analytics): rewrite /school Director as the Semrush cockpit"
```

---

## Task 9: Verify live + gate + PR

**Files:** none (verification + ship).

- [ ] **Step 1: Ensure dev server is up**

`localhost:3001` should already be running (Vite). If not: `npm run dev` (background).

- [ ] **Step 2: Drive the cockpit logged-in (Playwright)**

Navigate to `http://localhost:3001/school` logged in as `pedro@hola.com`. Verify:
- KPI band shows real values with count-up (% correcto ~44%, Clases 1, Alumnos 8, Sesiones 6).
- Action center: PulseStrip resolves; RiskOverviewList lists at-risk students (Faisal/Hugo/Diego near the top) with badges + drill; CriticalTopicsList shows "La familia" (30%) with a "Generar repaso" button.
- Class table: row for "Spanish 1" with % correcto + sparkline; sort by clicking a header; row click → `/school/class/:id`.
- Console: **no 400s, no infinite loop** (check `browser_network_requests` — one call per RPC).
Capture a screenshot as evidence.

- [ ] **Step 3: Run the full gate**

```bash
npm run lint && npm run test:run && npm run build
```
Expected: lint clean (0 errors), tests pass (≥440 — the +6 new aggregate tests), build succeeds.

- [ ] **Step 4: Open PR and squash-merge**

```bash
git push -u origin claude/analytics-studio-cockpit
gh pr create --base main --title "feat(analytics): Analytics Studio Área 3 — /school cockpit" --body "<summary + verification>"
gh pr merge --squash --delete-branch
```
After merge: `git checkout main && git pull --ff-only`. Update memory `project_analytics_studio.md`.

---

## Self-Review notes (for the implementer)

- **Spec coverage:** KPI band (Task 8) · action center pulse+risk+critical (Tasks 6,7,8) · class table + sparklines (Tasks 1,3,5,8) · 1 RPC over existing MV (Task 1) · pure cross-class math (Task 2) · risk via N×student_risk (Task 4) · % correct primary / retention only in critical topics (Tasks 2,8). All covered.
- **Period:** `from/to` are memoized in Director (Task 8) — do NOT regress the loop bug. The KPI counts (clases/alumnos) come from `analytics_overview` (all-time); % correcto + sparklines respect the period via `overview_timeseries`.
- **42702 lesson:** the new RPC qualifies every `mv_class_daily` column with alias `d`.
- **No emoji in real UI:** the placeholder emoji in Task 7 Step 1 must be removed (noted inline).
- **Types:** `classTrend` returns `{points, delta, trend}`; `ClassTable` reads `r.trend.points`/`r.trend.trend`; Director builds `classRows` with `pctCorrect` = last sparkline point. Consistent across Tasks 2/5/8.
