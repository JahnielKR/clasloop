# Analytics Studio — Fase 0 (Cimientos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the data motor and the navigation shell of Analytics Studio — kills the N+1 in `useDirector` (which today does 4-6 sequential queries per class) so the cross-class overview loads in a single RPC, and renders the Director page inside the new `StudioShell` (sub-nav + persistent toolbar with period chips). The 6 non-overview sub-nav items show "Próximamente — F1+" stubs in this phase.

**Architecture:** SQL migrations add 2 materialized views (`mv_class_daily`, `mv_class_topic_weekly`) and 3 `SECURITY DEFINER` RPCs (`analytics_overview`, `class_analytics`, `class_timeseries`), all guarded by `teacher_id = auth.uid()`. `analytics_overview` returns enough data in one call to replace `useDirector`'s loop (KPIs + topics + students snapshots per class). React Query hooks wrap each RPC. Pure KPI math lives in `src/lib/analytics/metrics.ts` with vitest coverage. The `StudioShell` component composes a sub-nav + toolbar and wraps `Director.jsx` as the Overview view.

**Tech Stack:** Supabase (Postgres + pg_cron), Vite + React 18, `@tanstack/react-query` v5, vitest, recharts.

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` (commit `d5d9df0`).

**Branch:** `claude/vigorous-chaum-c056f3` (current worktree). Workflow: branch-per-PR, `--no-ff` merge, separate `docs(prs)` commit if `PRs/CHANGES_TO_PLAN.md` is updated (it is force-tracked despite being under the gitignored `PRs/` — see `memory/project_prs_workflow.md`).

**Prod SQL policy (critical):** I never apply prod SQL myself. Each SQL task includes a "Hand snippet to user" step. The user applies it in their Supabase SQL editor. After they confirm, I commit the migration file. `supabase/schema.sql` is the dump-snapshot; the user re-dumps when convenient (not gating).

---

## Pre-task: File Structure

**Create (15 files):**
- `supabase/migrations/20240101000064_analytics_mvs.sql` — both MVs in one file with unique indexes.
- `supabase/migrations/20240101000065_analytics_overview_rpc.sql` — RPC #1.
- `supabase/migrations/20240101000066_class_analytics_rpc.sql` — RPC #2.
- `supabase/migrations/20240101000067_class_timeseries_rpc.sql` — RPC #3.
- `supabase/migrations/20240101000068_analytics_mv_cron.sql` — pg_cron schedule.
- `src/lib/analytics/metrics.ts` — pure KPI math.
- `src/lib/analytics/__tests__/metrics.test.ts` — vitest coverage.
- `src/lib/analytics/index.ts` — barrel.
- `src/hooks/useAnalyticsOverview.js` — RQ wrapper #1.
- `src/hooks/useClassAnalytics.js` — RQ wrapper #2.
- `src/hooks/useClassTimeseries.js` — RQ wrapper #3.
- `src/components/analytics/StudioShell.jsx` — sub-nav + toolbar shell.
- `src/components/analytics/PeriodChips.jsx` — 7d/30d/90d/Custom chip group.
- `src/components/analytics/index.ts` — barrel.
- `src/components/charts/index.ts` — barrel (re-exports existing + named exports for future).

**Modify (2 files):**
- `src/hooks/useDirector.js` — replace per-class loop with a single `analytics_overview` RPC call; preserve the existing return shape (`classes`, `retentionData`, `studentData`, `sessionCounts`, `memberCounts`) so `Director.jsx` is unchanged.
- `src/pages/Director.jsx` — wrap the existing content with `<StudioShell view="overview">…</StudioShell>` so the sidebar/toolbar shows; pre-existing tabs/UI stay intact (this phase only adds the shell, not new content).

**Out of scope for F0 (explicit):**
- New views (ClassDetail / StudentProfile / etc.) — F1+.
- `useCrossfilter` / global filter context — F1.
- `risk.ts`, `benchmark.ts`, `forecast.ts` — F2/F4/F5.
- Reports / Export / Email — F7.
- Renaming the sidebar item from "School" to "Analytics" — punted (open question in spec §10).

---

## Task 1: Scaffold `src/lib/analytics/`

**Files:**
- Create: `src/lib/analytics/index.ts`
- Create: `src/lib/analytics/__tests__/.gitkeep` (empty placeholder so the dir exists before the next task adds tests)

- [ ] **Step 1: Create the barrel.**

Write `src/lib/analytics/index.ts`:

```ts
// Public surface of src/lib/analytics. Only re-exports.
// Add new exports here as later phases land risk.ts, benchmark.ts, forecast.ts, etc.
export * from "./metrics";
```

(Note: `metrics.ts` doesn't exist yet — TypeScript will flag this until Task 2. That's fine; we don't run typecheck mid-task. The barrel is set up first so the import path is stable.)

- [ ] **Step 2: Create the test directory placeholder.**

```bash
mkdir -p src/lib/analytics/__tests__
touch src/lib/analytics/__tests__/.gitkeep
```

- [ ] **Step 3: Commit.**

```bash
git add src/lib/analytics/
git commit -m "feat(analytics): scaffold src/lib/analytics/ + barrel

F0 cimientos: directorio para la lógica pura de analytics (metrics,
risk, benchmark, forecast — los próximos van entrando por fase). El
barrel exporta la superficie pública.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: TDD — `metrics.ts` (pure KPI math)

**Files:**
- Test: `src/lib/analytics/__tests__/metrics.test.ts`
- Create: `src/lib/analytics/metrics.ts`

The functions are intentionally tiny pure helpers that the React layer composes. Tested first.

- [ ] **Step 1: Write the failing test file.**

Write `src/lib/analytics/__tests__/metrics.test.ts`:

