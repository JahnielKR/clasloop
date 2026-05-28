# Analytics Studio — Fase 2 (Perfil de Estudiante) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the **StudentProfile page** at `/school/student/:classId/:studentRef` — la página que HOY NO EXISTE en Clasloop. Permite click en una fila del roster (F1) o en la lista de alumnos del Director y entra al perfil profundo del alumno: trayectoria, dominio por tema, historial por sesión, más falladas, vs media de clase.

**Architecture:** Una nueva RPC `student_detail` (SECURITY DEFINER + guard de dueño) consolida todo el payload en una llamada. El hook `useStudentDetail` la envuelve. La página reusa todos los bloques de F1 (KpiBand patron, TopicBarListPanel, MostMissedList) con un par de adaptadores nuevos para "más falladas del alumno" y "historial por sesión". RosterTable de F1 + lista de alumnos del Director quedan clickables al perfil.

**Tech Stack:** Supabase (Postgres), React 18, `@tanstack/react-query` v5, `recharts`, vitest. **Una migración SQL nueva** (069) — el usuario la aplica en prod (mismo patrón que F0).

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §3 (vista Estudiante), §6.2 (RPC `student_detail`), §9 (F2 row).

**Branch:** `claude/analytics-studio-f2` (off F1 tip `f94d848`). Stacked PR pattern (base = F1 branch).

