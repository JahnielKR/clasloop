# Analytics Studio — Fase 6 (En vivo / Command Center) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El pilar "En vivo / Command Center" del Analytics Studio. Tres entregables: (1) franja **"Pulso de hoy"** en la pestaña Overview del Director — muestra la actividad del día (top clase, top alumno, sesiones completadas/activas, % correcto del día); (2) nueva vista **Live Command Center** en `/school/live` que cuando hay una sesión activa renderiza tiles realtime (joined / responding / done / % correcto en vivo) y alertas accionables ("¿Lanzar repaso?" si una pregunta tiene > 60% error); cuando no hay sesión activa, muestra el pulso del día expandido + sesiones programadas; (3) acceso desde el sidebar al `/school/live`.

**Architecture:** **CERO SQL nuevo.** Reusa `supabase.channel` + `postgres_changes` (mismo patrón que `src/pages/SessionFlow.jsx`) para tiles realtime. Pulse-of-today se nutre de un SELECT directo sobre `sessions` + `responses` filtrado a "hoy" (RLS hace de tenant guard). Lógica de agregación vive en `src/lib/analytics/pulse-of-today.ts` (puro, vitest). Tres hooks nuevos (`useTodayPulse`, `useLiveSession`, `useActiveSession`). Una vista nueva (`LiveCommandCenter.jsx`). Un componente franja (`PulseStrip.jsx`) consumido por Director.

**Tech Stack:** React 18, `@tanstack/react-query` v5, Supabase Realtime channels (ya en uso), vitest. **Sin migración SQL. Sin nuevos endpoints Vercel.**

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §8.4 (En vivo + Command Center), §9 (F6 row).

**Branch:** `claude/analytics-studio-f6` — **FRESH off main** (`076b5ca`, post F5 + author_id fix).

**Depends on:** F0 (`StudioShell`, `useAnalyticsOverview`), F1 (`Director.jsx` evolution baseline), F5 (`generateClassReviewQuestions` + `saveClassReviewDeck` para el chip "Lanzar repaso" de alertas).

---

## Pre-task: File Structure

**Create (7 files):**

```
src/lib/analytics/
  pulse-of-today.ts                              # NEW: pure selectors (top class/student of the day, etc.)
  __tests__/pulse-of-today.test.ts               # NEW

src/hooks/
  useTodayPulse.js                               # NEW: RQ fetch of today's sessions + responses
  useActiveSession.js                            # NEW: poll/subscribe for an active session of the teacher
  useLiveSession.js                              # NEW: realtime tiles for a specific session (participants + responses channel)

src/components/analytics/
  PulseStrip.jsx                                 # NEW: 4-tile strip "Pulso de hoy" for Director Overview
  LiveTile.jsx                                   # NEW: generic numeric tile with pulse animation when realtime delta

src/pages/analytics/
  LiveCommandCenter.jsx                          # NEW: /school/live page
```

**Modify (5 files):**

```
src/lib/analytics/index.ts                      # +export pulse-of-today
src/components/analytics/index.ts               # +export PulseStrip, LiveTile
src/pages/Director.jsx                          # +PulseStrip on Overview tab (top of grid)
src/routes.ts                                   # +ROUTES.ANALYTICS_LIVE + ROUTE_PATTERNS + pathToPage + TEACHER_ONLY_PAGES + buildRoute.analyticsLive
src/App.jsx                                     # +lazy import LiveCommandCenter + COMPONENTS entry + (optional) prefetch
```