```ts
/* @vitest-environment node */
// Pure math helpers for analytics widgets. No React, no Supabase.
// Same convention as src/lib/__tests__/scoring-thresholds.test.ts.

import { describe, it, expect } from "vitest";
import {
  mean,
  delta,
  pctChange,
  trendSlope,
  participationRate,
} from "../metrics";

describe("mean", () => {
  it("returns the arithmetic mean", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([4, 4, 4])).toBe(4);
  });
  it("returns null for empty input", () => {
    expect(mean([])).toBeNull();
  });
});

describe("delta", () => {
  it("returns b - a", () => {
    expect(delta(50, 60)).toBe(10);
    expect(delta(70, 50)).toBe(-20);
  });
  it("returns null if either side is missing", () => {
    expect(delta(null, 60)).toBeNull();
    expect(delta(50, null)).toBeNull();
    expect(delta(undefined, 60)).toBeNull();
  });
});

describe("pctChange", () => {
  it("returns percent change a -> b", () => {
    expect(pctChange(50, 60)).toBe(20);
    expect(pctChange(100, 75)).toBe(-25);
  });
  it("returns null when a is 0 (undefined division)", () => {
    expect(pctChange(0, 60)).toBeNull();
  });
  it("returns null on missing input", () => {
    expect(pctChange(null, 60)).toBeNull();
    expect(pctChange(50, null)).toBeNull();
  });
});

describe("trendSlope", () => {
  it("returns positive slope for a rising line", () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(trendSlope(points)).toBe(1);
  });
  it("returns 0 for a flat line", () => {
    const points = [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }];
    expect(trendSlope(points)).toBe(0);
  });
  it("returns null with fewer than 2 points", () => {
    expect(trendSlope([])).toBeNull();
    expect(trendSlope([{ x: 0, y: 0 }])).toBeNull();
  });
});

describe("participationRate", () => {
  it("returns participants/members * 100", () => {
    expect(participationRate(27, 30)).toBe(90);
    expect(participationRate(15, 30)).toBe(50);
  });
  it("returns null when members is 0 (undefined division)", () => {
    expect(participationRate(0, 0)).toBeNull();
  });
  it("returns 0 when participants is 0 and members > 0", () => {
    expect(participationRate(0, 30)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the failing tests.**

```bash
npm run test:run -- src/lib/analytics
```

Expected output: vitest fails because `../metrics` cannot be resolved (file doesn't exist yet). That's the correct "red".

- [ ] **Step 3: Implement `metrics.ts`.**

Write `src/lib/analytics/metrics.ts`:

```ts
// ─── src/lib/analytics/metrics.ts ────────────────────────────────────
// Pure KPI math. No React, no Supabase. Tested in __tests__/metrics.test.ts.
//
// Used by the Analytics Studio widgets (StatCardWithSparkline, TrendPanel,
// CompositionDonut, etc.) to format/compute small derived values. Anything
// that needs more than this (risk, benchmark, forecast) gets its own file
// in src/lib/analytics/.

/** Arithmetic mean. Returns null for empty input. */
export function mean(xs: readonly number[]): number | null {
  if (!xs || xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Absolute delta b - a. Returns null if either side is missing. */
export function delta(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null || b == null) return null;
  return b - a;
}

/**
 * Percent change from a to b, signed (so -25 means dropped 25%).
 * Returns null when a is 0 (division undefined) or either side is missing.
 */
export function pctChange(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null || b == null) return null;
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}

/**
 * Simple linear regression slope of {x,y} points.
 * Returns null if fewer than 2 points or all x are identical (vertical line).
 */