**Depends on:** F0 RPCs/MVs (PR #63) + F1 components (PR #64). F2 reuses `TrendBarChart`, `TopicBarListPanel`, `MostMissedList` pattern (variant for student-scope), `SparklineCell`, `StudioShell`, `formatters.ts`.

---

## Pre-task: File Structure

**Create (8 files):**

```
supabase/migrations/
  20240101000069_student_detail_rpc.sql       # NEW: student_detail RPC

src/hooks/
  useStudentDetail.js                          # NEW: RQ wrapper

src/components/analytics/
  StudentKpiBand.jsx                           # NEW: 5 tiles, scope alumno
  TrajectoryPanel.jsx                          # NEW: TrendBarChart wrapper
  SessionHistoryTable.jsx                      # NEW: tabla de sesiones del alumno
  StudentMostFailedList.jsx                    # NEW: variant de MostMissedList

src/pages/analytics/
  StudentProfile.jsx                           # NEW: la página /school/student/:classId/:studentRef
```

**Modify (4 files):**

```
src/routes.ts                                  # +ROUTE_PATTERNS.ANALYTICS_STUDENT, +buildRoute, +pathToPage, +TEACHER_ONLY_PAGES
src/components/analytics/StudioShell.jsx       # 'student' enabled when view === 'student'
src/components/analytics/index.ts              # +barrel exports
src/App.jsx                                    # +lazy import + COMPONENTS map entry + COMPACT_PAGES
src/pages/analytics/ClassDetail.jsx            # RosterTable onRowClick → /school/student/:classId/:name
src/pages/Director.jsx                         # Students tab rows → student profile (best-effort: need classId per row)
```

**Out of scope for F2 (explicit):**
- Compare vs class avg as a toggleable mode (F4).
- Forecast + risk prediction (F5).
- Cleo narrativa real (F5 — el strip en F2 es placeholder).
- StudentMostFailedList "Generar repaso" → stub (mismo motivo que F1: close-unit-ai es unit-scoped).
- Drill desde Director "Students tab" si no hay un classId por fila accesible — si la lista del Director es cross-clase y no expone classId, queda diferido a F2.5 con una nota explícita.

---

## Task 1: SQL Migration — `student_detail` RPC

**Files:**
- Create: `supabase/migrations/20240101000069_student_detail_rpc.sql`

Consolida en UNA llamada todo lo que la página necesita: KPIs del alumno, trayectoria semanal, topic mastery, historial por sesión, top falladas, promedio de clase.

- [ ] **Step 1: Write the migration file.**

Write `supabase/migrations/20240101000069_student_detail_rpc.sql`:

```sql
-- ─── Analytics Studio F2 · student_detail RPC ─────────────────────────
-- Devuelve el payload completo del Perfil de Estudiante en UNA llamada.
-- Identifica al alumno por nombre (student_name) — `student_id` queda
-- como hint para F5+ (resolución dual). Guard: la clase debe ser del
-- docente autenticado. Mismo patrón que class_analytics (066).

CREATE OR REPLACE FUNCTION "public"."student_detail"(
  p_class_id uuid,
  p_student_ref text,
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
  v_trajectory jsonb;
  v_topics jsonb;
  v_sessions jsonb;
  v_failed jsonb;
  v_class_avg numeric;
BEGIN
  -- Ownership guard
  SELECT EXISTS(
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- KPIs del alumno sobre la ventana — agregamos responses joinead a
  -- session_participants donde el nombre coincide.
  SELECT jsonb_build_object(
    'responses_total', COALESCE(COUNT(*), 0),
    'responses_correct', COALESCE(SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END), 0),
    'pct_correct', CASE
      WHEN COALESCE(SUM(r.max_points), 0) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
      ELSE NULL END,
    'avg_time_ms', COALESCE(ROUND(AVG(r.time_taken_ms))::int, 0),
    'session_count', COUNT(DISTINCT r.session_id)
  ) INTO v_kpis
  FROM public.responses r
  JOIN public.session_participants sp ON sp.id = r.participant_id
  JOIN public.sessions s ON s.id = r.session_id
  WHERE s.class_id = p_class_id
    AND sp.student_name = p_student_ref
    AND r.created_at >= v_from AND r.created_at <= v_to;

  -- Trayectoria semanal: pct_correct por semana.
  SELECT COALESCE(jsonb_agg(t ORDER BY t.bucket), '[]'::jsonb) INTO v_trajectory
  FROM (
    SELECT
      (date_trunc('week', r.created_at))::date AS bucket,
      COUNT(*)::int AS responses_total,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
      CASE WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL END AS value
    FROM public.responses r
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND sp.student_name = p_student_ref
      AND r.created_at >= v_from AND r.created_at <= v_to
    GROUP BY (date_trunc('week', r.created_at))::date
  ) t;

  -- Dominio por tema del alumno (snapshot).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'topic', stp.topic,
    'retention_score', stp.retention_score,
    'total_questions', stp.total_questions,
    'correct_answers', stp.correct_answers,
    'last_reviewed_at', stp.last_reviewed_at
  ) ORDER BY stp.retention_score ASC), '[]'::jsonb) INTO v_topics
  FROM public.student_topic_progress stp
  WHERE stp.class_id = p_class_id
    AND stp.student_name = p_student_ref;

  -- Historial por sesión (top 20 más recientes).
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.session_completed_at DESC), '[]'::jsonb)
  INTO v_sessions
  FROM (
    SELECT
      s.id AS session_id,
      s.topic AS session_topic,
      s.deck_id,
      s.session_type,
      s.completed_at AS session_completed_at,
      sp.joined_at,
      sp.completed_at AS participant_completed_at,
      COUNT(r.id)::int AS responses_total,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)::int AS responses_correct,
      CASE WHEN SUM(r.max_points) > 0
        THEN ROUND((SUM(r.points)::numeric / SUM(r.max_points)::numeric) * 100, 1)
        ELSE NULL END AS pct_correct,
      COALESCE(ROUND(AVG(r.time_taken_ms))::int, 0) AS avg_time_ms
    FROM public.sessions s
    JOIN public.session_participants sp ON sp.session_id = s.id
    LEFT JOIN public.responses r ON r.participant_id = sp.id
    WHERE s.class_id = p_class_id
      AND sp.student_name = p_student_ref
      AND s.completed_at IS NOT NULL
      AND s.completed_at >= v_from AND s.completed_at <= v_to
    GROUP BY s.id, s.topic, s.deck_id, s.session_type, s.completed_at, sp.joined_at, sp.completed_at
    ORDER BY s.completed_at DESC
    LIMIT 20
  ) t;

  -- Más falladas del alumno (top 10 por error_rate, >= 2 intentos).
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.error_rate DESC), '[]'::jsonb)
  INTO v_failed
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
    JOIN public.session_participants sp ON sp.id = r.participant_id
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.class_id = p_class_id
      AND sp.student_name = p_student_ref
      AND r.created_at >= v_from AND r.created_at <= v_to
    GROUP BY r.question_index, s.deck_id, s.topic
    HAVING COUNT(*) >= 2
    ORDER BY error_rate DESC NULLS LAST
    LIMIT 10
  ) t;

  -- Promedio de retención de la clase entera (para comparar con la del alumno).
  SELECT AVG(stp.retention_score)::numeric INTO v_class_avg
  FROM public.student_topic_progress stp
  WHERE stp.class_id = p_class_id;

  RETURN jsonb_build_object(
    'class_id', p_class_id,
    'student_ref', p_student_ref,
    'from', v_from,
    'to', v_to,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'trajectory', v_trajectory,
    'topic_mastery', v_topics,
    'session_history', v_sessions,
    'most_failed', v_failed,
    'class_avg_retention', COALESCE(v_class_avg, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION "public"."student_detail"(uuid, text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."student_detail"(uuid, text, timestamptz, timestamptz) TO "authenticated";

COMMENT ON FUNCTION "public"."student_detail"(uuid, text, timestamptz, timestamptz) IS
  'Analytics Studio F2: Student profile payload (KPIs + trajectory + topic mastery + session history + most-failed + class avg) en UNA llamada. SECURITY DEFINER + ownership guard.';
```

- [ ] **Step 2: Safety self-check.**

Use the **Grep tool** on the migration file with pattern `^\s*(DROP|DELETE|UPDATE|TRUNCATE|ALTER TABLE)`. Expected: 0 matches. Also confirm `RAISE EXCEPTION 'not authorized'` is present.

- [ ] **Step 3: Hand snippet to user.**

> "Listo migration 069 — `student_detail` RPC. Copia entera al SQL editor de Supabase prod y ejecuta. Es `CREATE OR REPLACE FUNCTION` + `REVOKE/GRANT`, no toca datos. Avísame cuando esté aplicado."

Wait for user confirmation.

- [ ] **Step 4: After user confirms, commit.**

```bash
git add supabase/migrations/20240101000069_student_detail_rpc.sql
git commit -m "feat(analytics): student_detail RPC (F2)

Payload del Perfil de Estudiante en UNA llamada: KPIs + trayectoria
semanal + topic mastery + historial por sesión (top 20) + más falladas
(top 10, >=2 intentos) + class_avg_retention. SECURITY DEFINER +
RAISE 42501 si no eres dueño. Identidad del alumno: student_name
(student_id queda como hint para F5+).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `useStudentDetail` hook

**Files:**
- Create: `src/hooks/useStudentDetail.js`

- [ ] **Step 1: Write the hook.**

```js
// src/hooks/useStudentDetail.js
//
// F2 Analytics Studio: payload completo del Perfil de Estudiante.
// Una llamada → KPIs + trayectoria + topic mastery + historial por sesión
// + más falladas + class avg. Mismo patrón RQ que useClassAnalytics.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const studentDetailKey = (classId, studentRef, from, to) =>
  ["analytics", "student", classId, studentRef, from || null, to || null];

async function fetchStudentDetail(classId, studentRef, from, to) {
  const { data, error } = await supabase.rpc("student_detail", {
    p_class_id: classId,
    p_student_ref: studentRef,
    p_from: from || null,
    p_to: to || null,
  });
  if (error) throw error;
  return data;
}

export function useStudentDetail(classId, studentRef, { from, to } = {}) {
  return useQuery({
    queryKey: studentDetailKey(classId, studentRef, from, to),
    enabled: !!classId && !!studentRef,
    queryFn: () => fetchStudentDetail(classId, studentRef, from, to),
  });
}
```

- [ ] **Step 2: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/hooks/useStudentDetail.js
git commit -m "feat(analytics): useStudentDetail hook (F2)

Wrapper thin sobre supabase.rpc('student_detail'). Mismo patrón que
useClassAnalytics/useClassTimeseries. Cache key incluye classId +
studentRef + ventana, así cambiar de alumno o período invalida limpio.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Routing — `/school/student/:classId/:studentRef`

**Files:**
- Modify: `src/routes.ts`
- Modify: `src/components/analytics/StudioShell.jsx`

- [ ] **Step 1: Add route pattern.**

Read `src/routes.ts`. Add to `ROUTE_PATTERNS` (after `ANALYTICS_CLASS`):

```ts
ANALYTICS_STUDENT: "/school/student/:classId/:studentRef",
```

Add to `buildRoute` (after `analyticsClass`):

```ts
analyticsStudent: (classId: string, studentRef: string) =>
  `/school/student/${enc(classId)}/${enc(studentRef)}`,
```

Add to `pathToPage` (BEFORE the existing `/^\/school\/class\/[^/]+\/?$/` line — `/school/student/...` is more specific):

```ts
if (/^\/school\/student\/[^/]+\/[^/]+\/?$/.test(pathname)) return "analyticsStudentProfile";
```

Add `"analyticsStudentProfile"` to `TEACHER_ONLY_PAGES`:

```ts
const TEACHER_ONLY_PAGES = new Set([
  "sessions",
  "decks",
  "director",
  "analyticsClassDetail",
  "analyticsStudentProfile",  // F2
  "adminAIStats",
  "scan",
]);
```

- [ ] **Step 2: Update StudioShell for `view='student'`.**

Read `src/components/analytics/StudioShell.jsx`. The current `items` computation only handles `class`. Extend it to also enable `student`:

```jsx
const items = NAV_ITEMS.map((item) => ({
  ...item,
  enabled:
    item.staticEnabled ||
    (item.id === "class" && view === "class") ||
    (item.id === "student" && view === "student"),
}));
```

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/routes.ts src/components/analytics/StudioShell.jsx
git commit -m "feat(analytics): route /school/student/:classId/:studentRef + StudioShell view='student' (F2)

ROUTE_PATTERNS.ANALYTICS_STUDENT + buildRoute.analyticsStudent +
pathToPage('/school/student/:classId/:studentRef' → analyticsStudentProfile)
+ TEACHER_ONLY_PAGES gate.

StudioShell 'Estudiante' destaca cuando view='student' (mismo patrón
que 'Clase' de F1). Sub-nav nav-from-elsewhere queda diferida.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: StudentProfile page skeleton + App.jsx wiring

**Files:**
- Create: `src/pages/analytics/StudentProfile.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write the page skeleton.**

```jsx
// src/pages/analytics/StudentProfile.jsx
//
// F2 Analytics Studio: Student Profile page — la página que HOY NO existe.
// Ruta /school/student/:classId/:studentRef. Fetches via useStudentDetail.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import { useStudentDetail } from "../../hooks/useStudentDetail";
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

export default function StudentProfile() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const match = /^\/school\/student\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;
  const studentRef = match ? decodeURIComponent(match[2]) : null;

  const [period, setPeriod] = useState("d90");
  const { from, to } = periodToRange(period);

  const detailQ = useStudentDetail(classId, studentRef, { from, to });

  useEffect(() => {
    if (!classId || !studentRef) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, studentRef, navigate]);

  if (!classId || !studentRef) return null;

  const d = detailQ.data;
  const loading = detailQ.isPending;
  const error = detailQ.error;

  return (
    <StudioShell
      view="student"
      title={`Estudiante: ${studentRef}`}
      period={period}
      onPeriodChange={setPeriod}
    >
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
        {error && (
          <div
            role="alert"
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            Error cargando el perfil: {String(error.message || error)}
          </div>
        )}

        {loading && !d ? (
          <div style={{ opacity: 0.55, fontSize: 14 }}>Cargando perfil del estudiante…</div>
        ) : (
          <>
            {/* Bloques reales se enchufan en tasks 5-8. */}
            <div data-block="StudentKpiBand" />
            <div data-block="CleoStudentStrip" />
            <div data-block="TrajectoryPanel" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div data-block="TopicBarListPanel" data-variant="student-mastery" />
              <div data-block="StudentMostFailedList" />
            </div>
            <div data-block="SessionHistoryTable" />
          </>
        )}
      </div>
    </StudioShell>
  );
}
```

- [ ] **Step 2: Wire into App.jsx (lazy import + COMPONENTS map + COMPACT_PAGES).**

Follow the pattern of `ClassDetail` (already wired in F1). Add:

1. Near other lazy imports:
   ```jsx
   const importStudentProfile = () => import('./pages/analytics/StudentProfile');
   ```
2. Near other `lazy()` declarations:
   ```jsx
   const StudentProfile = lazy(importStudentProfile);
   ```
3. Append to the `COMPONENTS` map: `analyticsStudentProfile: StudentProfile`.
4. Append to `COMPACT_PAGES` set: `"analyticsStudentProfile"`.

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/pages/analytics/StudentProfile.jsx src/App.jsx
git commit -m "feat(analytics): StudentProfile page skeleton (F2)

Página esqueleto en /school/student/:classId/:studentRef. Fetch via
useStudentDetail, StudioShell view='student', PeriodChips controlados
(default 90d para perfil de alumno, ventana más amplia que ClassDetail),
manejo de loading + error. Slots de bloques para tasks 5-8.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `StudentKpiBand` + `CleoStudentStrip` (placeholder)

**Files:**
- Create: `src/components/analytics/StudentKpiBand.jsx`
- Create: `src/components/analytics/CleoStudentStrip.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/StudentProfile.jsx`

- [ ] **Step 1: Write `StudentKpiBand.jsx`.**

```jsx
// src/components/analytics/StudentKpiBand.jsx
//
// F2 Analytics Studio: banda de stat cards del Student Profile.
// 5 tiles: % correcto · Sesiones · Tiempo medio · Retención media · Δ vs media de clase.

import StatCardWithSparkline from "./StatCardWithSparkline";
import {
  formatPercent,
  formatNumber,
  formatDurationShort,
} from "../../lib/analytics/formatters";

function tone(delta) {
  if (delta == null) return "neutral";
  if (delta > 0) return "good";
  if (delta < 0) return "bad";
  return "neutral";
}

export default function StudentKpiBand({
  kpis = {},
  trajectory = [],
  topicMastery = [],
  classAvgRetention = 0,
}) {
  const studentAvgRetention = topicMastery.length > 0
    ? Math.round(
        topicMastery.reduce((s, t) => s + (Number(t.retention_score) || 0), 0)
          / topicMastery.length,
      )
    : 0;
  const deltaVsClass = topicMastery.length > 0
    ? Math.round(studentAvgRetention - Number(classAvgRetention))
    : null;

  const pctSpark = trajectory.map((t) => Number(t.value) || 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
      <StatCardWithSparkline
        label="% correcto"
        value={formatPercent(kpis.pct_correct)}
        sparkPoints={pctSpark}
      />
      <StatCardWithSparkline
        label="Sesiones"
        value={formatNumber(kpis.session_count)}
      />
      <StatCardWithSparkline
        label="Tiempo medio"
        value={formatDurationShort(kpis.avg_time_ms)}
      />
      <StatCardWithSparkline
        label="Retención media"
        value={`${studentAvgRetention}%`}
      />
      <StatCardWithSparkline
        label="Δ vs clase"
        value={deltaVsClass == null ? "—" : `${deltaVsClass > 0 ? "+" : ""}${deltaVsClass}%`}
        delta={
          deltaVsClass == null
            ? null
            : {
                label: deltaVsClass > 0 ? `▲ ${deltaVsClass}%` : deltaVsClass < 0 ? `▼ ${Math.abs(deltaVsClass)}%` : "→ 0%",
                tone: tone(deltaVsClass),
              }
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `CleoStudentStrip.jsx`.**

```jsx
// src/components/analytics/CleoStudentStrip.jsx
//
// F2 Analytics Studio: franja Cleo del Student Profile.
// Narrativa placeholder hasta F5 (mismo patrón que CleoStrip de F1).
// Chips de acción stub: F5 cablea Cleo class+student-level.

const ACCENT = "#7c3aed";
const ACCENT_BG = "#ede9fe";

function ActionChip({ label }) {
  return (
    <span
      style={{
        border: "1px solid #d4d4d8",
        color: "#71717a",
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 12,
        cursor: "not-allowed",
      }}
      title="Llega en F5 (Cleo con contexto de alumno)"
    >
      {label} · pronto
    </span>
  );
}

export default function CleoStudentStrip({ studentRef, weakTopics = [], deltaVsClass = null }) {
  const parts = [];
  if (weakTopics.length > 0) {
    parts.push(`Temas a reforzar: ${weakTopics.slice(0, 3).join(", ")}.`);
  }
  if (deltaVsClass != null) {
    if (deltaVsClass >= 0) {
      parts.push(`Está ${deltaVsClass}% por encima de la media de la clase.`);
    } else {
      parts.push(`Está ${Math.abs(deltaVsClass)}% por debajo de la media de la clase.`);
    }
  }
  const narrative =
    parts.length > 0
      ? `${parts.join(" ")} La narrativa pedagógica completa llega en F5.`
      : "Sin datos suficientes en esta ventana. La narrativa pedagógica llega en F5.";

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
        <b>Cleo:</b> {narrative}
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <ActionChip label="Asignarle repaso" />
          <ActionChip label="Mensaje a familia" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into StudentProfile.**

Add imports:

```jsx
import StudentKpiBand from "../../components/analytics/StudentKpiBand";
import CleoStudentStrip from "../../components/analytics/CleoStudentStrip";
```

Replace placeholders:

```jsx
<StudentKpiBand
  kpis={d?.kpis ?? {}}
  trajectory={d?.trajectory ?? []}
  topicMastery={d?.topic_mastery ?? []}
  classAvgRetention={d?.class_avg_retention ?? 0}
/>
<CleoStudentStrip
  studentRef={studentRef}
  weakTopics={(d?.topic_mastery ?? [])
    .filter((t) => (t.retention_score ?? 0) < 40)
    .slice(0, 3)
    .map((t) => t.topic)}
  deltaVsClass={
    (d?.topic_mastery ?? []).length > 0
      ? Math.round(
          (d.topic_mastery.reduce((s, t) => s + (Number(t.retention_score) || 0), 0)
            / d.topic_mastery.length) - Number(d?.class_avg_retention ?? 0),
        )
      : null
  }
/>
```

- [ ] **Step 4: Barrel + gates + commit.**

Add to `src/components/analytics/index.ts`:

```ts
export { default as StudentKpiBand } from "./StudentKpiBand";
export { default as CleoStudentStrip } from "./CleoStudentStrip";
```

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/StudentKpiBand.jsx src/components/analytics/CleoStudentStrip.jsx src/components/analytics/index.ts src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): StudentKpiBand + CleoStudentStrip (F2)

5 tiles del Student Profile header (% correcto / Sesiones / Tiempo medio /
Retención media / Δ vs media de clase) y franja Cleo con narrativa
placeholder + 2 chips stub (Asignarle repaso, Mensaje a familia — ambos
llegan en F5 con Cleo+contexto-de-alumno).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `TrajectoryPanel`

**Files:**
- Create: `src/components/analytics/TrajectoryPanel.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/StudentProfile.jsx`

Reusa `TrendBarChart` para mostrar la trayectoria semanal del alumno (pct_correct por semana).

- [ ] **Step 1: Write `TrajectoryPanel.jsx`.**

```jsx
// src/components/analytics/TrajectoryPanel.jsx
//
// F2 Analytics Studio: trayectoria temporal del Student Profile.
// Bar chart semanal del % correcto. F5 agrega forecast + comparar.

import { TrendBarChart } from "../charts";
import { formatPercent } from "../../lib/analytics/formatters";

export default function TrajectoryPanel({ data = [], loading = false }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12, margin: "10px 0" }}>
      <div style={{ display: "flex", gap: 12, fontSize: 13, marginBottom: 8 }}>
        <b>Trayectoria · % correcto semanal</b>
        <span style={{ marginLeft: "auto", opacity: 0.65, fontSize: 11 }}>
          — pronóstico y comparar llegan en F4/F5
        </span>
      </div>
      {loading ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>Cargando…</div>
      ) : data.length === 0 ? (
        <div style={{ height: 180, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Sin datos en esta ventana.
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

- [ ] **Step 2: Wire into StudentProfile.**

Add import + replace `<div data-block="TrajectoryPanel" />`:

```jsx
import TrajectoryPanel from "../../components/analytics/TrajectoryPanel";
// …
<TrajectoryPanel data={d?.trajectory ?? []} loading={loading && !d} />
```

- [ ] **Step 3: Barrel + gates + commit.**

```bash
git add src/components/analytics/TrajectoryPanel.jsx src/components/analytics/index.ts src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): TrajectoryPanel — student trajectory bar chart (F2)

