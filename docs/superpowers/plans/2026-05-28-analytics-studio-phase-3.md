# Analytics Studio — Fase 3 (Temas + Conceptos Errados) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship la página **TopicMastery** en `/school/topics/:classId` — la primera vista del Studio que cruza el dato a nivel de **TEMA** con detección automática de **conceptos errados** leyendo `responses.answer` distribution. Click en un tema desde la matriz expande su detalle abajo (tendencia semanal + preguntas más falladas + panel de misconceptions con la opción correcta destacada).

**Architecture:** Nueva RPC `topic_detail` (SECURITY DEFINER) consolida KPIs del tema + serie temporal semanal (lee `mv_class_topic_weekly` de F0) + por-pregunta agregado con `answer_distribution` + el `question` jsonb del deck (con `correct` index para el MCQ highlight). Reusa `TrendBarChart`, `HorizontalBarList`, `StudioShell`, `formatters` de F0/F1.

**Tech Stack:** Supabase (Postgres), React 18, `@tanstack/react-query` v5, `recharts`, vitest. **Una migración SQL nueva** (070).

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §5 (matriz de dominio + misconceptions), §6.2 (RPCs), §9 (F3 row).

**Branch:** `claude/analytics-studio-f3` (off F2 tip `dd02148`). Stacked PR triple: base = F2 branch.

**Depends on:** F0 (mv_class_topic_weekly, deck_question_stats), F1 (TrendBarChart, HorizontalBarList, StudioShell, formatters), F2 (routing pattern, App.jsx pattern). Migration 069 (F2) debe estar aplicada antes de aplicar 070.

---

## Pre-task: File Structure

**Create (7 files):**

```
supabase/migrations/
  20240101000070_topic_detail_rpc.sql          # NEW: topic_detail RPC

src/hooks/
  useTopicDetail.js                             # NEW: RQ wrapper

src/components/analytics/
  TopicMatrix.jsx                               # NEW: heatmap-style grid de temas
  TopicTrendPanel.jsx                           # NEW: TrendBarChart wrapper para tema
  MisconceptionPanel.jsx                        # NEW: por-pregunta + answer_distribution con MCQ correct highlight

src/pages/analytics/
  TopicMastery.jsx                              # NEW: /school/topics/:classId

src/lib/analytics/
  misconceptions.ts                             # NEW: pure helpers para decodear answer_distribution
  __tests__/misconceptions.test.ts              # NEW
```

**Modify (5 files):**

```
src/routes.ts                                   # +ROUTE_PATTERNS.ANALYTICS_TOPICS, +buildRoute, +pathToPage, +TEACHER_ONLY_PAGES
src/components/analytics/StudioShell.jsx        # 'topics' enabled when view === 'topics'
src/components/analytics/index.ts               # +barrel exports
src/App.jsx                                     # +lazy import + COMPONENTS map + COMPACT_PAGES
src/pages/analytics/ClassDetail.jsx             # TopicBarListPanel onTopicClick → /school/topics/:classId?topic=...
src/lib/analytics/index.ts                      # +export from misconceptions
```

**Out of scope for F3 (explicit):**
- CompareToggle wiring (F4), forecast/Cleo predictivo (F5), Live (F6), Reports/Export (F7).
- Misconception highlight para tipos que no sean MCQ/TF (Match/Order/Fill quedan mostrando solo la distribution sin highlight).
- "Generar repaso del tema" — stub "pronto · F5" como en F1/F2 (close-unit-ai es unit-scoped).
- TopicMatrix como heatmap topic × week — F3 usa matriz simple (1 celda por tema con color por retención). El cross axis time queda para una iteración posterior.

---

## Task 1: SQL Migration — `topic_detail` RPC

**Files:**
- Create: `supabase/migrations/20240101000070_topic_detail_rpc.sql`

KPIs + serie semanal (de mv_class_topic_weekly) + por-pregunta con answer_distribution y el `question` jsonb del deck (para que MisconceptionPanel sepa cuál es el correcto). Todo en una llamada.

- [ ] **Step 1: Write the migration file.**

Write `supabase/migrations/20240101000070_topic_detail_rpc.sql`:

