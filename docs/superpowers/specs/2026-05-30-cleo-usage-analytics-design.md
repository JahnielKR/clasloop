# "Tu uso de Cleo" — teacher-facing AI usage analytics

**Date:** 2026-05-30
**Type:** feature (Analytics Studio new section)
**Status:** approved (design) → implementing

## Goal

Surface the `ai_generations` "gold" (instrumented in Área 4, PR #85) to the
teacher as a Studio section: **how am I using Cleo, and how good is its raw
output for me?** Metrics: acceptance rate, % edited, time-to-publish, and the
mix of question types / models / input types.

## Placement (decided)

A new **navigable Studio section** at `/school/cleo`, rendered inside
`StudioShell` (`view="cleo"`, title "Tu uso de Cleo") with the standard
`PeriodChips`. It inherits the Semrush rhythm and lives where analytics live.

## Data path

A teacher can already read their own rows directly — `ai_generations` RLS:
`"Teachers read own generations" ... using (auth.uid() = teacher_id)`. So **no
new RPC / migration**: a client-side `select` returns only the current teacher's
rows. We fetch the small columns only (never the big `output_raw/output_final`
jsonb):

```
id, created_at, activity_type, model_used, input_type,
num_questions, accepted_count, edited_count, regenerated_count, time_to_publish_ms
```

- **Hook** `src/hooks/useCleoUsage.js` — React Query, key
  `["analytics","cleoUsage", from, to]`, `gte/lte created_at`, `limit 1000`,
  `order created_at desc`. Thin: fetch only.
- **Pure lib** `src/lib/analytics/cleo-usage.ts` — `summarizeCleoUsage(rows)`
  (unit-tested, no Supabase/React). The page memoizes both the date range
  (`useMemo(() => periodToRange(period), [period])` — the render-loop lesson
  from today's bug fixes) and the summary.

## Metrics (definitions)

Gold is captured per row as `accepted_count` (questions used verbatim) +
`edited_count` (reworded, Jaccard ≥ 0.5) + discarded; see `api/_lib/ai-gold.js`.
A row "has gold" when `accepted_count != null` (capture started 2026-05-30; older
rows are null and are excluded from the gold rates but still counted in volume).

- **Generaciones totales** = `rows.length`.
- **Tasa de aceptación** = `acceptedTotal / (acceptedTotal + editedTotal)` over
  gold rows; `null` when the denominator is 0.
- **% editado** = `editedTotal / (acceptedTotal + editedTotal)`; `null` likewise.
- **Time-to-publish (mediana)** = median of `time_to_publish_ms` where non-null.
- **Distribuciones** (counts, desc, over all rows): por tipo de pregunta
  (`activity_type`), por modelo (`model_used`, prettified — trailing date
  segment dropped), por tipo de entrada (`input_type`).

## UI

`src/pages/analytics/CleoUsage.jsx`, rendered in `StudioShell`:

- **KPI band** — 4 × `StatCardWithSparkline` + `AnimatedNumber` count-up:
  Generaciones · Tasa de aceptación · % editado · Time-to-publish. The three
  gold KPIs show `—` + a "aún no hay datos suficientes" hint when `goldCount === 0`
  (mirrors `AdminAIStats`' `filterRate === null` pattern — graceful while data is thin).
- **Distribuciones** — three compact bar lists (local `DistList`, same visual as
  `AdminAIStats`' `DistTable`).
- **States** — `StudioSkeleton` while loading; an error box on failure; an empty
  state ("Aún no has generado nada con Cleo en este período") when `totalGenerations === 0`.

No charts beyond sparkline-less stat cards + bars (YAGNI; matches the admin tool's "numbers and bars" choice).

## Wiring

- `src/routes.ts`: `ROUTES.ANALYTICS_CLEO`, `ROUTE_PATTERNS.ANALYTICS_CLEO`,
  `buildRoute.analyticsCleo()` (all `"/school/cleo"`); `pathToPage` maps it to
  `"analyticsCleo"` (before the `/school` equality); add `"analyticsCleo"` to
  `TEACHER_ONLY_PAGES`.
- `src/App.jsx`: lazy-import `CleoUsage`, add `analyticsCleo: CleoUsage` to
  `COMPONENTS`, add `"analyticsCleo"` to `COMPACT_PAGES`.
- `src/components/analytics/StudioShell.jsx`: add navigable
  `{ id: "cleo", label: "Tu uso de Cleo", route: buildRoute.analyticsCleo() }`.

## Testing & verification

- **Unit** (vitest, TDD): `cleo-usage.test.ts` — acceptance/edit rate math,
  null-when-no-gold, median (even/odd/empty), distribution sort, model prettify.
- **Seed** (verification only, via MCP, idempotent, scoped to pedro): a handful
  of `ai_generations` rows with realistic gold so the view renders with data;
  then a logged-in smoke check (Playwright) of `/school/cleo`.
- **Gate**: `npm install` · lint · typecheck · `test:run` · build.

## Risk

Low. No schema change, no new server code; reads behind existing RLS. Worst case
the view is empty (handled). The only app-wide touch is additive route/nav wiring.