Bar chart semanal del % correcto del alumno (de student_detail.trajectory).
Reusa TrendBarChart. Forecast/compare diferido a F4-F5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Per-topic mastery + StudentMostFailedList

**Files:**
- Create: `src/components/analytics/StudentMostFailedList.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/StudentProfile.jsx`

Reusa `TopicBarListPanel` (variant="critical") para "Temas más flojos" del alumno. `StudentMostFailedList` es paralelo a `MostMissedList` (F1) pero scoped al alumno y con drill a DeckResults igual.

- [ ] **Step 1: Write `StudentMostFailedList.jsx`.**

```jsx
// src/components/analytics/StudentMostFailedList.jsx
//
// F2 Analytics Studio: Top preguntas más falladas del alumno
// (paralelo a MostMissedList de F1, pero scoped a un alumno).
// Drill a DeckResults funciona; "Asignar repaso" es stub (F5).

export default function StudentMostFailedList({ classId, studentRef, items = [], onItemClick }) {
  const show = items.slice(0, 5);

  return (
    <div
      style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}
      data-class-id={classId}
      data-student-ref={studentRef}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Más falladas por el alumno
      </div>
      {show.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>
          Sin datos suficientes.
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
          {show.map((it, i) => (
            <div
              key={`${it.deck_id}-${it.question_index}`}
              onClick={onItemClick ? () => onItemClick(it) : undefined}
              style={{
                borderBottom: i < show.length - 1 ? "1px solid #f4f4f5" : "none",
                padding: "3px 0",
                cursor: onItemClick ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                P. {it.question_index + 1}
                {it.topic ? ` · ${it.topic}` : ""}
              </span>
              <b
                style={{
                  color:
                    it.error_rate >= 60
                      ? "#dc2626"
                      : it.error_rate >= 40
                        ? "#eab308"
                        : "#16a34a",
                }}
              >
                {Math.round(it.error_rate)}% err
              </b>
            </div>
          ))}
        </div>
      )}
      <span
        title="Llega en F5 (Cleo + generator student-level)"
        style={{
          display: "inline-block",
          marginTop: 8,
          border: "1px solid #d4d4d8",
          color: "#71717a",
          padding: "2px 9px",
          borderRadius: 6,
          fontSize: 12,
          cursor: "not-allowed",
        }}
      >
        Asignar repaso · pronto
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Wire into StudentProfile.**

Add imports + replace the 2-col placeholders:

```jsx
import TopicBarListPanel from "../../components/analytics/TopicBarListPanel";
import StudentMostFailedList from "../../components/analytics/StudentMostFailedList";
import { buildRoute } from "../../routes";
// …
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
  <TopicBarListPanel variant="critical" topicMastery={d?.topic_mastery ?? []} />
  <StudentMostFailedList
    classId={classId}
    studentRef={studentRef}
    items={d?.most_failed ?? []}
    onItemClick={(it) => {
      if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
    }}
  />