```sql
-- ─── Analytics Studio F3 · topic_detail RPC ───────────────────────────
-- Payload del Topic Mastery view en UNA llamada:
--   - KPIs del tema (responses_total/correct, pct_correct, avg_time, unique_students)
--   - Tendencia semanal (sobre mv_class_topic_weekly de F0)
--   - Top-N preguntas más falladas del tema con answer_distribution +
--     el `question` jsonb del deck (para que MisconceptionPanel highlight
--     la opción correcta en MCQ/TF).
-- SECURITY DEFINER + ownership guard. Mismo patrón que class_analytics
-- (066), class_timeseries (067), student_detail (069).

CREATE OR REPLACE FUNCTION "public"."topic_detail"(
  p_class_id uuid,
  p_topic text,
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
  v_from timestamptz := COALESCE(p_from, now() - interval '90 days');
  v_to   timestamptz := COALESCE(p_to, now());
  v_kpis jsonb;
  v_weekly jsonb;
  v_questions jsonb;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- KPIs del tema sobre la ventana
  SELECT jsonb_build_object(
    'responses_total', COALESCE(COUNT(*), 0),
    'responses_correct', COALESCE(SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END), 0),
    'pct_correct', CASE
      WHEN COALESCE(SUM(r.max_points), 0) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
      ELSE NULL END,
    'avg_time_ms', COALESCE(ROUND(AVG(r.time_taken_ms))::int, 0),
    'unique_students', COUNT(DISTINCT sp.student_name)
  ) INTO v_kpis
  FROM public.responses r
  JOIN public.sessions s ON s.id = r.session_id
  LEFT JOIN public.session_participants sp ON sp.id = r.participant_id
  WHERE s.class_id = p_class_id
    AND s.topic = p_topic
    AND r.created_at >= v_from AND r.created_at <= v_to;

  -- Tendencia semanal — lee mv_class_topic_weekly (F0 migración 064).
  SELECT COALESCE(jsonb_agg(t ORDER BY t.bucket), '[]'::jsonb) INTO v_weekly
  FROM (
    SELECT
      week AS bucket,
      responses_total,
      responses_correct,
      CASE WHEN max_points_sum > 0
        THEN ROUND((points_sum::numeric / max_points_sum::numeric) * 100, 1)
        ELSE NULL END AS value
    FROM public.mv_class_topic_weekly
    WHERE class_id = p_class_id
      AND topic = p_topic
      AND week >= v_from::date AND week <= v_to::date
  ) t;

  -- Por-pregunta agregado con answer_distribution + el question jsonb del deck.
  WITH src AS (
    SELECT s.deck_id, r.question_index, r.is_correct, r.points, r.max_points, r.answer
    FROM public.responses r
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND s.topic = p_topic
      AND r.created_at >= v_from AND r.created_at <= v_to
  ),
  base AS (
    SELECT
      deck_id,
      question_index,
      COUNT(*)::int AS total_responses,
      SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int AS correct_count,
      SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END)::int AS incorrect_count,
      CASE WHEN COUNT(*) > 0
        THEN ROUND((SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1)
        ELSE NULL END AS error_rate
    FROM src
    GROUP BY deck_id, question_index
    HAVING COUNT(*) >= 2
  ),
  dist AS (
    SELECT deck_id, question_index, jsonb_object_agg(answer_key, cnt) AS answer_distribution
    FROM (
      SELECT
        deck_id,
        question_index,
        CASE
          WHEN answer IS NULL THEN 'null'
          WHEN jsonb_typeof(answer) = 'string' THEN trim('"' from answer::text)
          ELSE answer::text
        END AS answer_key,
        COUNT(*) AS cnt
      FROM src
      GROUP BY deck_id, question_index, answer_key
    ) sub
    GROUP BY deck_id, question_index
  )
  SELECT COALESCE(jsonb_agg(q ORDER BY q.error_rate DESC NULLS LAST), '[]'::jsonb)
  INTO v_questions
  FROM (
    SELECT
      b.deck_id,
      b.question_index,
      b.total_responses,
      b.correct_count,
      b.incorrect_count,
      b.error_rate,
      COALESCE(d.answer_distribution, '{}'::jsonb) AS answer_distribution,
      (dk.questions->b.question_index) AS question
    FROM base b
    LEFT JOIN dist d USING (deck_id, question_index)
    LEFT JOIN public.decks dk ON dk.id = b.deck_id
    ORDER BY b.error_rate DESC NULLS LAST
    LIMIT 15
  ) q;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'topic', p_topic,
    'from', v_from,
    'to', v_to,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'weekly_trend', v_weekly,
    'questions', v_questions
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."topic_detail"(uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."topic_detail"(uuid, text, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."topic_detail"(uuid, text, timestamptz, timestamptz) IS
  'Analytics Studio F3: Topic Mastery payload (KPIs + weekly trend + top-N misses con answer_distribution + question jsonb) en UNA llamada. SECURITY DEFINER + ownership guard.';
```

- [ ] **Step 2: Safety self-check.**

Use the **Grep tool** on the migration file with pattern `^\s*(DROP|DELETE|UPDATE|TRUNCATE|ALTER TABLE)`. Expected: 0 matches. Confirm `RAISE EXCEPTION 'not authorized'` present.

- [ ] **Step 3: Hand snippet to user.**

> "Listo migration 070 — `topic_detail` RPC. Copia entera al SQL editor y ejecuta. `CREATE OR REPLACE FUNCTION` + `REVOKE/GRANT`, no toca datos. Avísame cuando esté aplicada."

- [ ] **Step 4: After user confirms, commit.**

```bash
git add supabase/migrations/20240101000070_topic_detail_rpc.sql
git commit -m "feat(analytics): topic_detail RPC (F3)

Payload del Topic Mastery view en UNA llamada: KPIs + tendencia
semanal (de mv_class_topic_weekly) + top-15 preguntas más falladas
con answer_distribution + el question jsonb del deck. Permite que
MisconceptionPanel resalte la opción correcta en MCQ/TF.

SECURITY DEFINER + RAISE 42501 si no eres dueño.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: TDD — `misconceptions.ts` pure helpers

**Files:**
- Test: `src/lib/analytics/__tests__/misconceptions.test.ts`
- Create: `src/lib/analytics/misconceptions.ts`

Helpers puros que decodean `answer_distribution` y deciden, para una pregunta MCQ/TF, cuál es la "wrong-answer-más-popular" (la misconception clave). Aislados así MisconceptionPanel solo renderiza; la lógica es testeable sin React.

- [ ] **Step 1: Write the failing test.**

Write `src/lib/analytics/__tests__/misconceptions.test.ts`:

```ts
/* @vitest-environment node */
// Pure misconception helpers for Analytics Studio F3.