export function trendSlope(
  points: readonly { x: number; y: number }[],
): number | null {
  if (!points || points.length < 2) return null;
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Participation as a 0..100 percent.
 * Returns null when members is 0 (undefined); returns 0 when participants is 0.
 */
export function participationRate(
  participants: number,
  members: number,
): number | null {
  if (!members) return null;
  return (participants / members) * 100;
}
```

- [ ] **Step 4: Run the tests; expect green.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: all 13 tests pass.

- [ ] **Step 5: Run typecheck to confirm types compile.**

```bash
npm run typecheck
```

Expected: 0 errors. (The barrel from Task 1 now resolves.)

- [ ] **Step 6: Commit.**

```bash
git add src/lib/analytics/metrics.ts src/lib/analytics/__tests__/metrics.test.ts
git commit -m "feat(analytics): metrics.ts — pure KPI math + vitest coverage

mean / delta / pctChange / trendSlope / participationRate. Funciones
puras sin React ni Supabase. Cubre los cálculos que comparten todas las
stat cards, sparklines y deltas del Studio. Mismo patrón que
src/lib/scoring-thresholds (pure + tested) — verificable sin login.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: SQL Migration — Materialized Views

**Files:**
- Create: `supabase/migrations/20240101000064_analytics_mvs.sql`

The two MVs aggregate `responses`. They have NO RLS (Postgres doesn't apply RLS to MVs) — that's why they are read ONLY through the `SECURITY DEFINER` RPCs in tasks 4-6 (which include `teacher_id = auth.uid()` guards). Direct client access stays denied via REVOKE.

- [ ] **Step 1: Write the migration file.**

Write `supabase/migrations/20240101000064_analytics_mvs.sql`:

```sql
-- ─── Analytics Studio F0 · Materialized Views ──────────────────────────
-- Pre-aggregate `responses` to make the time-series RPC affordable.
-- IMPORTANT: NO RLS. Never expose these MVs directly to clients.
-- They are read ONLY via SECURITY DEFINER RPCs (see migrations 65/66/67).

-- mv_class_daily — clase × día
-- Powers: class_timeseries(p_granularity='day'|'week') + analytics_overview KPIs.
CREATE MATERIALIZED VIEW IF NOT EXISTS "public"."mv_class_daily" AS
SELECT
  s.class_id,
  s.teacher_id,
  (date_trunc('day', r.created_at))::date AS day,
  COUNT(*)::int AS responses_total,
  SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
  SUM(r.points)::int AS points_sum,
  SUM(r.max_points)::int AS max_points_sum,
  COALESCE(AVG(r.time_taken_ms)::int, 0) AS avg_time_ms,
  COUNT(DISTINCT r.participant_id)::int AS unique_participants
FROM "public"."responses" r
JOIN "public"."sessions" s ON s.id = r.session_id
GROUP BY s.class_id, s.teacher_id, (date_trunc('day', r.created_at))::date;

-- UNIQUE index is REQUIRED for REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS "mv_class_daily_uniq"
  ON "public"."mv_class_daily" (class_id, day);

-- Lookup index for the common per-class window query.
CREATE INDEX IF NOT EXISTS "mv_class_daily_teacher_day"
  ON "public"."mv_class_daily" (teacher_id, day DESC);

-- Lock down direct access. Authenticated users have no role here;
-- they go through SECURITY DEFINER RPCs.
REVOKE ALL ON "public"."mv_class_daily" FROM PUBLIC;
REVOKE ALL ON "public"."mv_class_daily" FROM "authenticated";
REVOKE ALL ON "public"."mv_class_daily" FROM "anon";

-- ─────────────────────────────────────────────────────────────────────

-- mv_class_topic_weekly — clase × tema × semana
-- Powers: per-topic mini-trends (F2/F3). Built in F0 because the schema
-- is set and the cron job from migration 68 refreshes both MVs together.
CREATE MATERIALIZED VIEW IF NOT EXISTS "public"."mv_class_topic_weekly" AS
SELECT
  s.class_id,
  s.teacher_id,
  s.topic,
  (date_trunc('week', r.created_at))::date AS week,
  COUNT(*)::int AS responses_total,
  SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
  SUM(r.points)::int AS points_sum,
  SUM(r.max_points)::int AS max_points_sum
FROM "public"."responses" r
JOIN "public"."sessions" s ON s.id = r.session_id
GROUP BY s.class_id, s.teacher_id, s.topic, (date_trunc('week', r.created_at))::date;

CREATE UNIQUE INDEX IF NOT EXISTS "mv_class_topic_weekly_uniq"
  ON "public"."mv_class_topic_weekly" (class_id, topic, week);

CREATE INDEX IF NOT EXISTS "mv_class_topic_weekly_teacher_week"
  ON "public"."mv_class_topic_weekly" (teacher_id, week DESC);

REVOKE ALL ON "public"."mv_class_topic_weekly" FROM PUBLIC;
REVOKE ALL ON "public"."mv_class_topic_weekly" FROM "authenticated";
REVOKE ALL ON "public"."mv_class_topic_weekly" FROM "anon";
```

- [ ] **Step 2: Self-read the SQL for safety.**

Verify all of:
- Only `CREATE MATERIALIZED VIEW IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `REVOKE`. No `DROP`, `DELETE`, `UPDATE`, `TRUNCATE` anywhere.
- Both MVs have `UNIQUE` indexes (required for CONCURRENTLY refresh in task 7).
- Both MVs have explicit `REVOKE ALL` for `authenticated` and `anon`.

Use the **Grep tool** on the migration file with pattern `^\s*(DROP|DELETE|UPDATE|TRUNCATE|ALTER TABLE)`. Expected: 0 matches. If anything matches, abort and inspect.

- [ ] **Step 3: Hand snippet to user.**

Tell the user (in chat):

> "Listo migration 064 — vistas materializadas. SQL en `supabase/migrations/20240101000064_analytics_mvs.sql`. Copia el archivo entero al SQL editor de Supabase prod y ejecuta. Es 100% read-only sobre tablas existentes (CREATE IF NOT EXISTS + REVOKE), no toca datos. Avísame cuando esté aplicado."

Wait for the user to confirm before committing.

- [ ] **Step 4: After user confirms, commit the migration.**

```bash
git add supabase/migrations/20240101000064_analytics_mvs.sql
git commit -m "feat(analytics): MVs mv_class_daily + mv_class_topic_weekly (F0)

Pre-agregan public.responses por clase/día y clase/tema/semana.
SIN RLS (Postgres no aplica RLS a MVs) → REVOKE ALL para
authenticated/anon. Lectura solo vía RPCs SECURITY DEFINER de
las migrations 65-67. Cron de refresh en migration 68.

Aplicado en prod por el usuario (Supabase SQL editor).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: SQL Migration — `analytics_overview` RPC

**Files:**
- Create: `supabase/migrations/20240101000065_analytics_overview_rpc.sql`

This is the RPC that kills the N+1. It returns one row per owned class with the KPIs Director.jsx needs PLUS the `topics_snapshot` and `students_snapshot` jsonb arrays so the existing tabs still work without per-class queries.

- [ ] **Step 1: Write the migration file.**

Write `supabase/migrations/20240101000065_analytics_overview_rpc.sql`:

```sql
-- ─── Analytics Studio F0 · analytics_overview RPC ──────────────────────
-- Reemplaza el N+1 de useDirector.js (4-6 queries por clase) con UNA
-- llamada. Devuelve un row por clase del docente con:
--   KPIs (member_count, session_count, retention_avg, participation, last_activity)
--   + topics_snapshot (jsonb array)   — para el tab de retención
--   + students_snapshot (jsonb array) — para el tab de estudiantes
-- Mismo patrón SECURITY DEFINER + auth.uid() que class_decks_summary().

CREATE OR REPLACE FUNCTION "public"."analytics_overview"()
RETURNS TABLE(
  class_id uuid,
  class_name text,
  class_grade text,
  class_subject text,
  class_code text,
  retention_avg numeric,
  participation_pct numeric,
  session_count integer,
  member_count integer,
  unique_students integer,
  last_activity_at timestamptz,
  topics_snapshot jsonb,
  students_snapshot jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owned_classes AS (
    SELECT id, name, grade, subject, class_code
    FROM public.classes
    WHERE teacher_id = auth.uid()
  ),
  ret AS (
    SELECT
      tr.class_id,
      AVG(tr.retention_score)::numeric AS retention_avg,
      jsonb_agg(jsonb_build_object(
        'topic', tr.topic,
        'retention_score', tr.retention_score,
        'total_questions', tr.total_questions,
        'correct_answers', tr.correct_answers,
        'session_count', tr.session_count,
        'last_reviewed_at', tr.last_reviewed_at,
        'next_review_at', tr.next_review_at,
        'snoozed_until', tr.snoozed_until,
        'dismissed', tr.dismissed,
        'deck_id', tr.deck_id
      ) ORDER BY tr.retention_score ASC) AS topics_snapshot
    FROM public.topic_retention tr
    WHERE tr.class_id IN (SELECT id FROM owned_classes)
    GROUP BY tr.class_id
  ),
  sess AS (
    SELECT class_id, COUNT(*)::int AS session_count, MAX(completed_at) AS last_activity_at
    FROM public.sessions
    WHERE class_id IN (SELECT id FROM owned_classes)
    GROUP BY class_id
  ),
  mem AS (
    SELECT class_id, COUNT(*)::int AS member_count
    FROM public.class_members
    WHERE class_id IN (SELECT id FROM owned_classes)
    GROUP BY class_id
  ),
  parts AS (
    SELECT s.class_id, COUNT(DISTINCT sp.student_name)::int AS unique_students
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    WHERE s.class_id IN (SELECT id FROM owned_classes)
    GROUP BY s.class_id
  ),
  students AS (
    SELECT
      stp.class_id,
      jsonb_agg(jsonb_build_object(
        'student_id', stp.student_id,
        'student_name', stp.student_name,
        'topic', stp.topic,
        'retention_score', stp.retention_score,
        'total_questions', stp.total_questions,
        'correct_answers', stp.correct_answers,
        'last_reviewed_at', stp.last_reviewed_at
      ) ORDER BY stp.last_reviewed_at DESC NULLS LAST) AS students_snapshot
    FROM public.student_topic_progress stp
    WHERE stp.class_id IN (SELECT id FROM owned_classes)
    GROUP BY stp.class_id
  )
  SELECT
    c.id AS class_id,
    c.name AS class_name,
    c.grade AS class_grade,
    c.subject AS class_subject,
    c.class_code AS class_code,
    COALESCE(ret.retention_avg, 0)::numeric AS retention_avg,
    CASE
      WHEN COALESCE(mem.member_count, 0) > 0
        THEN ROUND((COALESCE(parts.unique_students, 0)::numeric / mem.member_count::numeric) * 100, 1)
      ELSE 0
    END AS participation_pct,
    COALESCE(sess.session_count, 0) AS session_count,
    COALESCE(mem.member_count, 0) AS member_count,
    COALESCE(parts.unique_students, 0) AS unique_students,
    sess.last_activity_at,
    COALESCE(ret.topics_snapshot, '[]'::jsonb) AS topics_snapshot,
    COALESCE(students.students_snapshot, '[]'::jsonb) AS students_snapshot
  FROM owned_classes c
  LEFT JOIN ret ON ret.class_id = c.id
  LEFT JOIN sess ON sess.class_id = c.id
  LEFT JOIN mem ON mem.class_id = c.id
  LEFT JOIN parts ON parts.class_id = c.id
  LEFT JOIN students ON students.class_id = c.id
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION "public"."analytics_overview"() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."analytics_overview"() TO "authenticated";

COMMENT ON FUNCTION "public"."analytics_overview"() IS
  'Analytics Studio F0: cross-class snapshot for the authenticated teacher. Replaces the N+1 in useDirector.js. SECURITY DEFINER + teacher_id = auth.uid() implicit via owned_classes CTE.';
```

- [ ] **Step 2: Self-verify the guard.**

The guard pattern is: `owned_classes` filters by `teacher_id = auth.uid()` and every subsequent CTE joins to it. So a teacher cannot accidentally see another teacher's data.

Use the **Grep tool** on the migration file with pattern `auth\.uid\(\)`. Expected: at least 1 match.

- [ ] **Step 3: Hand snippet to user.**

Tell the user:

> "Listo migration 065 — RPC analytics_overview. Copia el archivo entero al SQL editor y ejecuta. Es CREATE OR REPLACE FUNCTION + REVOKE/GRANT, no toca datos. Cuando esté, podemos probarla con: `select * from analytics_overview();` logueado como tu cuenta de profe."

Wait for user confirmation, then optionally:

> "(Opcional) Si quieres, te paso también la query smoke desde un script que solo lee con el anon key — patrón del PR 157 — para verificar que rechaza a usuarios no-dueños."

- [ ] **Step 4: After user confirms, commit.**

```bash
git add supabase/migrations/20240101000065_analytics_overview_rpc.sql
git commit -m "feat(analytics): analytics_overview RPC — mata el N+1 (F0)

Cross-class snapshot del docente autenticado en UNA llamada. KPIs
(retention_avg, participation_pct, session_count, member_count,
unique_students, last_activity_at) + topics_snapshot + students_snapshot
por clase. Guard de propiedad: WHERE teacher_id = auth.uid() en la CTE
owned_classes, todo se joinea desde ahí. SECURITY DEFINER + STABLE.

Reemplaza las 4-6 queries por clase de useDirector.js (en task 9 se
hace el switch en JS).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: SQL Migration — `class_analytics` RPC

**Files:**
- Create: `supabase/migrations/20240101000066_class_analytics_rpc.sql`

Per-class deep KPIs over a date window. Lee `mv_class_daily` para los agregados rápidos + `topic_retention` para el snapshot + `responses` para "más falladas".

- [ ] **Step 1: Write the migration file.**

Write `supabase/migrations/20240101000066_class_analytics_rpc.sql`:

```sql
-- ─── Analytics Studio F0 · class_analytics RPC ────────────────────────
-- KPIs + topic mastery + most-missed para UNA clase, sobre una ventana.
-- Lo consume el ClassDetail view (F1). En F0 está listo y testeable.

CREATE OR REPLACE FUNCTION "public"."class_analytics"(
  p_class_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
  v_from timestamptz := COALESCE(p_from, now() - interval '30 days');
  v_to   timestamptz := COALESCE(p_to, now());
  v_kpis jsonb;
  v_topics jsonb;
  v_missed jsonb;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- KPIs from mv_class_daily over the window
  SELECT jsonb_build_object(
    'responses_total', COALESCE(SUM(responses_total), 0),
    'responses_correct', COALESCE(SUM(responses_correct), 0),
    'pct_correct', CASE
      WHEN COALESCE(SUM(max_points_sum), 0) > 0
        THEN ROUND((SUM(points_sum)::numeric / SUM(max_points_sum)::numeric) * 100, 1)
      ELSE NULL END,
    'avg_time_ms', COALESCE(ROUND(AVG(avg_time_ms))::int, 0),
    'unique_participants', COALESCE(SUM(unique_participants), 0)
  ) INTO v_kpis
  FROM public.mv_class_daily
  WHERE class_id = p_class_id
    AND day >= v_from::date AND day <= v_to::date;

  -- Topic mastery (current snapshot — F0 doesn't add history)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'topic', topic,
    'retention_score', retention_score,
    'session_count', session_count,
    'last_reviewed_at', last_reviewed_at,
    'next_review_at', next_review_at
  ) ORDER BY retention_score ASC), '[]'::jsonb) INTO v_topics
  FROM public.topic_retention
  WHERE class_id = p_class_id;

  -- Most-missed questions in the window (>= 3 responses to avoid noise)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.error_rate DESC), '[]'::jsonb)
  INTO v_missed
  FROM (
    SELECT
      r.question_index,
      s.deck_id,
      s.topic,
      COUNT(*)::int AS total_responses,
      SUM(CASE WHEN NOT r.is_correct THEN 1 ELSE 0 END)::int AS incorrect_count,
      ROUND(
        (SUM(CASE WHEN NOT r.is_correct THEN 1 ELSE 0 END)::numeric
         / NULLIF(COUNT(*), 0)) * 100, 1
      ) AS error_rate
    FROM public.responses r
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND r.created_at >= v_from AND r.created_at <= v_to
    GROUP BY r.question_index, s.deck_id, s.topic
    HAVING COUNT(*) >= 3
    ORDER BY error_rate DESC NULLS LAST
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'from', v_from,
    'to', v_to,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'topic_mastery', v_topics,
    'most_missed', v_missed
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."class_analytics"(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."class_analytics"(uuid, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."class_analytics"(uuid, timestamptz, timestamptz) IS
  'Analytics Studio F0: per-class KPIs + topic mastery + most-missed over a window. SECURITY DEFINER + ownership guard. Used by ClassDetail (F1).';
```

- [ ] **Step 2: Self-verify ownership guard raises on non-owner.**

Use the **Grep tool** on the migration file with pattern `RAISE EXCEPTION 'not authorized'`. Expected: at least 1 match.

- [ ] **Step 3: Hand snippet to user.**

> "Migration 066 — class_analytics. Mismo patrón: CREATE OR REPLACE + REVOKE/GRANT. Aplica y avísame."

- [ ] **Step 4: After user confirms, commit.**

```bash
git add supabase/migrations/20240101000066_class_analytics_rpc.sql
git commit -m "feat(analytics): class_analytics RPC (F0)

Por-clase, sobre ventana de fechas. Devuelve KPIs (desde mv_class_daily)
+ topic_mastery snapshot + most-missed (>=3 respuestas, top 10 por
error rate). SECURITY DEFINER + RAISE 42501 si no eres dueño de la clase.
La consume ClassDetail en F1; en F0 queda lista y verificable por RPC.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: SQL Migration — `class_timeseries` RPC

**Files:**
- Create: `supabase/migrations/20240101000067_class_timeseries_rpc.sql`

Serie temporal sobre `mv_class_daily`. Metric: `pct_correct` (default) | `avg_time` | `participation`. **Nota:** `retention` como métrica de serie temporal requiere histórico que hoy no existe — se introduce en una fase posterior. En F0 se valida el parámetro pero se rechaza con un error claro si lo piden.

- [ ] **Step 1: Write the migration file.**

Write `supabase/migrations/20240101000067_class_timeseries_rpc.sql`:

```sql
-- ─── Analytics Studio F0 · class_timeseries RPC ───────────────────────
-- Serie temporal sobre mv_class_daily. Soporta granularidad day|week.
-- Metric: pct_correct | avg_time | participation.
-- 'retention' como serie temporal requiere histórico (no existe en F0)
-- y se rechaza con un mensaje claro hasta que F2/F3 lo agreguen.

CREATE OR REPLACE FUNCTION "public"."class_timeseries"(
  p_class_id uuid,
  p_metric text DEFAULT 'pct_correct',
  p_granularity text DEFAULT 'day',
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE(
  bucket date,
  value numeric,
  responses_total integer,
  unique_participants integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
  v_from timestamptz := COALESCE(p_from, now() - interval '90 days');
  v_to   timestamptz := COALESCE(p_to, now());
BEGIN
  IF p_granularity NOT IN ('day','week') THEN
    RAISE EXCEPTION 'invalid granularity (allowed: day, week)' USING ERRCODE = '22023';
  END IF;
  IF p_metric NOT IN ('pct_correct','avg_time','participation') THEN
    RAISE EXCEPTION 'invalid metric (allowed: pct_correct, avg_time, participation; retention TS llega en una fase posterior)' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH src AS (
    SELECT
      CASE WHEN p_granularity = 'week'
        THEN (date_trunc('week', day))::date
        ELSE day END AS bucket,
      SUM(responses_total)::int AS responses_total,
      SUM(responses_correct)::int AS responses_correct,
      SUM(points_sum)::int AS points_sum,
      SUM(max_points_sum)::int AS max_points_sum,
      AVG(avg_time_ms)::int AS avg_time_ms,
      SUM(unique_participants)::int AS unique_participants
    FROM public.mv_class_daily
    WHERE class_id = p_class_id
      AND day >= v_from::date AND day <= v_to::date
    GROUP BY 1
  )
  SELECT
    src.bucket,
    CASE p_metric
      WHEN 'pct_correct' THEN CASE
        WHEN src.max_points_sum > 0
          THEN ROUND((src.points_sum::numeric / src.max_points_sum::numeric) * 100, 1)
        ELSE NULL END
      WHEN 'avg_time'      THEN src.avg_time_ms::numeric
      WHEN 'participation' THEN src.unique_participants::numeric
    END AS value,
    src.responses_total,
    src.unique_participants
  FROM src
  ORDER BY src.bucket;
END;
$$;

REVOKE ALL ON FUNCTION "public"."class_timeseries"(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."class_timeseries"(uuid, text, text, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."class_timeseries"(uuid, text, text, timestamptz, timestamptz) IS
  'Analytics Studio F0: time-series of pct_correct/avg_time/participation per class. Reads mv_class_daily. SECURITY DEFINER + ownership guard.';
```

- [ ] **Step 2: Hand snippet to user; wait for confirmation.**

> "Migration 067 — class_timeseries. Lee mv_class_daily (creado en 064). Aplica y avísame."

- [ ] **Step 3: After user confirms, commit.**

```bash
git add supabase/migrations/20240101000067_class_timeseries_rpc.sql
git commit -m "feat(analytics): class_timeseries RPC (F0)

Serie temporal por clase sobre mv_class_daily, granularidad day|week,
metric pct_correct|avg_time|participation. SECURITY DEFINER + guard.
'retention' como serie temporal queda fuera (necesita histórico que
F2/F3 introduce) y se rechaza con 22023 claro.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: SQL Migration — pg_cron MV refresh schedule

**Files:**
- Create: `supabase/migrations/20240101000068_analytics_mv_cron.sql`

Refrescamos las MVs cada 30 min con `REFRESH MATERIALIZED VIEW CONCURRENTLY` (no bloquea lecturas). Precedente del cron en `cleanup_expired_scans()` (migration ~050).

- [ ] **Step 1: Write the migration file.**

Write `supabase/migrations/20240101000068_analytics_mv_cron.sql`:

```sql
-- ─── Analytics Studio F0 · pg_cron MV refresh ─────────────────────────
-- Refresca las MVs de Analytics cada 30 min sin bloquear lecturas.
-- Requiere pg_cron (asumido disponible — precedente: zombie sessions cron).

-- Limpia un schedule previo con el mismo nombre por si esta migration
-- se re-aplica (idempotente).
SELECT cron.unschedule('analytics_mv_refresh')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'analytics_mv_refresh'
);

-- Programa el job. CONCURRENTLY requiere el UNIQUE INDEX en cada MV
-- (creados en migration 064).
SELECT cron.schedule(
  'analytics_mv_refresh',
  '*/30 * * * *',
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_class_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_class_topic_weekly;
  $$
);
```

- [ ] **Step 2: Hand snippet to user.**

> "Migration 068 — cron para refrescar las MVs cada 30 min. Aplica y avísame. Si tu plan de Supabase no tiene pg_cron, dímelo y lo manejamos con un endpoint Vercel cron (lo mismo, otro disparador)."

- [ ] **Step 3: After user confirms, commit.**

```bash
git add supabase/migrations/20240101000068_analytics_mv_cron.sql
git commit -m "feat(analytics): pg_cron refresh job for analytics MVs (F0)

REFRESH MATERIALIZED VIEW CONCURRENTLY cada 30 min sobre las dos MVs
de analytics. Idempotente: limpia el schedule previo si existe. Mismo
patrón que el cron de zombie sessions / cleanup_expired_scans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: React Query hooks (3 hooks)

**Files:**
- Create: `src/hooks/useAnalyticsOverview.js`
- Create: `src/hooks/useClassAnalytics.js`
- Create: `src/hooks/useClassTimeseries.js`

Wrappers thin sobre `supabase.rpc()`. Mismo patrón que `useDecks`/`useClasses`/etc.

- [ ] **Step 1: Write `useAnalyticsOverview.js`.**

```js
// src/hooks/useAnalyticsOverview.js
//
// F0 Analytics Studio: cross-class snapshot del docente autenticado.
// Reemplaza el N+1 de useDirector (que en task 9 se refactoriza para
// delegar acá). Mismo patrón RQ que useDecks/useClasses.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const ANALYTICS_OVERVIEW_KEY = ["analytics", "overview"];

async function fetchAnalyticsOverview() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc("analytics_overview");
  if (error) throw error;
  return data || [];
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ANALYTICS_OVERVIEW_KEY,
    queryFn: fetchAnalyticsOverview,
  });
}
```

- [ ] **Step 2: Write `useClassAnalytics.js`.**

```js
// src/hooks/useClassAnalytics.js
//
// F0 Analytics Studio: KPIs + topic mastery + most-missed para una clase
// sobre una ventana de fechas. Consumido por ClassDetail en F1.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const classAnalyticsKey = (classId, from, to) =>
  ["analytics", "class", classId, from || null, to || null];

async function fetchClassAnalytics(classId, from, to) {
  const { data, error } = await supabase.rpc("class_analytics", {
    p_class_id: classId,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data;
}

export function useClassAnalytics(classId, { from, to } = {}) {
  return useQuery({
    queryKey: classAnalyticsKey(classId, from, to),
    enabled: !!classId,
    queryFn: () => fetchClassAnalytics(classId, from, to),
  });
}
```

- [ ] **Step 3: Write `useClassTimeseries.js`.**

```js
// src/hooks/useClassTimeseries.js
//
// F0 Analytics Studio: serie temporal pct_correct|avg_time|participation
// por clase, granularidad day|week, ventana de fechas. Consumido por
// TrendPanel en F1.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const classTimeseriesKey = (classId, metric, granularity, from, to) =>
  ["analytics", "class", classId, "timeseries", metric, granularity, from || null, to || null];

async function fetchClassTimeseries(classId, metric, granularity, from, to) {
  const { data, error } = await supabase.rpc("class_timeseries", {
    p_class_id: classId,
    p_metric: metric,
    p_granularity: granularity,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data || [];
}

export function useClassTimeseries(
  classId,
  { metric = "pct_correct", granularity = "day", from, to } = {},
) {
  return useQuery({
    queryKey: classTimeseriesKey(classId, metric, granularity, from, to),
    enabled: !!classId,
    queryFn: () => fetchClassTimeseries(classId, metric, granularity, from, to),
  });
}
```

- [ ] **Step 4: Run gates.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: all green. Lint clean (no unused imports), typecheck 0 errors, all tests pass (the new hooks have no direct tests in F0 — they're thin wrappers, integration-tested via Director.jsx in task 9), build succeeds.

- [ ] **Step 5: Commit.**

```bash
git add src/hooks/useAnalyticsOverview.js src/hooks/useClassAnalytics.js src/hooks/useClassTimeseries.js
git commit -m "feat(analytics): React Query hooks for the F0 RPCs

- useAnalyticsOverview  → analytics_overview()  (cross-class snapshot)
- useClassAnalytics    → class_analytics(...)   (per-clase KPIs)
- useClassTimeseries   → class_timeseries(...)  (serie temporal)

Wrappers thin sobre supabase.rpc(), mismo patrón que useDecks/useClasses.
Sin tests directos: son wrappers de 1 línea; la cobertura real es la
integración con Director (task 9) + el smoke del usuario.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Refactor `useDirector.js` to use `analytics_overview` (kills the N+1)

**Files:**
- Modify: `src/hooks/useDirector.js`

El hook viejo hace 4-6 queries por clase secuencialmente. Lo refactorizamos para hacer UNA llamada a `analytics_overview` y mapear el resultado a la misma forma que ya consume `Director.jsx` (`classes`, `retentionData`, `studentData`, `sessionCounts`, `memberCounts`). Cero cambios en `Director.jsx` en este task.

- [ ] **Step 1: Replace the file body.**

Overwrite `src/hooks/useDirector.js`:

```js
// PR 170 (M1) → F0 Analytics Studio (2026-05-28):
// Reemplazado el for-loop N+1 (4-6 queries por clase) por una sola
// llamada a la RPC analytics_overview. Misma forma de retorno
// (classes, retentionData, studentData, sessionCounts, memberCounts)
// para que Director.jsx no cambie.
//
// El hook nuevo y "limpio" es useAnalyticsOverview (mismo dato, forma
// nativa). Cuando F1 reescriba el Director como ClassDetail, useDirector
// se retira; este shim solo existe para mantener la página vieja viva
// durante la transición.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const DIRECTOR_KEY = ["director"];

function adaptRowsToDirectorShape(rows) {
  const classes = rows.map((r) => ({
    id: r.class_id,
    teacher_id: null, // Director no lo usa; lo dejamos null para no traerlo.
    name: r.class_name,
    grade: r.class_grade,
    subject: r.class_subject,
    class_code: r.class_code,
    // created_at no es necesario para Director; lo dejamos undefined.
  }));

  const retentionData = {};
  const studentData = {};
  const sessionCounts = {};
  const memberCounts = {};

  for (const r of rows) {
    // getClassRetentionOverview devolvía { topics: [...] }; replicamos.
    retentionData[r.class_id] = { topics: r.topics_snapshot || [] };
    studentData[r.class_id] = r.students_snapshot || [];
    sessionCounts[r.class_id] = r.session_count || 0;
    // memberCounts en el código viejo era max(class_members, unique_participants).
    memberCounts[r.class_id] = Math.max(r.member_count || 0, r.unique_students || 0);
  }

  return { classes, retentionData, studentData, sessionCounts, memberCounts };
}

async function fetchDirector() {
  const empty = {
    classes: [],
    retentionData: {},
    studentData: {},
    sessionCounts: {},
    memberCounts: {},
  };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data, error } = await supabase.rpc("analytics_overview");
  if (error) throw error;
  return adaptRowsToDirectorShape(data || []);
}

export function useDirector() {
  return useQuery({ queryKey: DIRECTOR_KEY, queryFn: fetchDirector });
}
```

- [ ] **Step 2: Verify no other consumers break.**

Use the **Grep tool** in `src/` with pattern `getClassRetentionOverview|getStudentProgress` (glob `*.{js,jsx,ts,tsx}`). Expected: still imports/definitions in `src/lib/spaced-repetition.ts` and any unrelated consumers. `src/hooks/useDirector.js` should NO longer appear in the results — that's the point. Other code that uses these functions stays untouched.

- [ ] **Step 3: Run gates.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: all green. The spaced-repetition tests still pass (we didn't touch the lib, just stopped importing two of its functions in this hook).

- [ ] **Step 4: User smoke (manual).**

Tell the user:

> "Hook refactored. Loguéate como `pedro@hola.com` en local, ve a /school (Director). Debe cargar igual que antes pero en una sola request a Supabase (mírala en Network → fetch único `analytics_overview` en vez del loop). Reporta cualquier regresión visible."

This is a user-driven check (we can't login from the harness — see `memory/project_current_state.md`).

- [ ] **Step 5: Commit.**

```bash
git add src/hooks/useDirector.js
git commit -m "perf(analytics): kill the N+1 in useDirector via analytics_overview RPC (F0)

useDirector ahora hace UNA llamada (analytics_overview) en vez de
4-6 queries por clase. La forma de retorno se preserva con un
adapter — Director.jsx no cambia. Para una clase con N alumnos y
M sesiones, eliminamos N+M+const round-trips.

Esta es la 'visible win' de F0 según el spec
(docs/superpowers/specs/2026-05-28-analytics-studio-design.md §9).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `StudioShell` + `PeriodChips`

**Files:**
- Create: `src/components/analytics/StudioShell.jsx`
- Create: `src/components/analytics/PeriodChips.jsx`
- Create: `src/components/analytics/index.ts`

`StudioShell` es un wrapper que renderiza la sub-navegación (7 items, en F0 solo "Resumen" está activo) y la toolbar persistente (period chips + slot para compare/export — vacíos en F0). El contenido de la vista se inyecta como children.

- [ ] **Step 1: Write `PeriodChips.jsx`.**

```jsx
// src/components/analytics/PeriodChips.jsx
//
// F0 Analytics Studio: chips de período al estilo Semrush (7d / 30d / 90d / Custom).
// Controlado por el padre via { value, onChange }. value es 'd7'|'d30'|'d90'|'custom'.
//
// Custom abre un date-range picker en una fase posterior (F4 cuando se
// active el toggle Comparar con períodos arbitrarios). En F0 solo dispara
// onChange('custom') y el padre puede ignorarlo.

import React from "react";

const PERIODS = [
  { id: "d7", label: "7d" },
  { id: "d30", label: "30d" },
  { id: "d90", label: "90d" },
  { id: "custom", label: "Custom" },
];

export default function PeriodChips({ value = "d30", onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Rango de período"
      style={{
        display: "inline-flex",
        gap: 4,
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        padding: 3,
      }}
    >
      {PERIODS.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(p.id)}
            style={{
              padding: "4px 11px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              background: active ? "#2563eb" : "transparent",
              color: active ? "#fff" : "inherit",
              border: "none",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
```

(Note: F1 will replace these inline styles with `tokens/` so the chip matches the rest of the system. F0 keeps it inline to ship the shell quickly. The values match the Semrush mockup approved in brainstorm.)

- [ ] **Step 2: Write `StudioShell.jsx`.**

```jsx
// src/components/analytics/StudioShell.jsx
//
// F0 Analytics Studio: el shell de la sección.
// - Sub-navegación de 7 items (solo "Resumen" navegable en F0; los demás
//   muestran "Próximamente — F1+" disabled).
// - Toolbar persistente arriba: title + PeriodChips + (slots vacíos
//   para Compare/Export que F4/F7 llenan).
// - El contenido de la vista se pasa por children.
//
// En F0 se monta envolviendo Director.jsx (la vista Resumen). En F1+ las
// otras vistas (ClassDetail, etc.) usarán el mismo shell con view="class"|...

import React, { useState } from "react";
import PeriodChips from "./PeriodChips";

const NAV_ITEMS = [
  { id: "overview", label: "Resumen", enabled: true },
  { id: "class", label: "Clase", enabled: false },
  { id: "student", label: "Estudiante", enabled: false },
  { id: "topics", label: "Temas", enabled: false },
  { id: "live", label: "En vivo", enabled: false },
  { id: "reports", label: "Reportes", enabled: false },
  { id: "ask", label: "Analista Cleo", enabled: false },
];

export default function StudioShell({
  view = "overview",
  title = "Analytics",
  period = "d30",
  onPeriodChange,
  children,
}) {
  const [internalPeriod, setInternalPeriod] = useState(period);
  const effectivePeriod = onPeriodChange ? period : internalPeriod;
  const handlePeriod = onPeriodChange || setInternalPeriod;

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      {/* Sub-navegación lateral */}
      <nav
        aria-label="Analytics Studio"
        style={{
          flex: "0 0 168px",
          padding: "16px 0",
          borderRight: "1px solid #e4e4e7",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            padding: "0 16px 12px",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            opacity: 0.55,
          }}
        >
          Analytics
        </div>
        {NAV_ITEMS.map((item) => {
          const active = item.id === view;
          return (
            <div
              key={item.id}
              aria-disabled={!item.enabled}
              title={item.enabled ? "" : "Próximamente — F1+"}
              style={{
                padding: "8px 16px",
                fontWeight: active ? 600 : 400,
                color: !item.enabled ? "#a1a1aa" : active ? "#2563eb" : "inherit",
                background: active ? "#eff6ff" : "transparent",
                borderLeft: active ? "3px solid #2563eb" : "3px solid transparent",
                cursor: item.enabled ? "pointer" : "not-allowed",
                fontSize: 14,
              }}
            >
              {item.label}
              {!item.enabled && (
                <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>· pronto</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Contenido + toolbar */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderBottom: "1px solid #e4e4e7",
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h1>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <PeriodChips value={effectivePeriod} onChange={handlePeriod} />
            {/* Compare + Export viven acá en F4/F7 */}
          </div>
        </header>
        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the barrel.**

```ts
// src/components/analytics/index.ts
// Public surface de los bloques del Analytics Studio.
// F0: solo el shell + PeriodChips. F1+ agrega KpiBand, CleoStrip, TrendPanel, etc.

export { default as StudioShell } from "./StudioShell";
export { default as PeriodChips } from "./PeriodChips";
```

- [ ] **Step 4: Lint + typecheck + build.**

```bash
npm run lint && npm run typecheck && npm run build
```

Expected: all green. No new warnings.

- [ ] **Step 5: Commit.**

```bash
git add src/components/analytics/
git commit -m "feat(analytics): StudioShell + PeriodChips (F0)

El shell de Analytics Studio: sub-nav de 7 items (en F0 solo Resumen
activo; los demás muestran 'Próximamente — F1+' disabled) + toolbar
persistente con PeriodChips estilo Semrush (7d/30d/90d/Custom).

Los slots de Compare/Export quedan vacíos a propósito — F4/F7 los
llenan. Estilos inline por velocidad de F0; F1 los migra a tokens/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Charts barrel

**Files:**
- Create: `src/components/charts/index.ts`

Scaffolding mínimo: re-exporta los 2 charts que ya existen (`RetentionDonut`, `RetentionBars`) para que el resto del Studio importe desde `components/charts` y no desde el path completo. Los charts nuevos (TrendBarChart, Donut, HorizontalBarList, SparklineCell, MasteryHeatmap, DistributionBars) llegan en F1+.

- [ ] **Step 1: Write the barrel.**

```ts
// src/components/charts/index.ts
//
// Library pública de gráficos para Analytics Studio. Todos los charts
// nuevos del Studio se exportan acá; los consumidores importan desde
// 'src/components/charts' (no desde el path completo del archivo).
//
// F0: re-exporta los 2 existentes (RetentionDonut, RetentionBars).
// F1+ agrega: TrendBarChart (bar + forecast band + compare overlay),
// Donut (primitivo genérico), HorizontalBarList, SparklineCell,
// MasteryHeatmap, DistributionBars.

export { default as RetentionDonut } from "./RetentionDonut";
export { default as RetentionBars } from "./RetentionBars";
```

- [ ] **Step 2: Verify the imports compile.**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit.**

```bash
git add src/components/charts/index.ts
git commit -m "feat(analytics): charts/ barrel — scaffolding F0

Re-exporta RetentionDonut + RetentionBars (los 2 que ya existían).
F1+ agrega TrendBarChart, Donut, HorizontalBarList, SparklineCell,
MasteryHeatmap, DistributionBars. Centraliza el path de import.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Wire `StudioShell` into `Director.jsx`

**Files:**
- Modify: `src/pages/Director.jsx`

Solo envolvemos el contenido actual con `<StudioShell view="overview">`. Sin cambiar la UI interna del Director (eso llega en F1 cuando se reescriba como ClassDetail). El `PageHeader` actual de Director se mantiene; el `StudioShell` añade el sidebar + la toolbar por encima.

- [ ] **Step 1: Read the current top of Director.jsx to find the return root.**

Use the **Read tool** on `src/pages/Director.jsx` (limit 80 lines is enough). Note where the top-level `return (` of the `Director` component starts and what its outermost JSX element is (typically a `<div>` or fragment).

- [ ] **Step 2: Add the import.**

Add to the import block at the top of `src/pages/Director.jsx`:

```jsx
import { StudioShell } from "../components/analytics";
```

- [ ] **Step 3: Wrap the return.**

Find the outermost JSX returned by the `Director` component and wrap it with `<StudioShell view="overview" title="Analytics">…</StudioShell>`. Example shape:

```jsx
// BEFORE
return (
  <div style={{ ... }}>
    {/* existing Director content (PageHeader, tabs, etc.) */}
  </div>
);

// AFTER
return (
  <StudioShell view="overview" title="Analytics">
    <div style={{ ... }}>
      {/* existing Director content unchanged */}
    </div>
  </StudioShell>
);
```

Do NOT remove or rename anything inside — just add the wrapper.

- [ ] **Step 4: Run gates + verify visually (manual).**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: all green.

Tell the user:

> "Listo el wiring. Loguéate y abre /school. Deberías ver: a la izquierda la sub-nav (Resumen activo; los demás items en gris con 'pronto'), arriba a la derecha los chips 7d/30d/90d/Custom, y el contenido del Director igual que antes adentro. Reporta cualquier rotura."

- [ ] **Step 5: Commit.**

```bash
git add src/pages/Director.jsx
git commit -m "feat(analytics): wrap Director in StudioShell (F0 win visible)

Director (vista Resumen del Studio) ya vive dentro del shell:
sub-nav lateral + toolbar con PeriodChips. El contenido interno
queda igual; F1 lo reescribe como ClassDetail y vacía Director.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Final gates + handoff

- [ ] **Step 1: Run the full gate.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: all green.

- [ ] **Step 2: Sanity-check the migration list.**

```bash
ls supabase/migrations/2024010100006*.sql
```

Expected: 5 new files (064-068).

- [ ] **Step 3: Sanity-check the new src tree.**

Use the **Glob tool** with pattern `{src/lib/analytics/**,src/components/analytics/**,src/components/charts/index.ts,src/hooks/useAnalyticsOverview.js,src/hooks/useClassAnalytics.js,src/hooks/useClassTimeseries.js}`. Expected: the 7 new files (metrics.ts, metrics.test.ts, lib/analytics/index.ts, StudioShell.jsx, PeriodChips.jsx, components/analytics/index.ts, charts/index.ts) + 3 hooks. The lib/analytics/__tests__/.gitkeep can be removed at this point if it still exists (it served its purpose to make the dir trackable before the test file existed).

- [ ] **Step 4: Optionally remove the .gitkeep.**

```bash
[ -f src/lib/analytics/__tests__/.gitkeep ] && rm src/lib/analytics/__tests__/.gitkeep && git add -u src/lib/analytics/__tests__/
[ -n "$(git status --porcelain src/lib/analytics/__tests__/.gitkeep)" ] && git commit -m "chore: drop .gitkeep now that metrics.test.ts exists

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Confirm git log.**

```bash
git log --oneline -15
```

Expected: 10-11 new commits on top of `d5d9df0` (the spec commit), covering:
1. scaffold src/lib/analytics
2. metrics.ts + tests
3. MV migration
4. analytics_overview RPC
5. class_analytics RPC
6. class_timeseries RPC
7. pg_cron migration
8. RQ hooks
9. useDirector refactor (kills N+1)
10. StudioShell + PeriodChips
11. charts barrel
12. wire StudioShell into Director
(13. drop .gitkeep — optional)

- [ ] **Step 6: Ask the user how to proceed with the PR.**

Options to offer the user:

> "F0 listo en el branch claude/vigorous-chaum-c056f3. Tres caminos:
> a) Abrir UN PR con todos los commits (`feat(analytics): F0 — backend motor + studio shell`).
> b) Dos PRs: uno solo de migraciones SQL (064-068) + el RPC kill del N+1 (commits SQL + task 9), y otro con UI (shell + hooks + wiring).
> c) Quedarte con los commits en este branch y mergear directo a main como en los PRs #42-60 recientes.
> ¿Cuál prefieres?"

Wait for the user's choice; do NOT open a PR unsolicited (per `memory/project_prs_workflow.md` and the harness rule about not pushing unprompted).

---

## Spec Coverage Self-Review

Mapping spec §9 (F0 line) to tasks:

| Spec requirement | Task |
|------------------|------|
| `mv_class_daily` + `mv_class_topic_weekly` | Task 3 |
| `analytics_overview` RPC + guard | Task 4 |
| `class_analytics` RPC + guard | Task 5 |
| `class_timeseries` RPC + guard | Task 6 |
| pg_cron refresh | Task 7 |
| React Query hooks for each | Task 8 |
| `src/lib/analytics/metrics.ts` (pure + tested) | Tasks 1-2 |
| `StudioShell` (sub-nav + toolbar with period chips) | Task 10 |
| Scaffolding `src/components/charts/` | Task 11 |
| **Win:** kills N+1, Resumen in 1 call | Task 9 (refactor) + Task 12 (visible wiring) |

All F0 spec items are covered.

## Open notes

- **`retention` as a time-series metric is rejected by `class_timeseries`** in F0 with a clear error. The spec promises this in `class_timeseries`; a later phase (F2 or F3) introduces a retention history mechanism (snapshot trigger on `topic_retention` updates, or a new `mv_retention_history`) and adds the branch.
- **No Cypress / Playwright authed e2e in F0** — covered by the existing `pedro@hola.com` manual smoke per `memory/project_current_state.md`. F1 may add a public-route harness for the chart components.
- **`supabase/schema.sql` sync:** the user re-dumps after applying all 5 migrations. The dump is not gating for the PR.
- **CHANGES_TO_PLAN.md update:** force-tracked under the otherwise-gitignored `PRs/`. If the user decides to track F0 there, add `PRs/CHANGES_TO_PLAN.md` to a follow-up `docs(prs)` commit (separate from the feature commits) per `memory/project_prs_workflow.md`.