</div>
```

- [ ] **Step 3: Barrel + gates + commit.**

```bash
git add src/components/analytics/StudentMostFailedList.jsx src/components/analytics/index.ts src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): topic mastery (reuse) + StudentMostFailedList (F2)

Row 2-col del Student Profile:
- TopicBarListPanel variant='critical' reuse — temas más flojos
  del alumno (de student_detail.topic_mastery).
- StudentMostFailedList — top 5 preguntas peor contestadas, drill
  a DeckResults. 'Asignar repaso' stub (F5).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `SessionHistoryTable`

**Files:**
- Create: `src/components/analytics/SessionHistoryTable.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/StudentProfile.jsx`

- [ ] **Step 1: Write `SessionHistoryTable.jsx`.**

```jsx
// src/components/analytics/SessionHistoryTable.jsx
//
// F2 Analytics Studio: historial por sesión del alumno.
// Una fila por sesión (top 20 más recientes en la ventana, ya ordenadas
// por completed_at DESC desde el RPC). Click → DeckResults para ese deck.

import { formatPercent, formatDurationShort, formatRelativeDay } from "../../lib/analytics/formatters";

function pctColor(pct) {
  if (pct == null) return "#71717a";
  if (pct >= 70) return "#15803d";
  if (pct >= 40) return "#854d0e";
  return "#b91c1c";
}

const TYPE_LABEL = {
  warmup: "Warmup",
  exitTicket: "Exit ticket",
};

export default function SessionHistoryTable({ items = [], onRowClick }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Historial por sesión
      </div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>
          Sin sesiones completadas en esta ventana.
        </div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              opacity: 0.55,
              textAlign: "left",
            }}
          >
            <tr>
              <th style={{ padding: "5px 0" }}>Cuándo</th>
              <th>Tema</th>
              <th>Tipo</th>
              <th>% correcto</th>
              <th>Tiempo medio</th>
              <th>Respuestas</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const clickable = !!onRowClick && !!it.deck_id;
              return (
                <tr
                  key={it.session_id}
                  onClick={clickable ? () => onRowClick(it) : undefined}
                  style={{
                    borderTop: "1px solid #f4f4f5",
                    cursor: clickable ? "pointer" : "default",
                  }}
                >
                  <td style={{ padding: "7px 0" }}>{formatRelativeDay(it.session_completed_at)}</td>
                  <td>{it.session_topic || "—"}</td>
                  <td style={{ opacity: 0.75 }}>{TYPE_LABEL[it.session_type] || it.session_type}</td>
                  <td style={{ color: pctColor(it.pct_correct), fontWeight: 600 }}>
                    {formatPercent(it.pct_correct)}
                  </td>
                  <td>{formatDurationShort(it.avg_time_ms)}</td>
                  <td style={{ opacity: 0.75 }}>
                    {it.responses_correct}/{it.responses_total}
                  </td>
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

- [ ] **Step 2: Wire into StudentProfile.**

Add import + replace `<div data-block="SessionHistoryTable" />`:

```jsx
import SessionHistoryTable from "../../components/analytics/SessionHistoryTable";
// …
<SessionHistoryTable
  items={d?.session_history ?? []}
  onRowClick={(it) => {
    if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
  }}