import { describe, it, expect } from "vitest";
import {
  correctKeyForMcq,
  correctKeyForTf,
  pickTopMisconception,
  decorateDistribution,
} from "../misconceptions";

describe("correctKeyForMcq", () => {
  it("returns the index as a string when correct is a number", () => {
    expect(correctKeyForMcq({ type: "mcq", correct: 2 })).toBe("2");
  });
  it("returns the first correct when multi (array)", () => {
    expect(correctKeyForMcq({ type: "mcq", correct: [1, 3] })).toBe("1");
  });
  it("returns null on non-mcq or missing", () => {
    expect(correctKeyForMcq(null)).toBeNull();
    expect(correctKeyForMcq({ type: "tf", correct: true })).toBeNull();
    expect(correctKeyForMcq({ type: "mcq" })).toBeNull();
  });
});

describe("correctKeyForTf", () => {
  it("returns 'true'/'false' as strings", () => {
    expect(correctKeyForTf({ type: "tf", correct: true })).toBe("true");
    expect(correctKeyForTf({ type: "tf", correct: false })).toBe("false");
  });
  it("returns null on non-tf", () => {
    expect(correctKeyForTf({ type: "mcq", correct: 0 })).toBeNull();
    expect(correctKeyForTf(null)).toBeNull();
  });
});

describe("pickTopMisconception", () => {
  it("returns the key with highest count that ISN'T the correct key", () => {
    const dist = { "0": 3, "1": 8, "2": 5 };
    expect(pickTopMisconception(dist, "1")).toEqual({ key: "2", count: 5 });
  });
  it("returns null when only the correct key has counts", () => {
    const dist = { "0": 10 };
    expect(pickTopMisconception(dist, "0")).toBeNull();
  });
  it("returns null when correctKey is null (we can't tell what's wrong)", () => {
    expect(pickTopMisconception({ "0": 3 }, null)).toBeNull();
  });
  it("handles empty distribution", () => {
    expect(pickTopMisconception({}, "1")).toBeNull();
  });
});