**Out of scope for F6 (explicit):**
- **"Pulso de hoy" historical replay** (yesterday's recap, week recap) — F6 only "today".
- **Multi-session simultaneous live** — F6 assumes at most ONE live session at a time per teacher (matches real product flow). If two are live, F6 picks the most recently created.
- **Live charts** (sparkline of % correct over question-by-question time) — F6 has only tile counts; chart variant is polish.
- **Sound/haptic notifications on alert** — visual-only; sound opt-in stays off per [[feedback_design_direction]] (in user memory).
- **Persisted alert dismissals** — alerts are ephemeral, recompute on every realtime tick.
- **Push notifications when teacher isn't on /school/live** — handled by F7 email digest, not F6.

---

## Task 1: TDD — `pulse-of-today.ts` pure selectors

**Files:**
- Test: `src/lib/analytics/__tests__/pulse-of-today.test.ts`
- Create: `src/lib/analytics/pulse-of-today.ts`

Selectores puros que toman las **rows crudas de `sessions` + `responses` de hoy + las `classes` del docente** y devuelven el resumen que la `PulseStrip` renderiza: top sesión, top clase, top alumno, contadores. Sin React, sin Supabase.

### Step 1: Write failing tests

Crear `src/lib/analytics/__tests__/pulse-of-today.test.ts`:

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import {
  computeTodayPulse,
  topClassByActivity,
  topStudentByPctCorrect,
} from "../pulse-of-today";

const today = "2026-05-29T10:00:00.000Z";

describe("topClassByActivity", () => {
  it("returns the class with the most responses today", () => {
    const responses = [
      { class_id: "a", session_id: "s1" },
      { class_id: "a", session_id: "s1" },
      { class_id: "b", session_id: "s2" },
    ];
    const classes = [
      { id: "a", name: "5to A" },
      { id: "b", name: "5to B" },
    ];
    expect(topClassByActivity(responses, classes)).toEqual({
      id: "a",
      name: "5to A",
      response_count: 2,
    });
  });
  it("returns null when no responses", () => {
    expect(topClassByActivity([], [{ id: "a", name: "x" }])).toBeNull();
  });
  it("falls back to id if class name missing", () => {
    const r = topClassByActivity([{ class_id: "x" }], []);
    expect(r?.name).toBe("x");
  });
});

describe("topStudentByPctCorrect", () => {
  it("returns the student with the highest pct correct (min 3 responses)", () => {
    const responses = [
      { student_name: "Ana", is_correct: true },
      { student_name: "Ana", is_correct: true },
      { student_name: "Ana", is_correct: true },
      { student_name: "Beto", is_correct: true },
      { student_name: "Beto", is_correct: false },
      { student_name: "Beto", is_correct: false },
    ];
    expect(topStudentByPctCorrect(responses)).toEqual({
      name: "Ana",
      pct_correct: 100,
      response_count: 3,
    });
  });
  it("skips students with < 3 responses (noise floor)", () => {
    const responses = [
      { student_name: "Ana", is_correct: true },
      { student_name: "Ana", is_correct: true },
      { student_name: "Beto", is_correct: false },
      { student_name: "Beto", is_correct: false },
      { student_name: "Beto", is_correct: false },
    ];
    // Ana has only 2 → skipped. Beto has 3 → wins by default.
    expect(topStudentByPctCorrect(responses)?.name).toBe("Beto");
  });
  it("returns null when no eligible student", () => {
    expect(topStudentByPctCorrect([])).toBeNull();
  });
});

describe("computeTodayPulse", () => {
  it("aggregates session and response totals", () => {
    const sessions = [
      { id: "s1", class_id: "a", status: "completed", completed_at: today, created_at: today },
      { id: "s2", class_id: "b", status: "active", completed_at: null, created_at: today },
    ];
    const responses = [
      { session_id: "s1", class_id: "a", student_name: "Ana", is_correct: true, points: 1, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Ana", is_correct: true, points: 1, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Beto", is_correct: false, points: 0, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Beto", is_correct: true, points: 1, max_points: 1 },
      { session_id: "s1", class_id: "a", student_name: "Beto", is_correct: true, points: 1, max_points: 1 },
    ];
    const classes = [
      { id: "a", name: "5to A" },
      { id: "b", name: "5to B" },
    ];
    const pulse = computeTodayPulse({ sessions, responses, classes });
    expect(pulse.completed_sessions).toBe(1);
    expect(pulse.active_sessions).toBe(1);
    expect(pulse.responses_total).toBe(5);
    expect(pulse.pct_correct_today).toBeCloseTo(80, 0);
    expect(pulse.top_class?.name).toBe("5to A");
    expect(pulse.has_active).toBe(true);
  });
  it("tolerates empty inputs", () => {
    const pulse = computeTodayPulse({ sessions: [], responses: [], classes: [] });
    expect(pulse.completed_sessions).toBe(0);
    expect(pulse.active_sessions).toBe(0);
    expect(pulse.responses_total).toBe(0);
    expect(pulse.pct_correct_today).toBeNull();
    expect(pulse.top_class).toBeNull();
    expect(pulse.top_student).toBeNull();
    expect(pulse.has_active).toBe(false);
  });
});
```

### Step 2: Run; expect red

```bash
npm run test:run -- src/lib/analytics
```

Expected: vitest fails — module missing.

### Step 3: Implement `src/lib/analytics/pulse-of-today.ts`

```ts
// ─── src/lib/analytics/pulse-of-today.ts ───────────────────────────────
// Pure selectors para la franja "Pulso de hoy" + Live Command Center.
// Toma las filas crudas de sessions + responses + classes (lo que el hook
// useTodayPulse devuelve) y produce el resumen agregado del día. Sin
// React, sin Supabase. Testeable.

export interface PulseInputs {
  sessions: any[];
  responses: any[];
  classes: any[];
}

export interface TopClass {
  id: string;
  name: string;
  response_count: number;
}

export interface TopStudent {
  name: string;
  pct_correct: number;
  response_count: number;
}

export interface TodayPulse {
  completed_sessions: number;
  active_sessions: number;
  responses_total: number;
  pct_correct_today: number | null;
  top_class: TopClass | null;
  top_student: TopStudent | null;
  has_active: boolean;
  /** Most-recent active session id (or null) — drives the /school/live drill-down. */
  active_session_id: string | null;
}

/** Top class by total responses today. */
export function topClassByActivity(
  responses: readonly any[],
  classes: readonly any[],
): TopClass | null {
  if (!responses || responses.length === 0) return null;
  const byId = new Map<string, number>();
  for (const r of responses) {
    if (!r?.class_id) continue;
    byId.set(r.class_id, (byId.get(r.class_id) || 0) + 1);
  }
  if (byId.size === 0) return null;
  const top = [...byId.entries()].sort((a, b) => b[1] - a[1])[0];
  const [id, count] = top;
  const cls = (classes || []).find((c) => c.id === id);
  return { id, name: cls?.name || id, response_count: count };
}

/**
 * Top student by % correct today. Requires at least 3 responses to filter out
 * noise from students who answered 1-2 things perfectly.
 */
export function topStudentByPctCorrect(
  responses: readonly any[],
  minResponses = 3,
): TopStudent | null {
  if (!responses || responses.length === 0) return null;
  const acc = new Map<string, { correct: number; total: number }>();
  for (const r of responses) {
    if (!r?.student_name) continue;
    const cur = acc.get(r.student_name) || { correct: 0, total: 0 };
    cur.total += 1;
    if (r.is_correct) cur.correct += 1;
    acc.set(r.student_name, cur);
  }
  const eligible = [...acc.entries()].filter(([, v]) => v.total >= minResponses);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total);
  const [name, { correct, total }] = eligible[0];
  return {
    name,
    pct_correct: Math.round((correct / total) * 100),
    response_count: total,
  };
}

export function computeTodayPulse(inputs: PulseInputs): TodayPulse {
  const sessions = inputs.sessions || [];
  const responses = inputs.responses || [];
  const classes = inputs.classes || [];

  const completed = sessions.filter((s) => s?.status === "completed").length;
  const active = sessions.filter((s) => s?.status === "active" || s?.status === "lobby");
  const totalResponses = responses.length;

  let pctCorrect: number | null = null;
  let sumPoints = 0;
  let sumMax = 0;
  for (const r of responses) {
    if (Number.isFinite(Number(r?.points))) sumPoints += Number(r.points);
    if (Number.isFinite(Number(r?.max_points))) sumMax += Number(r.max_points);
  }
  if (sumMax > 0) pctCorrect = Math.round((sumPoints / sumMax) * 100);

  // Most recent active session id (sorts active sessions by created_at desc)
  const activeSorted = [...active].sort((a, b) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  const activeSessionId = activeSorted[0]?.id || null;

  return {
    completed_sessions: completed,
    active_sessions: active.length,
    responses_total: totalResponses,
    pct_correct_today: pctCorrect,
    top_class: topClassByActivity(responses, classes),
    top_student: topStudentByPctCorrect(responses),
    has_active: active.length > 0,
    active_session_id: activeSessionId,
  };
}
```

### Step 4: Run tests; expect green

```bash
npm run test:run -- src/lib/analytics
```

Expected: previous + ~8 new pulse-of-today tests = ≥75 passing.

### Step 5: Barrel + commit

Add to `src/lib/analytics/index.ts`:

```ts
export * from "./pulse-of-today";
```

```bash
git add src/lib/analytics/pulse-of-today.ts \
        src/lib/analytics/__tests__/pulse-of-today.test.ts \
        src/lib/analytics/index.ts
git commit -m "feat(analytics): pulse-of-today.ts — pure selectors for today summary (F6)

computeTodayPulse({sessions, responses, classes}) → {completed_sessions,
active_sessions, responses_total, pct_correct_today, top_class,
top_student, has_active, active_session_id}. topClassByActivity y
topStudentByPctCorrect (con minResponses=3 noise floor) exportados
para reusar. Sin React, sin Supabase. ~8 unit tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `useTodayPulse` hook

**Files:**
- Create: `src/hooks/useTodayPulse.js`

React Query que fetcha en paralelo:
1. Sessions del docente con `created_at >= today` o `status IN ('active','lobby')`.
2. Responses con `created_at >= today` (vía join indirecto: `sessions.teacher_id = auth.uid()` lo cubre RLS).
3. Classes del docente.

Sin RPC nueva; usa `supabase.from(...).select(...)` directo (RLS hace de tenant guard).

### Step 1: Write `src/hooks/useTodayPulse.js`

```js
// src/hooks/useTodayPulse.js
//
// F6 Analytics Studio: datos crudos de "hoy" para el Pulso de hoy strip
// y el Live Command Center. SELECT directo sobre sessions + responses
// + classes (RLS por teacher_id ya filtra al docente actual). Sin RPC
// nueva. Refetch cada 60s (overview infrequente — la vista live tiene
// su propio canal realtime para updates instantáneos).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const todayPulseKey = ["analytics", "todayPulse"];

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function fetchTodayPulse() {
  const sinceIso = startOfTodayIso();

  // Sessions: las creadas hoy O las activas/lobby (que podrían venir de ayer
  // si el docente dejó una corriendo).
  const { data: sessions, error: sErr } = await supabase
    .from("sessions")
    .select("id, class_id, status, created_at, completed_at, topic, deck_id, teacher_id")
    .or(`created_at.gte.${sinceIso},status.in.(active,lobby)`);
  if (sErr) throw sErr;

  // Responses: creadas hoy. Para limitar payload, solo las columnas que
  // pulse-of-today.ts consume.
  const { data: responses, error: rErr } = await supabase
    .from("responses")
    .select("session_id, student_name, is_correct, points, max_points, created_at")
    .gte("created_at", sinceIso);
  if (rErr) throw rErr;

  // Classes del docente (también necesarias para los nombres de top_class).
  const { data: classes, error: cErr } = await supabase
    .from("classes")
    .select("id, name");
  if (cErr) throw cErr;

  // Enriquecer responses con class_id derivado de la sesión correspondiente
  // (responses no tiene class_id directo).
  const sessionById = new Map((sessions || []).map((s) => [s.id, s]));
  const enriched = (responses || []).map((r) => {
    const s = sessionById.get(r.session_id);
    return { ...r, class_id: s?.class_id || null };
  });

  return { sessions: sessions || [], responses: enriched, classes: classes || [] };
}

export function useTodayPulse() {
  return useQuery({
    queryKey: todayPulseKey,
    queryFn: fetchTodayPulse,
    refetchInterval: 60_000, // 1 min — pulso del día no necesita más
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
```

### Step 2: Gates + commit

```bash
npm run lint && npm run typecheck && npm run build
git add src/hooks/useTodayPulse.js
git commit -m "feat(analytics): useTodayPulse hook (F6)

React Query que SELECTa sessions + responses + classes de hoy. RLS por
teacher_id es el tenant guard (sin RPC nueva). Refetch cada 60s para
mantener el Pulso de hoy del Director Overview al día sin necesidad
de realtime (eso lo maneja /school/live con canales).

Enriquece responses con class_id derivado de la sesión correspondiente
porque la tabla responses no tiene class_id directo (solo session_id).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `useActiveSession` + `useLiveSession` hooks

**Files:**
- Create: `src/hooks/useActiveSession.js`
- Create: `src/hooks/useLiveSession.js`

`useActiveSession` cachea la sesión activa más reciente del docente (1 row, polling cada 30s). `useLiveSession` se suscribe a `postgres_changes` para una sesión específica — devuelve `{participants, responses, isLive}` que tiles realtime consumen.

### Step 1: Write `src/hooks/useActiveSession.js`

```js
// src/hooks/useActiveSession.js
//
// F6: cuál es la sesión activa más reciente del docente (si hay alguna).
// Reusa la lógica que App.jsx ya tiene (sidebar shortcut "Active session"),
// pero como hook independiente para que LiveCommandCenter no dependa de
// App-level state. SELECT simple, RLS por teacher_id.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const activeSessionKey = ["analytics", "activeSession"];

async function fetchActiveSession() {
  // Sesiones < 24h en lobby o active (mismo pattern que App.jsx para
  // descartar zombies).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status, topic, deck_id, class_id, created_at")
    .in("status", ["lobby", "active"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export function useActiveSession() {
  return useQuery({
    queryKey: activeSessionKey,
    queryFn: fetchActiveSession,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
```

### Step 2: Write `src/hooks/useLiveSession.js`

```js
// src/hooks/useLiveSession.js
//
// F6: tiles realtime para una sesión específica. Mismo patrón
// supabase.channel + postgres_changes que SessionFlow.jsx (líneas 426+,
// 658+, 853+).
//
// Devuelve {participants, responses, isLive}. participants = array de
// session_participants rows; responses = array de responses rows. El
// componente arma counts en base a estos arrays.
//
// IMPORTANTE: cleanup correcto en el efecto. removeChannel en el return.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useLiveSession(sessionId) {
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setParticipants([]);
      setResponses([]);
      setIsLive(false);
      return undefined;
    }

    let cancelled = false;
    // Initial snapshot
    (async () => {
      const [{ data: ps }, { data: rs }] = await Promise.all([
        supabase
          .from("session_participants")
          .select("id, student_name, joined_at, completed_at, is_kicked")
          .eq("session_id", sessionId),
        supabase
          .from("responses")
          .select("id, participant_id, question_index, is_correct, points, max_points, created_at")
          .eq("session_id", sessionId),
      ]);
      if (cancelled) return;
      setParticipants(ps || []);
      setResponses(rs || []);
    })();

    const channel = supabase
      .channel(`live-tiles:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        (payload) => setParticipants((prev) => {
          if (prev.some((p) => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        (payload) => setParticipants((prev) => prev.map((p) => (p.id === payload.new.id ? payload.new : p))),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${sessionId}` },
        (payload) => setResponses((prev) => [...prev, payload.new]),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsLive(true);
        if (status === "CLOSED") setIsLive(false);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [sessionId]);

  return { participants, responses, isLive };
}
```

### Step 3: Gates + commit

```bash
npm run lint && npm run typecheck && npm run build
git add src/hooks/useActiveSession.js src/hooks/useLiveSession.js
git commit -m "feat(analytics): useActiveSession + useLiveSession hooks (F6)

useActiveSession: React Query poll de la sesión activa más reciente
del docente (mismo gating de 24h que App.jsx para descartar zombies).
useLiveSession: snapshot inicial + Supabase channel postgres_changes
sobre session_participants (INSERT/UPDATE) y responses (INSERT), filtrado
por session_id. Cleanup correcto via removeChannel en el return del
useEffect. Mismo patrón que SessionFlow.jsx.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `LiveTile` component

**Files:**
- Create: `src/components/analytics/LiveTile.jsx`

Tile genérico con número grande + label + pulse animation cuando el value cambia (signals realtime delta). Reutilizable por PulseStrip y LiveCommandCenter.

### Step 1: Write `src/components/analytics/LiveTile.jsx`

```jsx
// src/components/analytics/LiveTile.jsx
//
// F6 Analytics Studio: tile genérico para métricas (numéricas) con
// indicador opcional de "live" (punto pulsante) cuando recibe updates
// realtime. Usado por PulseStrip (Director) y LiveCommandCenter.

import { useEffect, useRef, useState } from "react";

const cssId = "live-tile-css";

function ensureCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById(cssId)) return;
  const el = document.createElement("style");
  el.id = cssId;
  el.textContent = `
    @keyframes liveTilePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.5); }
      50%      { box-shadow: 0 0 0 8px rgba(124, 58, 237, 0); }
    }
    .live-tile-dot { animation: liveTilePulse 1.6s infinite; }
    @keyframes liveTileTick {
      0%   { transform: scale(1); }
      30%  { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    .live-tile-tick { animation: liveTileTick .32s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .live-tile-dot, .live-tile-tick { animation: none; }
    }
  `;
  document.head.appendChild(el);
}

export default function LiveTile({
  label,
  value,
  unit = "",
  tone = "default", // "default" | "good" | "warn" | "bad" | "live"
  live = false,
  onClick = null,
}) {
  ensureCss();
  const prev = useRef(value);
  const [tick, setTick] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      setTick(true);
      const id = setTimeout(() => setTick(false), 320);
      prev.current = value;
      return () => clearTimeout(id);
    }
    return undefined;
  }, [value]);

  const toneColor = {
    default: "#1f2937",
    good: "#15803d",
    warn: "#a16207",
    bad: "#b91c1c",
    live: "#7c3aed",
  }[tone] || "#1f2937";

  return (
    <div
      onClick={onClick || undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        textAlign: "center",
      }}
    >
      {live && (
        <span
          className="live-tile-dot"
          aria-label="en vivo"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#7c3aed",
          }}
        />
      )}
      <div
        className={tick ? "live-tile-tick" : ""}
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: toneColor,
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          lineHeight: 1.1,
          display: "inline-flex",
          gap: 4,
          alignItems: "baseline",
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11, color: "#71717a", marginTop: 6 }}>{label}</div>
    </div>
  );
}
```

### Step 2: Barrel + commit

Add to `src/components/analytics/index.ts`:

```ts
export { default as LiveTile } from "./LiveTile";
```

```bash
npm run lint && npm run typecheck && npm run build
git add src/components/analytics/LiveTile.jsx src/components/analytics/index.ts
git commit -m "feat(analytics): LiveTile component (F6)

Tile genérico para métricas con pulse-dot opcional cuando 'live' es true
y tick animation cuando el value cambia (signals realtime delta). Tones:
default/good/warn/bad/live. Respeta prefers-reduced-motion. Reusable por
PulseStrip (Director Overview) y LiveCommandCenter (/school/live).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `PulseStrip` component + wire en Director Overview

**Files:**
- Create: `src/components/analytics/PulseStrip.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/Director.jsx`

`PulseStrip` consume `useTodayPulse` + `useActiveSession` y renderiza 4 tiles: Sesiones de hoy · % correcto del día · Top clase · Top alumno. Si hay sesión activa, un 5to tile/badge "EN VIVO" linkea a `/school/live`.

### Step 1: Write `src/components/analytics/PulseStrip.jsx`

```jsx
// src/components/analytics/PulseStrip.jsx
//
// F6 Analytics Studio: franja "Pulso de hoy" para el Overview tab del
// Director. Resumen visual del día con 4 tiles + un link a /school/live
// cuando hay sesión activa.

import { useNavigate } from "react-router-dom";
import { useTodayPulse } from "../../hooks/useTodayPulse";
import { computeTodayPulse } from "../../lib/analytics/pulse-of-today";
import LiveTile from "./LiveTile";
import { buildRoute } from "../../routes";

const ACCENT = "#7c3aed";

export default function PulseStrip() {
  const navigate = useNavigate();
  const { data, isPending } = useTodayPulse();

  const pulse = data
    ? computeTodayPulse({
        sessions: data.sessions,
        responses: data.responses,
        classes: data.classes,
      })
    : null;

  if (isPending && !pulse) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e4e4e7",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          opacity: 0.55,
          fontSize: 13,
        }}
      >
        Cargando el pulso de hoy…
      </div>
    );
  }

  if (!pulse) return null;

  const tiles = [
    {
      label: "Sesiones de hoy",
      value: pulse.completed_sessions + pulse.active_sessions,
      unit: pulse.has_active ? "activa" : "",
      tone: pulse.has_active ? "live" : "default",
    },
    {
      label: "% correcto hoy",
      value: pulse.pct_correct_today != null ? pulse.pct_correct_today : "—",
      unit: pulse.pct_correct_today != null ? "%" : "",
      tone:
        pulse.pct_correct_today == null
          ? "default"
          : pulse.pct_correct_today >= 70
            ? "good"
            : pulse.pct_correct_today >= 40
              ? "warn"
              : "bad",
    },
    {
      label: "Top clase",
      value: pulse.top_class?.name || "—",
      unit: pulse.top_class ? `${pulse.top_class.response_count} resp.` : "",
    },
    {
      label: "Top alumno",
      value: pulse.top_student?.name || "—",
      unit: pulse.top_student ? `${pulse.top_student.pct_correct}%` : "",
      tone: pulse.top_student ? "good" : "default",
    },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: ACCENT,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Pulso de hoy
        </div>
        {pulse.has_active && (
          <button
            onClick={() => navigate(buildRoute.analyticsLive())}
            style={{
              border: "1px solid #c4b5fd",
              background: "#f5f3ff",
              color: "#5b21b6",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#7c3aed",
                display: "inline-block",
              }}
            />
            En vivo
          </button>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {tiles.map((t, i) => (
          <LiveTile
            key={i}
            label={t.label}
            value={t.value}
            unit={t.unit}
            tone={t.tone}
            live={pulse.has_active && i === 0}
            onClick={
              i === 0 && pulse.has_active
                ? () => navigate(buildRoute.analyticsLive())
                : null
            }
          />
        ))}
      </div>
    </div>
  );
}
```

### Step 2: Update `src/components/analytics/index.ts`

Add:

```ts
export { default as PulseStrip } from "./PulseStrip";
```

### Step 3: Wire `PulseStrip` en Director.jsx Overview tab

Read `src/pages/Director.jsx`. Find the line that starts the Overview tab (around line 199-200, `{tab === "overview" && (`). Add `<PulseStrip />` as the FIRST child of that block, BEFORE the existing KPI grid `<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))"...`.

Also add the import at the top:

```jsx
import { StudioShell, PulseStrip } from "../components/analytics";
```

(Change the existing `import { StudioShell } from "../components/analytics";` to include `PulseStrip`.)

The Overview block becomes:

```jsx
{/* Overview */}
{tab === "overview" && (
  <div className="fade-up">
    <PulseStrip />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
      {/* ...existing KPI tiles... */}
    </div>
    {/* ...rest of overview... */}
  </div>
)}
```

### Step 4: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/PulseStrip.jsx \
        src/components/analytics/index.ts \
        src/pages/Director.jsx
git commit -m "feat(analytics): PulseStrip en Director Overview (F6)

Franja 'Pulso de hoy' arriba del KPI grid en la pestaña Overview del
Director. 4 tiles (sesiones / % correcto / top clase / top alumno) +
chip 'En vivo' linkeado a /school/live cuando hay sesión activa. El
tile 'Sesiones de hoy' tiene pulse-dot cuando hay activa y es clickeable
también. Consume useTodayPulse + computeTodayPulse.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `LiveCommandCenter` page

**Files:**
- Create: `src/pages/analytics/LiveCommandCenter.jsx`

Vista en `/school/live`. Dos estados:

**A. Hay sesión activa:** banner + 4 tiles realtime (joined / responding / done / % correcto en vivo) + alertas si pregunta con > 60% error → chip "Generar repaso" que reusa `generateClassReviewQuestions` + `saveClassReviewDeck` de F5.

**B. Sin sesión activa:** muestra Pulso de hoy expandido (mismos 4 tiles que PulseStrip pero más grandes) + un mensaje calmo "Sin sesiones activas ahora mismo. Lanzá una desde Sesiones para ver tiles en vivo acá."

### Step 1: Write `src/pages/analytics/LiveCommandCenter.jsx`

```jsx
// src/pages/analytics/LiveCommandCenter.jsx
//
// F6 Analytics Studio: vista En vivo / Command Center en /school/live.
// - Si hay sesión activa: tiles realtime + alertas accionables.
// - Si no: pulso de hoy expandido + estado vacío calmo.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import LiveTile from "../../components/analytics/LiveTile";
import { useTodayPulse } from "../../hooks/useTodayPulse";
import { useActiveSession } from "../../hooks/useActiveSession";
import { useLiveSession } from "../../hooks/useLiveSession";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { computeTodayPulse } from "../../lib/analytics/pulse-of-today";
import {
  generateClassReviewQuestions,
  saveClassReviewDeck,
} from "../../lib/close-unit-ai";
import { buildRoute, ROUTES } from "../../routes";

const ACCENT = "#7c3aed";

export default function LiveCommandCenter({ profile = null }) {
  const navigate = useNavigate();
  const activeQ = useActiveSession();
  const pulseQ = useTodayPulse();
  const overviewQ = useAnalyticsOverview();

  const sessionId = activeQ.data?.id || null;
  const live = useLiveSession(sessionId);

  // Aggregate live counts
  const counts = useMemo(() => {
    const joined = live.participants.filter((p) => !p.is_kicked).length;
    const done = live.participants.filter((p) => p.completed_at).length;
    const responding = Math.max(0, joined - done);
    let sumPoints = 0;
    let sumMax = 0;
    for (const r of live.responses) {
      if (Number.isFinite(Number(r?.points))) sumPoints += Number(r.points);
      if (Number.isFinite(Number(r?.max_points))) sumMax += Number(r.max_points);
    }
    const pct = sumMax > 0 ? Math.round((sumPoints / sumMax) * 100) : null;
    return { joined, done, responding, pct };
  }, [live.participants, live.responses]);

  // Detect "alert question" = question_index with >= 60% error among >= 3 responders
  const alertQuestions = useMemo(() => {
    const byQ = new Map();
    for (const r of live.responses) {
      const key = r.question_index;
      if (key == null) continue;
      const cur = byQ.get(key) || { wrong: 0, total: 0 };
      cur.total += 1;
      if (!r.is_correct) cur.wrong += 1;
      byQ.set(key, cur);
    }
    return [...byQ.entries()]
      .filter(([, v]) => v.total >= 3 && v.wrong / v.total >= 0.6)
      .map(([qi, v]) => ({
        question_index: qi,
        error_rate: Math.round((v.wrong / v.total) * 100),
      }));
  }, [live.responses]);

  const [generating, setGenerating] = useState(false);

  async function handleQuickReview() {
    if (generating || !activeQ.data?.class_id) return;
    setGenerating(true);
    // Resolve class object for the generator (needs subject/grade).
    const row = (overviewQ.data ?? []).find(
      (r) => r.class_id === activeQ.data.class_id,
    );
    const cObj = row
      ? {
          id: row.class_id,
          name: row.class_name || "",
          subject: row.class_subject || "",
          grade: row.class_grade || "",
        }
      : { id: activeQ.data.class_id, name: "", subject: "", grade: "" };
    // Use the active session topic as the only weak topic seed for the prompt.
    const weakTopics = activeQ.data.topic ? [activeQ.data.topic] : [];
    const gen = await generateClassReviewQuestions({ classObj: cObj, weakTopics, lang: "es" });
    if (!gen.ok) { setGenerating(false); return; }
    const save = await saveClassReviewDeck({
      classObj: cObj,
      questions: gen.questions,
      lang: gen.inferredLang || "es",
      authorId: profile?.id ?? null,
    });
    setGenerating(false);
    if (save.ok) navigate(buildRoute.deckEdit(save.deckId));
  }

  const pulse = pulseQ.data
    ? computeTodayPulse({
        sessions: pulseQ.data.sessions,
        responses: pulseQ.data.responses,
        classes: pulseQ.data.classes,
      })
    : null;

  return (
    <StudioShell view="live" title="En vivo">
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
        {sessionId ? (
          <>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e4e4e7",
                borderLeft: `3px solid ${ACCENT}`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: live.isLive ? "#7c3aed" : "#a1a1aa",
                  display: "inline-block",
                }}
              />
              <b>{activeQ.data?.topic || "Sesión activa"}</b>
              <span style={{ color: "#71717a" }}>
                · {live.isLive ? "recibiendo updates en vivo" : "conectando…"}
              </span>
              <button
                onClick={() => navigate(buildRoute.sessionsLive(sessionId))}
                style={{
                  marginLeft: "auto",
                  border: "1px solid #c4b5fd",
                  background: "#f5f3ff",
                  color: "#5b21b6",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Volver a la sesión
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <LiveTile label="Conectados" value={counts.joined} live={live.isLive} tone="live" />
              <LiveTile label="Respondiendo" value={counts.responding} live={live.isLive} />
              <LiveTile label="Terminaron" value={counts.done} live={live.isLive} tone="good" />
              <LiveTile
                label="% correcto en vivo"
                value={counts.pct != null ? counts.pct : "—"}
                unit={counts.pct != null ? "%" : ""}
                live={live.isLive}
                tone={
                  counts.pct == null
                    ? "default"
                    : counts.pct >= 70
                      ? "good"
                      : counts.pct >= 40
                        ? "warn"
                        : "bad"
                }
              />
            </div>

            {alertQuestions.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e4e4e7",
                  borderLeft: "3px solid #dc2626",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Alertas de la sesión
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, lineHeight: 1.6 }}>
                  {alertQuestions.map((a) => (
                    <li key={a.question_index}>
                      Pregunta {a.question_index + 1}: <b>{a.error_rate}%</b> de error.
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={handleQuickReview}
                    disabled={generating}
                    style={{
                      border: "1px solid #c4b5fd",
                      background: "#f5f3ff",
                      color: "#5b21b6",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: generating ? "wait" : "pointer",
                    }}
                  >
                    {generating ? "Generando repaso…" : "Lanzar repaso"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e4e4e7",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 12,
                fontSize: 14,
                color: "#52525b",
              }}
            >
              Sin sesiones activas ahora mismo. Lanzá una desde{" "}
              <button
                onClick={() => navigate(ROUTES.SESSIONS)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 14,
                }}
              >
                Sesiones
              </button>{" "}
              para ver tiles en vivo acá.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              <LiveTile
                label="Sesiones de hoy"
                value={pulse ? pulse.completed_sessions + pulse.active_sessions : "—"}
              />
              <LiveTile
                label="% correcto hoy"
                value={pulse?.pct_correct_today != null ? pulse.pct_correct_today : "—"}
                unit={pulse?.pct_correct_today != null ? "%" : ""}
                tone={
                  pulse?.pct_correct_today == null
                    ? "default"
                    : pulse.pct_correct_today >= 70
                      ? "good"
                      : pulse.pct_correct_today >= 40
                        ? "warn"
                        : "bad"
                }
              />
              <LiveTile
                label="Top clase"
                value={pulse?.top_class?.name || "—"}
                unit={pulse?.top_class ? `${pulse.top_class.response_count} resp.` : ""}
              />
              <LiveTile
                label="Top alumno"
                value={pulse?.top_student?.name || "—"}
                unit={pulse?.top_student ? `${pulse.top_student.pct_correct}%` : ""}
                tone={pulse?.top_student ? "good" : "default"}
              />
            </div>
          </>
        )}
      </div>
    </StudioShell>
  );
}
```

### Step 2: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/pages/analytics/LiveCommandCenter.jsx
git commit -m "feat(analytics): LiveCommandCenter view /school/live (F6)

Dos estados: (a) hay sesión activa → tiles realtime (conectados,
respondiendo, terminaron, % correcto en vivo) + alertas si >60% error
en >=3 respuestas con chip 'Lanzar repaso' usando generateClassReviewQuestions
+ saveClassReviewDeck de F5. (b) sin sesión → pulso de hoy expandido +
mensaje calmo con link a /sessions.

Reusa useActiveSession + useLiveSession + useTodayPulse + useAnalyticsOverview.
Sin SQL nuevo.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Route wiring (`/school/live`)

**Files:**
- Modify: `src/routes.ts`
- Modify: `src/App.jsx`

Mismo patrón que `/school/ask` (F5 Task 15).

### Step 1: Edit `src/routes.ts`

**A.** En el bloque `ROUTES` (después de `ANALYTICS_ASK` si existe; si no, después de `SCHOOL`), agregar:

```ts
ANALYTICS_LIVE: "/school/live",
```

**B.** En el bloque `ROUTE_PATTERNS`, agregar:

```ts
ANALYTICS_LIVE: "/school/live",
```

**C.** En `buildRoute`, agregar:

```ts
analyticsLive: () => `/school/live`,
```

**D.** En `pathToPage`, agregar ANTES del `if (pathname === "/school")` (más específico primero):

```ts
if (pathname === "/school/live") return "analyticsLive";
```

**E.** En `TEACHER_ONLY_PAGES` set, agregar:

```ts
"analyticsLive",
```

### Step 2: Edit `src/App.jsx`

**A.** Add lazy import near the other analytics imports (around the existing `importCleoAnalyst` / `importClassDetail` block, if any, or near `importTopicMastery`):

```jsx
const importLiveCommandCenter = () => import('./pages/analytics/LiveCommandCenter');
const LiveCommandCenter = lazy(importLiveCommandCenter);
```

**B.** Add `analyticsLive: LiveCommandCenter` to the `COMPONENTS` object.

**C.** Optionally add `"analyticsLive"` to `COMPACT_PAGES` set (the live tiles are info-dense — yes, add it).

### Step 3: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/routes.ts src/App.jsx
git commit -m "feat(analytics): route /school/live → LiveCommandCenter (F6)

ROUTES.ANALYTICS_LIVE + ROUTE_PATTERNS + pathToPage + TEACHER_ONLY_PAGES +
buildRoute.analyticsLive. App.jsx lazy import + COMPONENTS entry. Compact
density (info-dense tiles).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Final gates + Code Review subagent + PR

### Step 1: Final gates

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: 0 lint errors, 0 typecheck errors, ≥402 tests passing (~394 from F5 + ~8 new pulse-of-today tests), build clean.

### Step 2: Dispatch final code review subagent

Diff range: `main..HEAD` on `claude/analytics-studio-f6`.

Focus areas:
- **`pulse-of-today.ts` math:** topClassByActivity tie-breaking, topStudentByPctCorrect noise floor (>= 3), computeTodayPulse handles empty inputs gracefully.
- **`useTodayPulse` query shape:** the `.or(...)` filter syntax for Supabase JS (verify it compiles to PostgREST correctly), the class_id enrichment correctness.
- **`useLiveSession` cleanup:** removeChannel called on unmount AND when sessionId changes (effect deps).
- **`LiveTile` reduced-motion:** the @keyframes animations respect prefers-reduced-motion.
- **`PulseStrip` empty states:** loading state visible, null data doesn't crash.
- **`LiveCommandCenter` active-vs-empty branching:** doesn't subscribe to a channel when sessionId is null.
- **Alert threshold (60% error, 3+ responses):** reasonable; no off-by-one.
- **Quick review button:** reuses F5's generator with proper `authorId` from profile prop (drilled like F5 fix #73 did).

### Step 3: Push + open PR

```bash
git push -u origin claude/analytics-studio-f6
gh pr create --base main --head claude/analytics-studio-f6 \
  --title "feat(analytics): Analytics Studio F6 — En vivo / Command Center" \
  --body "$(cat <<'EOF'
## Summary

Analytics Studio Fase 6 — el pilar 'En vivo'. Cero SQL nuevo. Tres entregables:

- **Franja 'Pulso de hoy'** en la pestaña Overview del Director (4 tiles: sesiones hoy, % correcto del día, top clase, top alumno + chip 'En vivo' cuando hay sesión activa).
- **Vista Live Command Center** en \`/school/live\` con tiles realtime (\`useLiveSession\` via Supabase channels — mismo patrón que SessionFlow.jsx) cuando hay sesión activa, o pulso de hoy expandido cuando no.
- **Alertas accionables**: una pregunta con >= 60% error en >= 3 respuestas dispara un chip 'Lanzar repaso' que reusa \`generateClassReviewQuestions\` + \`saveClassReviewDeck\` de F5.

### Libs puras nuevas (con tests)
- \`src/lib/analytics/pulse-of-today.ts\` (\`computeTodayPulse\`, \`topClassByActivity\`, \`topStudentByPctCorrect\`) — 8 tests.

### Hooks nuevos
- \`useTodayPulse\` — SELECT directo sobre sessions+responses+classes filtrado a hoy (RLS por teacher_id es el tenant guard).
- \`useActiveSession\` — sesión activa más reciente (24h gating contra zombies).
- \`useLiveSession\` — channels postgres_changes sobre participants+responses para una sesión.

### Components nuevos
- \`LiveTile\` — tile genérico con pulse-dot opcional + tick animation cuando cambia el value.
- \`PulseStrip\` — la franja del Director Overview.

### Page nueva
- \`LiveCommandCenter\` en \`/school/live\`.

### Out of scope
- Historical replay (yesterday's recap) — solo 'hoy'.
- Multi-session simultaneous live (asume 1 sesión a la vez por docente; si hay 2, toma la más reciente).
- Live sparkline chart (solo tiles count en F6).
- Sound/haptic alerts.
- Push notifications.

## Test plan

- [ ] \`npm run test:run\` → ≥402 passing.
- [ ] \`npm run lint && npm run typecheck && npm run build\` clean.
- [ ] /school muestra Pulso de hoy strip arriba del Overview tab.
- [ ] /school/live con sesión activa muestra los 4 tiles updateando en vivo.
- [ ] /school/live sin sesión activa muestra pulso de hoy expandido.
- [ ] Pregunta con >60% error en sesión activa dispara la alerta.
- [ ] Chip 'Lanzar repaso' crea deck y navega al editor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec Coverage Self-Review

| Spec §8.4 F6 deliverable | Task |
|--------------------------|------|
| Tiles realtime (joined / responding / done / % correcto en vivo) | Tasks 3, 4, 6 |
| 'Pulso de hoy' strip en Resumen | Tasks 1, 2, 5 |
| Realtime via Supabase channels (reusa SessionFlow.jsx pattern) | Task 3 |
| Alertas accionables (>60% error → 'Lanzar repaso') | Task 6 |
| Sin SQL nuevo | (entire plan) |
| Sin infra nueva | (entire plan) |

All §8.4 mapped.

## Open notes

- **Active session detection:** se reusa el mismo gating de 24h que App.jsx ya aplica para el sidebar shortcut. Si más adelante ese gate cambia, ambos lugares hay que sincronizar.
- **Alert threshold (>=60% error, >=3 responses):** umbral inicial; ajustar tras observar tráfico real.
- **Channel naming:** `live-tiles:${sessionId}` — distinto de los canales que SessionFlow.jsx ya usa (`lobby:${id}`, `live-themed:${id}`) para no colisionar. Múltiples docentes pueden tener canales paralelos.
- **`refetchInterval` de useTodayPulse:** 60s es prudente. Si el docente tiene la página abierta durante una sesión activa, los counts en la franja se desactualizan hasta el próximo refetch — pero el chip 'En vivo' los lleva a /school/live donde sí hay realtime.
- **No memoization** de `compute` en PulseStrip — `computeTodayPulse` es puro y barato; React Query ya cachea el input. Si el perfil rinde mal con muchas responses, agregar `useMemo`.
- **classes overview reuse:** `useTodayPulse` hace su propio SELECT de classes (necesita nombres). Podría reusar `useAnalyticsOverview` que ya tiene clases cacheadas, pero para mantener `useTodayPulse` autosuficiente F6 hace su propio fetch ligero (solo id + name).