/>
```

- [ ] **Step 3: Barrel + gates + commit.**

```bash
git add src/components/analytics/SessionHistoryTable.jsx src/components/analytics/index.ts src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): SessionHistoryTable — student session history (F2)

Tabla del Student Profile con las últimas 20 sesiones del alumno en la
ventana (de student_detail.session_history). Columnas: Cuándo · Tema ·
Tipo · % correcto · Tiempo medio · Respuestas. Click drill a DeckResults.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Wire RosterTable + Director Students tab → StudentProfile

**Files:**
- Modify: `src/components/analytics/RosterTable.jsx`
- Modify: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/pages/Director.jsx`

RosterTable de F1 ya acepta `onRowClick`. Solo queda cablearlo en ClassDetail con `navigate(buildRoute.analyticsStudent(classId, student.name))`. En Director, los rows del "Students tab" (cross-clase) reciben el mismo tratamiento — el código necesita conocer el `classId` por fila (la lista cross-clase pasa el `classId` cuando se construye).

- [ ] **Step 1: Wire ClassDetail's RosterTable.**

In `src/pages/analytics/ClassDetail.jsx`, replace:

```jsx
<RosterTable students={students} />
```

with:

```jsx
<RosterTable
  students={students}
  onRowClick={(s) => navigate(buildRoute.analyticsStudent(classId, s.name))}