describe("decorateDistribution", () => {
  it("returns sorted entries with `isCorrect` flag", () => {
    const dist = { "0": 3, "1": 8, "2": 5 };
    const decorated = decorateDistribution(dist, "1");
    expect(decorated).toEqual([
      { key: "1", count: 8, isCorrect: true },
      { key: "2", count: 5, isCorrect: false },
      { key: "0", count: 3, isCorrect: false },
    ]);
  });
  it("flags none as correct when correctKey is null", () => {
    const decorated = decorateDistribution({ "0": 3, "1": 8 }, null);
    expect(decorated.every((e) => !e.isCorrect)).toBe(true);
  });
  it("empty input returns empty array", () => {
    expect(decorateDistribution({}, "1")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run; expect red.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: vitest fails to resolve `../misconceptions`.

- [ ] **Step 3: Implement `misconceptions.ts`.**

```ts
// ─── src/lib/analytics/misconceptions.ts ──────────────────────────────
// Pure helpers para decodear answer_distribution y resaltar la opción
// correcta + identificar la "wrong-answer más popular" en MCQ/TF.
// Sin React, sin Supabase. Tested en __tests__/misconceptions.test.ts.

export interface QuestionLike {
  type?: string;
  correct?: number | number[] | boolean | string | null;
}

export type DistributionEntry = {
  key: string;
  count: number;
  isCorrect: boolean;
};

/**
 * Correct key string for an MCQ question.
 * MCQ shape: { type:'mcq', correct: number | number[] }.
 * For multi-correct returns the first correct as a string ("the canonical").
 */
export function correctKeyForMcq(q: QuestionLike | null | undefined): string | null {
  if (!q || q.type !== "mcq") return null;
  const c = q.correct;
  if (typeof c === "number") return String(c);
  if (Array.isArray(c) && c.length > 0 && typeof c[0] === "number") return String(c[0]);
  return null;
}

/**
 * Correct key string for a true/false question.
 * TF shape: { type:'tf', correct: boolean }.
 * Returns 'true' / 'false' (lowercase string).
 */
export function correctKeyForTf(q: QuestionLike | null | undefined): string | null {
  if (!q || q.type !== "tf") return null;
  if (q.correct === true) return "true";
  if (q.correct === false) return "false";
  return null;
}

/**
 * Highest-count answer key that ISN'T the correct one.
 * Returns null when:
 *   - correctKey is null (can't tell what's wrong without it)
 *   - distribution is empty
 *   - only the correct key has counts (no misconception to highlight)
 */
export function pickTopMisconception(
  distribution: Record<string, number> | null | undefined,
  correctKey: string | null,
): { key: string; count: number } | null {
  if (!correctKey || !distribution) return null;
  let top: { key: string; count: number } | null = null;
  for (const [k, v] of Object.entries(distribution)) {
    if (k === correctKey) continue;
    const count = Number(v) || 0;
    if (count <= 0) continue;
    if (!top || count > top.count) top = { key: k, count };
  }
  return top;
}

/**
 * Sorted entries (DESC by count) with `isCorrect` flag.
 * Stable and easy to render as a bar list.
 */
export function decorateDistribution(
  distribution: Record<string, number> | null | undefined,
  correctKey: string | null,
): DistributionEntry[] {
  if (!distribution) return [];
  return Object.entries(distribution)
    .map(([key, count]) => ({
      key,
      count: Number(count) || 0,
      isCorrect: correctKey != null && key === correctKey,
    }))
    .sort((a, b) => b.count - a.count);
}
```

- [ ] **Step 4: Run tests; expect green.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: 13 metrics + 12 formatters + ~13 misconceptions tests = ≥38 passing.

- [ ] **Step 5: Re-export from barrel.**

Add to `src/lib/analytics/index.ts`:

```ts
export * from "./misconceptions";
```

- [ ] **Step 6: Commit.**

```bash
git add src/lib/analytics/misconceptions.ts src/lib/analytics/__tests__/misconceptions.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): misconceptions.ts — pure helpers for MCQ/TF misconception detection (F3)

correctKeyForMcq / correctKeyForTf / pickTopMisconception /
decorateDistribution. Aislan la lógica de 'cuál es el correcto' y
'cuál es el wrong-answer más popular' para que MisconceptionPanel
solo renderice. ~13 unit tests, mismo patrón que metrics + formatters.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `useTopicDetail` hook

**Files:**
- Create: `src/hooks/useTopicDetail.js`

- [ ] **Step 1: Write the hook.**

```js
// src/hooks/useTopicDetail.js
//
// F3 Analytics Studio: payload del Topic Mastery view (un tema concreto).
// Una llamada → KPIs + tendencia semanal + top-15 preguntas falladas con
// answer_distribution + el question jsonb del deck (para MisconceptionPanel).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const topicDetailKey = (classId, topic, from, to) =>
  ["analytics", "topic", classId, topic, from || null, to || null];

async function fetchTopicDetail(classId, topic, from, to) {
  const { data, error } = await supabase.rpc("topic_detail", {
    p_class_id: classId,
    p_topic: topic,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data;
}

export function useTopicDetail(classId, topic, { from, to } = {}) {
  return useQuery({
    queryKey: topicDetailKey(classId, topic, from, to),
    enabled: !!classId && !!topic,
    queryFn: () => fetchTopicDetail(classId, topic, from, to),
  });
}
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/hooks/useTopicDetail.js
git commit -m "feat(analytics): useTopicDetail hook (F3)

Wrapper thin sobre supabase.rpc('topic_detail'). Cache key incluye
classId + topic + ventana, así cambiar de tema o período invalida limpio.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Routing — `/school/topics/:classId`

**Files:**
- Modify: `src/routes.ts`
- Modify: `src/components/analytics/StudioShell.jsx`

- [ ] **Step 1: Add route pattern.**

Read `src/routes.ts`. Add to `buildRoute` (near `analyticsStudent`):

```ts
analyticsTopics: (classId: string) => `/school/topics/${enc(classId)}`,
```

Add to `ROUTE_PATTERNS` (after `ANALYTICS_STUDENT`):

```ts
ANALYTICS_TOPICS: "/school/topics/:classId",
```

Add to `pathToPage` (BEFORE the `/school/student/...` line — order is most-specific first, but `topics` is a sibling not deeper, so add it next to `analyticsStudentProfile`):

```ts
if (/^\/school\/topics\/[^/]+\/?$/.test(pathname)) return "analyticsTopicMastery";
```

Add to `TEACHER_ONLY_PAGES`:

```ts
"analyticsTopicMastery", // F3
```

- [ ] **Step 2: Update StudioShell for `view='topics'`.**

Extend the `items` computation in `src/components/analytics/StudioShell.jsx`:

```jsx
const items = NAV_ITEMS.map((item) => ({
  ...item,
  enabled:
    item.staticEnabled ||
    (item.id === "class" && view === "class") ||
    (item.id === "student" && view === "student") ||
    (item.id === "topics" && view === "topics"),
}));
```

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/routes.ts src/components/analytics/StudioShell.jsx
git commit -m "feat(analytics): route /school/topics/:classId + StudioShell view='topics' (F3)

ROUTE_PATTERNS.ANALYTICS_TOPICS + buildRoute.analyticsTopics +
pathToPage + TEACHER_ONLY_PAGES gate. StudioShell 'Temas' destaca
cuando view='topics'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: TopicMastery page skeleton + App.jsx wiring

**Files:**
- Create: `src/pages/analytics/TopicMastery.jsx`
- Modify: `src/App.jsx`

La página tiene un estado interno `selectedTopic` que viene del query param `?topic=` (cuando aterrizamos desde ClassDetail) o se setea al hacer click en la matriz. Re-uses `useClassAnalytics` para la lista de temas (topic_mastery), y `useTopicDetail` cuando hay tema seleccionado.

- [ ] **Step 1: Write the page skeleton.**

```jsx
// src/pages/analytics/TopicMastery.jsx
//
// F3 Analytics Studio: Topic Mastery page — matriz de temas + drill al
// detalle del tema (tendencia semanal + más falladas + misconceptions).

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import { useClassAnalytics } from "../../hooks/useClassAnalytics";
import { useTopicDetail } from "../../hooks/useTopicDetail";
import { ROUTES } from "../../routes";

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  switch (period) {
    case "d7":
      return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
    case "d30":
      return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
    case "custom":
      return { from: null, to: null };
    case "d90":
    default:
      return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
  }
}

export default function TopicMastery() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const match = /^\/school\/topics\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;

  const [period, setPeriod] = useState("d90");
  const { from, to } = periodToRange(period);

  const initialTopic = searchParams.get("topic") || null;
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);

  const classQ = useClassAnalytics(classId, { from, to });
  const topicQ = useTopicDetail(classId, selectedTopic, { from, to });

  useEffect(() => {
    if (!classId) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, navigate]);

  // Sync selectedTopic <-> URL (?topic=...) so deep links work.
  useEffect(() => {
    const current = searchParams.get("topic") || null;
    if (selectedTopic !== current) {
      const next = new URLSearchParams(searchParams);
      if (selectedTopic) next.set("topic", selectedTopic);
      else next.delete("topic");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic]);

  if (!classId) return null;

  const topics = classQ.data?.topic_mastery ?? [];
  const detail = topicQ.data;
  const loading = classQ.isPending;

  return (
    <StudioShell view="topics" title="Temas" period={period} onPeriodChange={setPeriod}>
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
        {classQ.error && (
          <div role="alert" style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
            Error: {String(classQ.error.message || classQ.error)}
          </div>
        )}

        {loading && topics.length === 0 ? (
          <div style={{ opacity: 0.55, fontSize: 14 }}>Cargando temas…</div>
        ) : (
          <>
            <div data-block="TopicMatrix" data-selected={selectedTopic ?? ""} />
            {selectedTopic && (
              <>
                <div data-block="TopicTrendPanel" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div data-block="MisconceptionPanel" />
                  <div data-block="QuestionsList" />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </StudioShell>
  );
}
```

- [ ] **Step 2: Wire into App.jsx.**

Follow F1/F2 pattern. Add:

```jsx
const importTopicMastery = () => import('./pages/analytics/TopicMastery');
// …
const TopicMastery = lazy(importTopicMastery);
// …
// Append to COMPONENTS map: analyticsTopicMastery: TopicMastery
// Append to COMPACT_PAGES: "analyticsTopicMastery"
```

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/pages/analytics/TopicMastery.jsx src/App.jsx
git commit -m "feat(analytics): TopicMastery page skeleton (F3)

Página esqueleto en /school/topics/:classId. Carga la lista de temas
via useClassAnalytics (reuse), y on-demand el detalle del tema
seleccionado via useTopicDetail. selectedTopic ↔ ?topic= URL
(soporta deep links + click desde ClassDetail). Slots de bloques
para tasks 6-8.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `TopicMatrix` component

**Files:**
- Create: `src/components/analytics/TopicMatrix.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/TopicMastery.jsx`

Grid de celdas, una por tema. Color tier-based (green/yellow/red por retention). Click selecciona. Tema activo se destaca con borde.

- [ ] **Step 1: Write `TopicMatrix.jsx`.**

```jsx
// src/components/analytics/TopicMatrix.jsx
//
// F3 Analytics Studio: matriz de dominio por tema (Class Detail vista
// expandida). Grid de celdas, una por tema. Color por tier de retención.
// Click selecciona; tema seleccionado se destaca con borde.
//
// Props:
//   topics: [{ topic, retention_score, ... }] — de class_analytics.topic_mastery
//   selectedTopic: string | null
//   onSelect: (topic: string) => void

function tierColor(score) {
  if (score >= 70) return { bg: "#dcfce7", color: "#15803d", label: "fuerte" };
  if (score >= 40) return { bg: "#fef3c7", color: "#854d0e", label: "flojo" };
  return { bg: "#fee2e2", color: "#b91c1c", label: "crítico" };
}

export default function TopicMatrix({ topics = [], selectedTopic = null, onSelect }) {
  if (topics.length === 0) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16, opacity: 0.55, fontSize: 14 }}>
        Sin temas registrados todavía.
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>Matriz de dominio</b>
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          {topics.length} {topics.length === 1 ? "tema" : "temas"} · click selecciona
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {topics.map((t) => {
          const score = Math.round(Number(t.retention_score) || 0);
          const tier = tierColor(score);
          const active = t.topic === selectedTopic;
          return (
            <button
              key={t.topic}
              onClick={() => onSelect?.(t.topic)}
              aria-pressed={active}
              style={{
                background: tier.bg,
                color: tier.color,
                border: active ? "2px solid #2563eb" : "1px solid transparent",
                borderRadius: 8,
                padding: "10px 12px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1.3,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.topic}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>{score}%</span>
                <span style={{ opacity: 0.7 }}>{tier.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into TopicMastery.**

Add import + replace `<div data-block="TopicMatrix" ... />`:

```jsx
import TopicMatrix from "../../components/analytics/TopicMatrix";
// …
<TopicMatrix
  topics={topics}
  selectedTopic={selectedTopic}
  onSelect={(t) => setSelectedTopic(t === selectedTopic ? null : t)}
/>
```

(Click on the active topic deselects — toggle behavior.)

- [ ] **Step 3: Barrel + gates + commit.**

```bash
git add src/components/analytics/TopicMatrix.jsx src/components/analytics/index.ts src/pages/analytics/TopicMastery.jsx
git commit -m "feat(analytics): TopicMatrix — heatmap-style topic grid (F3)

Grid de celdas (auto-fill 140px), una por tema, coloreadas por tier
de retención (green/yellow/red). Click selecciona; active = borde
azul. Click en el active deselecciona (toggle). Tier labels
mostrados (fuerte/flojo/crítico).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `TopicTrendPanel`

**Files:**
- Create: `src/components/analytics/TopicTrendPanel.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/TopicMastery.jsx`

Bar chart semanal del % correcto en el tema (de `topic_detail.weekly_trend`). Reusa `TrendBarChart`.

- [ ] **Step 1: Write `TopicTrendPanel.jsx`.**

```jsx
// src/components/analytics/TopicTrendPanel.jsx
//
// F3 Analytics Studio: tendencia semanal del tema seleccionado en
// TopicMastery. Reusa TrendBarChart sobre topic_detail.weekly_trend.

import { TrendBarChart } from "../charts";
import { formatPercent } from "../../lib/analytics/formatters";

export default function TopicTrendPanel({ topic, data = [], loading = false }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        padding: 12,
        margin: "10px 0",
      }}
    >
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}>
        <b>Tendencia semanal · {topic}</b>
        <span style={{ marginLeft: "auto", opacity: 0.65, fontSize: 11 }}>
          % correcto · pronóstico/comparar en F4-F5
        </span>
      </div>
      {loading ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>Cargando…</div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Sin datos semanales para este tema en la ventana.
        </div>
      ) : (
        <TrendBarChart
          data={data}
          yLabel="% correcto"
          yFormatter={(v) => formatPercent(v)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into TopicMastery.**

Add import + replace `<div data-block="TopicTrendPanel" />`:

```jsx
import TopicTrendPanel from "../../components/analytics/TopicTrendPanel";
// …
<TopicTrendPanel
  topic={selectedTopic}
  data={detail?.weekly_trend ?? []}
  loading={topicQ.isPending && !detail}
/>
```

- [ ] **Step 3: Barrel + gates + commit.**

```bash
git add src/components/analytics/TopicTrendPanel.jsx src/components/analytics/index.ts src/pages/analytics/TopicMastery.jsx
git commit -m "feat(analytics): TopicTrendPanel — weekly % correct for a topic (F3)

Bar chart semanal del % correcto en el tema seleccionado. Reusa
TrendBarChart sobre topic_detail.weekly_trend (lee mv_class_topic_weekly).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `MisconceptionPanel` + `QuestionsList`

**Files:**
- Create: `src/components/analytics/MisconceptionPanel.jsx`
- Create: `src/components/analytics/TopicQuestionsList.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/TopicMastery.jsx`

`MisconceptionPanel` agarra la pregunta más fallada (top de `topic_detail.questions`) y muestra su `answer_distribution` como barras horizontales, resaltando la opción correcta y marcando claramente la "wrong-answer-más-popular" — el concepto errado clave. Sirve para que el docente vea de un vistazo qué confusión está atrapando a la clase.

`TopicQuestionsList` muestra las otras N-1 preguntas falladas como lista (click → DeckResults).

- [ ] **Step 1: Write `MisconceptionPanel.jsx`.**

```jsx
// src/components/analytics/MisconceptionPanel.jsx
//
// F3 Analytics Studio: panel de concepto errado. Toma la pregunta TOP
// (más fallada) del tema y muestra su answer_distribution con la opción
// CORRECTA resaltada en verde y la opción WRONG-más-popular marcada como
// "misconception". Permite que el docente vea visualmente la confusión
// dominante.
//
// Props:
//   question: la primera entry de topic_detail.questions
//     (incluye answer_distribution, question (jsonb del deck), error_rate, etc.)
//   onDrillDeck: (deckId) => void

import {
  correctKeyForMcq,
  correctKeyForTf,
  pickTopMisconception,
  decorateDistribution,
} from "../../lib/analytics/misconceptions";

function correctKeyFor(q) {
  if (!q) return null;
  return correctKeyForMcq(q) || correctKeyForTf(q);
}

function optionLabel(q, key) {
  if (!q) return key;
  // MCQ: key is the index, label is q.options[index]
  if (q.type === "mcq" && Array.isArray(q.options)) {
    const idx = Number(key);
    if (Number.isInteger(idx) && q.options[idx] != null) {
      return q.options[idx] || `Opción ${idx + 1}`;
    }
  }
  // TF: "true"/"false" → "Verdadero"/"Falso"
  if (q.type === "tf") {
    if (key === "true") return "Verdadero";
    if (key === "false") return "Falso";
  }
  return key;
}

export default function MisconceptionPanel({ question, onDrillDeck }) {
  if (!question) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Concepto errado</div>
        <div style={{ opacity: 0.45, fontSize: 13 }}>Sin pregunta destacada en este tema.</div>
      </div>
    );
  }

  const q = question.question; // the deck's question jsonb
  const correctKey = correctKeyFor(q);
  const entries = decorateDistribution(question.answer_distribution || {}, correctKey);
  const topMis = pickTopMisconception(question.answer_distribution || {}, correctKey);
  const totalCount = entries.reduce((s, e) => s + e.count, 0) || 1;

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <b style={{ fontSize: 13 }}>Concepto errado · pregunta más fallada</b>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
          {Math.round(question.error_rate)}% err
        </span>
      </div>
      <div style={{ fontSize: 13, marginBottom: 10, color: "#111" }}>
        {q?.q || `P. ${question.question_index + 1}`}
      </div>
      {topMis && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 6,
            padding: "6px 9px",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          <b>Misconception dominante:</b> "{optionLabel(q, topMis.key)}" — elegida {topMis.count}{" "}
          {topMis.count === 1 ? "vez" : "veces"} ({Math.round((topMis.count / totalCount) * 100)}% del total).
        </div>
      )}
      <div style={{ fontSize: 12, lineHeight: 1.7 }}>
        {entries.map((e) => {
          const pct = Math.round((e.count / totalCount) * 100);
          const isWrongTop = topMis && e.key === topMis.key;
          return (
            <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
              <span style={{ flex: "0 0 130px", color: e.isCorrect ? "#15803d" : isWrongTop ? "#b91c1c" : "#111" }}>
                {optionLabel(q, e.key)}
                {e.isCorrect && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>✓ correcta</span>}
              </span>
              <span aria-hidden style={{ flex: 1, height: 6, background: "#f4f4f5", borderRadius: 3, overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${pct}%`,
                    background: e.isCorrect ? "#16a34a" : isWrongTop ? "#dc2626" : "#94a3b8",
                    borderRadius: 3,
                  }}
                />
              </span>
              <span style={{ flex: "0 0 60px", textAlign: "right", fontWeight: 600 }}>
                {e.count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
      {question.deck_id && (
        <button
          onClick={() => onDrillDeck?.(question.deck_id)}
          style={{
            marginTop: 10,
            border: "1px solid #2563eb",
            color: "#2563eb",
            background: "transparent",
            padding: "2px 9px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Ver pregunta en DeckResults
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `TopicQuestionsList.jsx`.**

```jsx
// src/components/analytics/TopicQuestionsList.jsx
//
// F3 Analytics Studio: lista compacta de las preguntas falladas del tema
// (las que no son la TOP — esa la come MisconceptionPanel). Click → DeckResults.

export default function TopicQuestionsList({ questions = [], onItemClick }) {
  // El primer item ya lo muestra MisconceptionPanel.
  const rest = questions.slice(1, 8);

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Otras preguntas falladas
      </div>
      {rest.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>
          Sin preguntas adicionales con error en esta ventana.
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
          {rest.map((it, i) => (
            <div
              key={`${it.deck_id}-${it.question_index}`}
              onClick={onItemClick ? () => onItemClick(it) : undefined}
              style={{
                borderBottom: i < rest.length - 1 ? "1px solid #f4f4f5" : "none",
                padding: "3px 0",
                cursor: onItemClick ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.question?.q || `P. ${it.question_index + 1}`}
              </span>
              <b style={{ color: it.error_rate >= 60 ? "#dc2626" : it.error_rate >= 40 ? "#eab308" : "#16a34a" }}>
                {Math.round(it.error_rate)}% err
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into TopicMastery.**

Add imports + replace the 2-col placeholders:

```jsx
import MisconceptionPanel from "../../components/analytics/MisconceptionPanel";
import TopicQuestionsList from "../../components/analytics/TopicQuestionsList";
import { buildRoute } from "../../routes";

// …

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
  <MisconceptionPanel
    question={(detail?.questions ?? [])[0]}
    onDrillDeck={(deckId) => navigate(buildRoute.deckResults(deckId))}
  />
  <TopicQuestionsList
    questions={detail?.questions ?? []}
    onItemClick={(it) => {
      if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
    }}
  />
</div>
```

- [ ] **Step 4: Barrel + gates + commit.**

```bash
git add src/components/analytics/MisconceptionPanel.jsx src/components/analytics/TopicQuestionsList.jsx src/components/analytics/index.ts src/pages/analytics/TopicMastery.jsx
git commit -m "feat(analytics): MisconceptionPanel + TopicQuestionsList (F3)

MisconceptionPanel: pregunta TOP del tema con su answer_distribution
como barras horizontales. Opción correcta resaltada en verde con ✓;
'wrong-answer más popular' marcada como concepto errado dominante
(banner naranja + barra roja). Reusa MCQ/TF correct-key logic de
src/lib/analytics/misconceptions.ts. Click → DeckResults.

TopicQuestionsList: las otras N-1 preguntas falladas como lista
compacta (top-7), click → DeckResults.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Wire ClassDetail TopicBarListPanel → TopicMastery + Final gates + PR

**Files:**
- Modify: `src/pages/analytics/ClassDetail.jsx`

- [ ] **Step 1: Add navigation from TopicBarListPanel.**

In `src/pages/analytics/ClassDetail.jsx`, the 2 `<TopicBarListPanel />` lines currently don't pass `onTopicClick`. Add it so click on a topic bar navigates to TopicMastery with that topic preselected:

```jsx
<TopicBarListPanel
  variant="dominated"
  topicMastery={a?.topic_mastery ?? []}
  onTopicClick={(item) =>
    navigate(`${buildRoute.analyticsTopics(classId)}?topic=${encodeURIComponent(item.label)}`)
  }
/>
<TopicBarListPanel
  variant="critical"
  topicMastery={a?.topic_mastery ?? []}
  onTopicClick={(item) =>
    navigate(`${buildRoute.analyticsTopics(classId)}?topic=${encodeURIComponent(item.label)}`)
  }
/>
```

- [ ] **Step 2: Final gates.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

- [ ] **Step 3: Dispatch final code review subagent.**

Diff range: `<F2-tip>..HEAD`. Focus areas:
- `topic_detail` RPC security (auth.uid() guard, scope by class_id AND topic).
- `misconceptions.ts` math: correctKeyForMcq with multi-array, decorateDistribution sort stability.
- MisconceptionPanel: correct labeling of MCQ option index, TF true/false.
- `pathToPage` ordering for `/school/topics/*`.
- ClassDetail TopicBarListPanel click target uses encoded topic.

- [ ] **Step 4: Fix any 🟥/🟧 + push + open PR.**

```bash
git push -u origin claude/analytics-studio-f3
gh pr create --base claude/analytics-studio-f2 --head claude/analytics-studio-f3 \
  --title "feat(analytics): Analytics Studio F3 — Topics + Misconceptions" \
  --body "$(cat <<'EOF'
## Summary

Fase 3 de Analytics Studio: la página **TopicMastery** en \`/school/topics/:classId\`. La matriz de dominio por tema (heatmap de celdas) + click selecciona un tema → tendencia semanal + **detección automática de conceptos errados** leyendo \`responses.answer\` distribution.

> 🔗 **Stacked PR cuádruple:** base = F2 branch (#65). Cadena F0→F1→F2→F3.

- 🗄️ **Migración 070:** \`topic_detail\` RPC — KPIs + weekly trend (lee mv_class_topic_weekly de F0) + top-15 preguntas con answer_distribution + el \`question\` jsonb del deck.
- 🪝 **Hook:** \`useTopicDetail\`.
- 🧮 **\`misconceptions.ts\`** puro + 13 unit tests — \`correctKeyForMcq\` / \`correctKeyForTf\` / \`pickTopMisconception\` / \`decorateDistribution\`.
- 📐 **Página completa:**
  - **TopicMatrix** — grid auto-fill de temas, color por tier de retención (verde/amarillo/rojo), click selecciona (toggle), ?topic= en URL para deep-link.
  - **TopicTrendPanel** — bar chart semanal del % correcto en el tema (reusa TrendBarChart).
  - **MisconceptionPanel** — la JOYA: pregunta TOP del tema con su answer_distribution como barras horizontales, opción correcta en verde con ✓, wrong-más-popular marcada como concepto errado dominante en banner naranja. Click → DeckResults.
  - **TopicQuestionsList** — las otras 7 preguntas falladas del tema, click → DeckResults.
- 🔗 **Drill:** ClassDetail TopicBarListPanel (Top dominados + críticos) → \`/school/topics/:classId?topic=<topic>\`.

## Spec compliance

| Spec §9 F3 deliverable | Estado |
|------------------------|--------|
| Matriz de dominio a escala | ✅ TopicMatrix |
| Tendencia por tema | ✅ TopicTrendPanel |
| Detección de conceptos errados leyendo \`responses.answer\` | ✅ MisconceptionPanel |

## What's NOT here (diferido)

- TopicMatrix como heatmap topic × week — F3 usa matriz simple (1 celda por tema).
- Misconception highlight para Match/Order/Fill — F3 cubre MCQ y TF (los más comunes). Otros tipos muestran distribution sin highlight.
- "Generar repaso del tema" — stub a la F5.

## Test plan

- [ ] Aplicar migración 070 en Supabase.
- [ ] Login → /school → click clase → click en una barra de \"Top temas dominados/críticos\" → URL \`/school/topics/<classId>?topic=<topic>\`.
- [ ] StudioShell muestra **'Temas'** activo.
- [ ] TopicMatrix renderiza todos los temas como celdas; el preseleccionado tiene borde azul.
- [ ] Click en otra celda cambia el detalle (TopicTrendPanel + MisconceptionPanel + TopicQuestionsList re-fetch).
- [ ] MisconceptionPanel: pregunta TOP visible, opción correcta verde con ✓, misconception banner si aplica.
- [ ] Click \"Ver pregunta en DeckResults\" → navega.
- [ ] Sin console errors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec Coverage Self-Review

| Spec F3 deliverable | Task |
|---------------------|------|
| topic_detail RPC | Task 1 |
| useTopicDetail hook | Task 3 |
| Routing /school/topics/:classId | Task 4 |
| TopicMastery page skeleton | Task 5 |
| TopicMatrix (heatmap-style) | Task 6 |
| TopicTrendPanel (weekly trend) | Task 7 |
| MisconceptionPanel + QuestionsList | Task 8 |
| Click drill from ClassDetail TopicBarListPanel | Task 9 |
| Pure misconceptions lib + tests | Task 2 |
| Final review + PR | Task 9 |

All §9 F3 items mapped.

## Open notes

- **Match/Order/Fill misconception highlight:** F3 cubre MCQ + TF. Otros tipos muestran distribution sin highlight (la lógica `correctKeyForMcq`/`correctKeyForTf` devuelve null, así `pickTopMisconception` también devuelve null, así no aparece el banner — sólo la distribución).
- **Heatmap topic × week:** versión rica (topic × week con color por % correcto) requiere un componente nuevo. F3 entrega la versión simple (1 celda por tema). Una iteración posterior puede cambiarlo si el usuario lo pide.
- **\"Generar repaso del tema\"** está fuera de scope — mismo motivo que F1/F2 (close-unit-ai unit-scoped). F5 lo cablea.