/>
```

- [ ] **Step 2: Director's Students tab → student profile.**

Read `src/pages/Director.jsx`. Find the Students tab block (around lines 296-344 per the F1 final review). Each row represents a student aggregated across classes — but to drill into a specific `studentName + classId`, we need the classId on each row.

If the rendered rows already carry `classId` (from `studentData[classId]`), wire the click. If not, look at where `studentData` is iterated (look for `Object.entries(studentData).forEach`) and capture the classId in the JSX. Add `onClick={() => navigate(buildRoute.analyticsStudent(classId, student.name))}` + `cursor: "pointer"` + `role="button"` + `tabIndex={0}` + `onKeyDown`.

If the Director's Students tab is genuinely cross-class without a per-row classId (some students appear in multiple classes), report **DONE_WITH_CONCERNS** and skip the wiring for that tab — clicks from ClassDetail's roster (Step 1) is the primary path; Director's Students tab can be wired in a follow-up once we decide UX (e.g., pick the first class or open a chooser).

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/pages/analytics/ClassDetail.jsx src/pages/Director.jsx
git commit -m "feat(analytics): wire RosterTable + Director Students → StudentProfile (F2)

Click en una fila del roster (ClassDetail) navega a
/school/student/:classId/:studentRef. La lista de alumnos del Director
recibe el mismo tratamiento donde haya un classId por fila accesible
(si no, queda flagged para follow-up con elección de UX).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Final gates + final review + PR

- [ ] **Step 1: Run full gates.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

- [ ] **Step 2: Dispatch final code review subagent.**

Diff range: `<F1-tip>..HEAD` (where F1 tip = `f94d848`). Same pattern as F0/F1 final reviews. Focus areas:

- `student_detail` RPC security (SECURITY DEFINER + auth.uid() guard).
- The student_name match — what happens with names containing special chars (spaces, accents)? Encoding/decoding via URL.
- KPI deltas computed correctly (deltaVsClass uses retention avg, not pct_correct — verify the math).
- `pathToPage` ordering: `/school/student/:classId/:studentRef` BEFORE `/school/class/:classId` (more specific).
- The RosterTable wiring lands on the right URL.
- `useStudentDetail`'s cache key (studentRef must be in the key — it is).

- [ ] **Step 3: Fix any 🟥/🟧 + push + open PR.**

```bash
git push -u origin claude/analytics-studio-f2
gh pr create --base claude/analytics-studio-f1 --head claude/analytics-studio-f2 --title "feat(analytics): Analytics Studio F2 — Student Profile" --body "$(cat <<'EOF'
## Summary

Fase 2 de Analytics Studio: la página **Student Profile** en `/school/student/:classId/:studentRef` — hoy NO existe en Clasloop. Click en una fila del roster (F1) o en la lista de alumnos del Director te lleva al perfil profundo.

> 🔗 **Stacked PR:** base = F1 branch. Cuando #64 mergee a `main` (vía #63), GitHub re-apunta.

- 🗄️ **Migración SQL nueva** (069): `student_detail` RPC — KPIs + trayectoria + topic mastery + historial por sesión + más falladas + class avg en UNA llamada.
- 🪝 **Hook nuevo:** `useStudentDetail`.
- 📐 **Página completa:**
  - StudentKpiBand (% correcto / Sesiones / Tiempo medio / Retención media / Δ vs clase)
  - CleoStudentStrip (placeholder narrativa + chips stub — F5)
  - TrajectoryPanel (bar chart semanal — reusa TrendBarChart)
  - TopicBarListPanel variant='critical' (reuse F1) + StudentMostFailedList
  - SessionHistoryTable (top 20 sesiones, click → DeckResults)
- 🔗 RosterTable de F1 → click navega al perfil.

## Desviaciones del plan

(Llenar con lo que el final review encuentre + estas: CleoStudentStrip chips stub porque close-unit-ai es unit-scoped; lo mismo que F1.)

## Spec + plan

- `docs/superpowers/specs/2026-05-28-analytics-studio-design.md`
- `docs/superpowers/plans/2026-05-28-analytics-studio-phase-2.md`

## Test plan

- [ ] Aplicar migration 069 en Supabase.
- [ ] Login pedro@hola.com, abrir /school → click en una clase → en el roster click en un alumno → URL `/school/student/:classId/:name`, StudentProfile carga.
- [ ] StudioShell muestra 'Estudiante' activo.
- [ ] 5 KPI tiles + sparkline.
- [ ] Cleo strip narrativa + chips stub.
- [ ] Trajectory bar chart semanal.
- [ ] Topic mastery (críticos) + Most-failed (click → DeckResults).
- [ ] Session history table (click → DeckResults).
- [ ] Chips de período (7d/30d/90d) re-filtran.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec Coverage Self-Review

| Spec §9 F2 deliverable | Task |
|------------------------|------|
| `student_detail` RPC | Task 1 |
| Hook React Query | Task 2 |
| Routing `/school/student/:classId/:studentRef` | Task 3 |
| StudentProfile page skeleton | Task 4 |
| KPIs + Cleo strip | Task 5 |
| Trajectory (per-week trend) | Task 6 |
| Per-topic mastery + most-failed | Task 7 |
| Session history table | Task 8 |
| Drill from F1 RosterTable + Director | Task 9 |
| Final review + PR | Task 10 |

All §9 F2 items mapped.

## Open notes

- **Director "Students tab" wiring may be deferred** if rows don't carry `classId` (Task 9 step 2 explicitly flags this). ClassDetail RosterTable is the primary nav path; Director path is a nice-to-have.
- **Student identity in F2 = `student_name`.** F5 (or earlier if it emerges as urgent) introduces dual-lookup (student_id when present, else student_name).
- **TrajectoryPanel uses pct_correct as a proxy for "trayectoria"** — not retention. Retention time-series requires history we don't have until F3.
- **CleoStudentStrip chips are stubs.** F5 cablea Cleo a nivel student (mismo patrón F1).
