# Analytics Studio — Fase 9 (Pulido de producto) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar las vistas de Analytics de "funcionan pero se sienten a medio terminar" a "producto pulido": (1) **skeletons** de carga en las sub-páginas (hoy muestran "Cargando…" en texto plano); (2) **responsive/mobile** (hoy el StudioShell tiene un sidebar fijo de 168px que rompe en celular, y KpiBand usa 5 columnas fijas que se desbordan); (3) **count-up** en los números de los KPIs (con respeto a `prefers-reduced-motion`); (4) un **barrido de reduced-motion** + **empty states** mejores.

**Architecture:** **Cero SQL, cero deps nuevas.** El count-up tiene su easing en una lib pura testeable (`count-up.ts`) y un componente `AnimatedNumber` que se pasa como `value` ReactNode a `StatCardWithSparkline` (sin tocar ese componente). Skeletons reusan el `<Skeleton>` existente (`src/components/ui/Skeleton.jsx`) envueltos en un `StudioSkeleton` con la rítmica de cada vista. El responsive usa el `useIsMobile()` ya existente + grids `auto-fit`. Sin god-files.

**Tech Stack:** React 18, vitest, `useIsMobile` (existente), `Skeleton`/`SkeletonText` (existentes). Sin librerías nuevas.

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §5.2 (updates suaves, prefers-reduced-motion) + estándar de producto (loading skeletons, responsive). Continúa la ronda 2 (post-F8).

**Branch:** `claude/analytics-studio-f9` — **FRESH off main** (`c5a393c`, post F8).

**Depends on:** F1 (KpiBand, StatCardWithSparkline, las sub-pages), F2 (StudentKpiBand, StudentProfile), F8 (no conflict — F9 toca loading/layout, F8 tocó interactividad).

---

## Decisiones de diseño (tomadas)

| Decisión | Valor | Razón |
|----------|-------|-------|
| Count-up API | `<AnimatedNumber value={rawNumber} format={fn} />` pasado como `value` ReactNode a StatCardWithSparkline. | StatCard ya renderiza `{value}` — un ReactNode funciona sin tocarlo. KpiBand pasa el número crudo + formatter. |
| Count-up + reduced-motion | Si `prefers-reduced-motion` o no hay `requestAnimationFrame`, renderiza `format(value)` directo (sin animar). | Accesibilidad + SSR/test safety. |
| Skeleton scope | Un `StudioSkeleton` con variantes (`class`/`student`/`topic`/`reports`) reusando `<Skeleton>`. | DRY; cada sub-page muestra el suyo en loading. |
| Responsive sidebar | En mobile (`useIsMobile`), el sub-nav del StudioShell pasa de columna lateral fija a una fila horizontal scrollable arriba. | El sidebar fijo de 168px es el peor ofensor en celular. |
| KpiBand columnas | `repeat(auto-fit, minmax(132px, 1fr))` en vez de `repeat(5, 1fr)`. | Se acomoda solo en cualquier ancho sin desbordar. |
| Count-up alcance | Solo KpiBand + StudentKpiBand (los números grandes de entrada). NO los de tablas/listas. | Donde el delight aporta; evitar ruido. |

---

## Pre-task: File Structure

**Create (3 files):**

```
src/lib/analytics/
  count-up.ts                              # NEW: easeOutCubic + sampleCountUp (pure)
  __tests__/count-up.test.ts               # NEW

src/components/analytics/
  AnimatedNumber.jsx                       # NEW: count-up ReactNode (rAF + reduced-motion guard)
  StudioSkeleton.jsx                       # NEW: loading skeleton variants for the studio views
```

**Modify (10 files):**

```
src/lib/analytics/index.ts                 # +export count-up
src/components/analytics/index.ts          # +export AnimatedNumber, StudioSkeleton
src/components/analytics/StudioShell.jsx   # responsive: mobile horizontal sub-nav
src/components/analytics/KpiBand.jsx       # auto-fit columns + AnimatedNumber values
src/components/analytics/StudentKpiBand.jsx# auto-fit columns + AnimatedNumber values
src/components/charts/TrendBarChart.jsx    # guard the bar transition under reduced-motion (it has none today actually — verify; the recharts Bar isAnimationActive)
src/pages/analytics/ClassDetail.jsx        # StudioSkeleton in loading + responsive grids
src/pages/analytics/StudentProfile.jsx     # StudioSkeleton in loading + responsive grids
src/pages/analytics/TopicMastery.jsx       # StudioSkeleton in loading
src/pages/analytics/Reports.jsx            # StudioSkeleton (or Skeleton) in loading + responsive
```

**Out of scope for F9 (explicit):**
- **Director (overview) rebuild** to Semrush rhythm — that's area "Resumen cohesivo", NOT chosen this round.
- **Data depth** (ai_generations/scans/achievements) — area not chosen.
- **CleoAnalyst mobile chat polish** beyond the shell responsive — its layout is already simple.
- **Count-up on every number** — only the KPI bands.
- **Mobile-specific table layouts** (card view) — F9 makes tables scroll horizontally within their card on mobile; a full card-per-row mobile redesign is a follow-up.

---

## Task 1: TDD — `count-up.ts` pure easing + `AnimatedNumber` component

**Files:**
- Test: `src/lib/analytics/__tests__/count-up.test.ts`
- Create: `src/lib/analytics/count-up.ts`
- Create: `src/components/analytics/AnimatedNumber.jsx`
- Modify: `src/components/analytics/index.ts`

### Step 1: Write failing tests for the pure easing

Create `src/lib/analytics/__tests__/count-up.test.ts`:

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { easeOutCubic, sampleCountUp } from "../count-up";

describe("easeOutCubic", () => {
  it("is 0 at t=0 and 1 at t=1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });
  it("clamps out-of-range t", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
  it("is past the midpoint at t=0.5 (ease-out front-loads)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("sampleCountUp", () => {
  it("returns `from` at elapsed 0 and `to` at/after duration", () => {
    expect(sampleCountUp(0, 100, 0, 1000)).toBe(0);
    expect(sampleCountUp(0, 100, 1000, 1000)).toBe(100);
    expect(sampleCountUp(0, 100, 2000, 1000)).toBe(100);
  });
  it("interpolates with easing partway through", () => {
    const mid = sampleCountUp(0, 100, 500, 1000); // 50% time → eased > 50 value
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(100);
  });
  it("handles a non-zero `from`", () => {
    expect(sampleCountUp(40, 80, 0, 1000)).toBe(40);
    expect(sampleCountUp(40, 80, 1000, 1000)).toBe(80);
  });
  it("returns `to` immediately when duration is 0", () => {
    expect(sampleCountUp(0, 100, 0, 0)).toBe(100);
  });
});
```

### Step 2: Run; expect red

```bash
npm run test:run -- src/lib/analytics
```

### Step 3: Implement `src/lib/analytics/count-up.ts`

```ts
// ─── src/lib/analytics/count-up.ts ─────────────────────────────────────
// Easing puro + sampler para el count-up de los KPIs. Sin React, sin
// Supabase, sin rAF (el componente AnimatedNumber maneja el rAF y llama
// a sampleCountUp en cada frame). Testeable sin DOM.

/** Ease-out cubic, clamp a [0,1]. f(0)=0, f(1)=1, front-loaded. */
export function easeOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const u = 1 - t;
  return 1 - u * u * u;
}

/**
 * Valor interpolado del count-up en el instante `elapsed` (ms) de una
 * animación de `from` → `to` que dura `duration` ms. elapsed<=0 → from;
 * elapsed>=duration (o duration 0) → to. Usa easeOutCubic sobre el tiempo.
 */
export function sampleCountUp(
  from: number,
  to: number,
  elapsed: number,
  duration: number,
): number {
  if (duration <= 0 || elapsed >= duration) return to;
  if (elapsed <= 0) return from;
  const eased = easeOutCubic(elapsed / duration);
  return from + (to - from) * eased;
}
```

### Step 4: Run tests; expect green

```bash
npm run test:run -- src/lib/analytics
```

Expected: previous (~99 from F8) + ~8 count-up = ≥107 passing.

### Step 5: Implement `src/components/analytics/AnimatedNumber.jsx`

```jsx
// src/components/analytics/AnimatedNumber.jsx
//
// F9 Analytics Studio: número que cuenta hacia su valor al montar / cambiar.
// Se pasa como el `value` (ReactNode) de StatCardWithSparkline — no hace
// falta tocar ese componente. Respeta prefers-reduced-motion (muestra el
// valor final directo) y degrada con gracia si no hay requestAnimationFrame
// (SSR / tests).
//
// Props:
//   value: number  — el target (número crudo, ej. 78, 11400).
//   format: (n) => string  — formatea el número actual (ej. formatPercent).
//   duration?: ms (default 650)
//
// La animación va de `from` (el valor previo, o 0 en el primer mount) a
// `value`. Si value no es finito, muestra format(value) tal cual.

import { useEffect, useRef, useState } from "react";
import { sampleCountUp } from "../../lib/analytics/count-up";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function AnimatedNumber({ value, format = (n) => String(n), duration = 650 }) {
  const target = Number(value);
  const finite = Number.isFinite(target);
  const prevRef = useRef(finite ? target : 0);
  const [display, setDisplay] = useState(finite ? target : 0);

  useEffect(() => {
    if (!finite) return undefined;
    const from = prevRef.current;
    prevRef.current = target;

    // Reduced-motion o sin rAF → salto directo al valor final.
    if (
      prefersReducedMotion() ||
      typeof window === "undefined" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      setDisplay(target);
      return undefined;
    }
    if (from === target) {
      setDisplay(target);
      return undefined;
    }

    let raf = 0;
    let start = null;
    const tick = (ts) => {
      if (start == null) start = ts;
      const elapsed = ts - start;
      const v = sampleCountUp(from, target, elapsed, duration);
      setDisplay(v);
      if (elapsed < duration) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, finite, duration]);

  if (!finite) return <>{format(value)}</>;
  return <>{format(display)}</>;
}
```

### Step 6: Barrel + commit

Add to `src/lib/analytics/index.ts`:
```ts
export * from "./count-up";
```
Add to `src/components/analytics/index.ts`:
```ts
export { default as AnimatedNumber } from "./AnimatedNumber";
```

Gates (lint + typecheck + test + build), then:

```bash
git add src/lib/analytics/count-up.ts src/lib/analytics/__tests__/count-up.test.ts \
        src/components/analytics/AnimatedNumber.jsx \
        src/lib/analytics/index.ts src/components/analytics/index.ts
git commit -m "feat(analytics): count-up.ts + AnimatedNumber (F9)

easeOutCubic + sampleCountUp puros (TDD, ~8 tests). AnimatedNumber:
ReactNode que cuenta hacia su valor con rAF, se pasa como value de
StatCardWithSparkline (sin tocarlo). Respeta prefers-reduced-motion
(salto directo) y degrada sin requestAnimationFrame (SSR/tests).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Wire `AnimatedNumber` en KpiBand + StudentKpiBand + auto-fit columns

**Files:**
- Modify: `src/components/analytics/KpiBand.jsx`
- Modify: `src/components/analytics/StudentKpiBand.jsx`

Cambiar los `value={formatPercent(kpis.pct_correct)}` (string) por `value={<AnimatedNumber value={kpis.pct_correct} format={formatPercent} />}` (ReactNode). Y la grilla de `repeat(5, 1fr)` a `repeat(auto-fit, minmax(132px, 1fr))`.

### Step 1: Update `src/components/analytics/KpiBand.jsx`

Add import:
```jsx
import AnimatedNumber from "./AnimatedNumber";
```

Change the grid container:
```jsx
// FROM:
<div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
// TO:
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 8 }}>
```

Change the numeric tile values to use AnimatedNumber (raw value + formatter). The 4 numeric tiles:
```jsx
<StatCardWithSparkline
  label="% correcto"
  value={<AnimatedNumber value={kpis.pct_correct} format={formatPercent} />}
  sparkPoints={pctSpark}
  delta={pctCorrectDelta}
/>
<StatCardWithSparkline
  label="Participación"
  value={<AnimatedNumber value={kpis.unique_participants} format={formatNumber} />}
  sparkPoints={participationSpark}
  delta={deltaProps("unique_participants")}
/>
<StatCardWithSparkline
  label="Respuestas"
  value={<AnimatedNumber value={kpis.responses_total} format={formatNumber} />}
  sparkPoints={sessionsSpark}
  delta={deltaProps("responses_total")}
/>
<StatCardWithSparkline
  label="Tiempo promedio"
  value={<AnimatedNumber value={kpis.avg_time_ms} format={formatDurationShort} />}
  delta={deltaProps("avg_time_ms")}
/>
<StatCardWithSparkline
  label="Temas en riesgo"
  value={<AnimatedNumber value={atRiskTopics} format={formatNumber} />}
  tone={atRiskTopics > 0 ? "danger" : "default"}
/>
```

(`formatPercent`, `formatNumber`, `formatDurationShort` are already imported. They all handle null/NaN gracefully — `AnimatedNumber` passes the raw value through `format` when non-finite, so a null kpi shows "—" exactly as before.)

### Step 2: Update `src/components/analytics/StudentKpiBand.jsx`

Read the file first. It has a similar grid + StatCardWithSparkline tiles. Apply the same two changes: (a) grid → `repeat(auto-fit, minmax(132px, 1fr))`, (b) wrap the numeric tile values in `<AnimatedNumber value={rawNumber} format={fn} />`. Keep the "Δ vs clase" tile and any non-numeric tiles as-is. Import AnimatedNumber.

(The exact tiles depend on the file — the implementer reads it and wraps each numeric `value={formatX(d.kpis.Y)}` with AnimatedNumber, mirroring KpiBand.)

### Step 3: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/KpiBand.jsx src/components/analytics/StudentKpiBand.jsx
git commit -m "feat(analytics): count-up + auto-fit columns en KpiBand/StudentKpiBand (F9)

Los números de los KPIs cuentan hacia su valor (AnimatedNumber con el
número crudo + el formatter; reduced-motion lo salta). Grilla pasa de
repeat(5,1fr) (se desbordaba en pantallas chicas) a repeat(auto-fit,
minmax(132px,1fr)) — se acomoda sola en cualquier ancho.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `StudioSkeleton` + wire en las sub-páginas

**Files:**
- Create: `src/components/analytics/StudioSkeleton.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/pages/analytics/StudentProfile.jsx`
- Modify: `src/pages/analytics/TopicMastery.jsx`
- Modify: `src/pages/analytics/Reports.jsx`

### Step 1: Create `src/components/analytics/StudioSkeleton.jsx`

```jsx
// src/components/analytics/StudioSkeleton.jsx
//
// F9 Analytics Studio: skeleton de carga para las sub-vistas. Reemplaza
// el "Cargando…" en texto plano por bloques shimmer con la rítmica de la
// vista. Reusa <Skeleton> (src/components/ui/Skeleton.jsx), que ya respeta
// prefers-reduced-motion (shimmer off).
//
// Props:
//   variant: "class" | "student" | "topic" | "reports"  (default "class")

import Skeleton from "../ui/Skeleton";

function KpiRow({ count = 5 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={84} radius={8} />
      ))}
    </div>
  );
}

export default function StudioSkeleton({ variant = "class" }) {
  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      {variant === "reports" ? (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
          <Skeleton height={320} radius={8} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={56} radius={8} />
            <Skeleton height={56} radius={8} />
            <Skeleton height={56} radius={8} />
          </div>
        </div>
      ) : (
        <>
          <KpiRow count={variant === "topic" ? 3 : 5} />
          {variant !== "topic" && <Skeleton height={56} radius={8} />}
          <div style={{ display: "grid", gridTemplateColumns: variant === "student" ? "1fr" : "2fr 1fr", gap: 10 }}>
            <Skeleton height={200} radius={8} />
            {variant !== "student" && <Skeleton height={200} radius={8} />}
          </div>
          <Skeleton height={180} radius={8} />
        </>
      )}
    </div>
  );
}
```

### Step 2: Barrel

Add to `src/components/analytics/index.ts`:
```ts
export { default as StudioSkeleton } from "./StudioSkeleton";
```

### Step 3: Wire into the 4 sub-pages

Each page currently has a loading branch like `{loading && !data ? (<div ...>Cargando…</div>) : (...)}`. Replace the text node with `<StudioSkeleton variant="X" />` (inside the StudioShell, so the shell chrome stays).

**ClassDetail.jsx** — find `Cargando análisis de la clase…` and replace that `<div>` with:
```jsx
<StudioSkeleton variant="class" />
```
(import: `import { StudioSkeleton } from "../../components/analytics";` — or direct import. The barrel exports it.)

**StudentProfile.jsx** — find `Cargando perfil del estudiante…` and replace with:
```jsx
<StudioSkeleton variant="student" />
```

**TopicMastery.jsx** — read it; find the loading text (likely "Cargando…") and replace with:
```jsx
<StudioSkeleton variant="topic" />
```

**Reports.jsx** — find `Cargando reportes…` and replace with:
```jsx
<StudioSkeleton variant="reports" />
```

For each: add the import (`import StudioSkeleton from "../../components/analytics/StudioSkeleton";` OR via the barrel). Keep the StudioShell wrapper — only the inner loading content changes.

### Step 4: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/StudioSkeleton.jsx src/components/analytics/index.ts \
        src/pages/analytics/ClassDetail.jsx src/pages/analytics/StudentProfile.jsx \
        src/pages/analytics/TopicMastery.jsx src/pages/analytics/Reports.jsx
git commit -m "feat(analytics): StudioSkeleton en las sub-páginas (F9)

Reemplaza el 'Cargando…' en texto plano de ClassDetail / StudentProfile /
TopicMastery / Reports por skeletons shimmer (variantes class/student/
topic/reports) que reusan <Skeleton> (ya respeta reduced-motion). El
chrome del StudioShell queda; solo cambia el contenido de carga.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Responsive — StudioShell mobile sub-nav + responsive grids

**Files:**
- Modify: `src/components/analytics/StudioShell.jsx`
- Modify: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/pages/analytics/StudentProfile.jsx`

### Step 1: StudioShell — horizontal sub-nav on mobile

Read `src/components/analytics/StudioShell.jsx`. It currently renders a fixed `flex: "0 0 168px"` `<nav>` to the left. On mobile, switch to a horizontal scrollable bar above the content.

Add `import { useIsMobile } from "../MobileMenuButton";` (that's where `useIsMobile` lives — confirm the path by checking how Director imports it: `import { useIsMobile } from "../components/MobileMenuButton";` → from inside `components/analytics/` it's `"../MobileMenuButton"`).

Inside the component:
```jsx
const isMobile = useIsMobile();
```

Change the outer layout: when `isMobile`, the wrapper is `flexDirection: "column"` and the nav is a horizontal scroll row; otherwise the current row layout. Concretely, wrap:

```jsx
<div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100%" }}>
  <nav
    aria-label="Analytics Studio"
    style={
      isMobile
        ? { display: "flex", gap: 4, overflowX: "auto", padding: "8px 12px", borderBottom: "1px solid #e4e4e7", background: "#fafafa", WebkitOverflowScrolling: "touch" }
        : { flex: "0 0 168px", padding: "16px 0", borderRight: "1px solid #e4e4e7", background: "#fafafa" }
    }
  >
    {/* On mobile, drop the "Analytics" eyebrow label (saves vertical space) */}
    {!isMobile && (
      <div style={{ padding: "0 16px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", opacity: 0.55 }}>
        Analytics
      </div>
    )}
    {NAV_ITEMS.map((item) => {
      // …existing item render… but the item's container style needs a mobile variant:
      // desktop: the current block (padding 8px 16px, borderLeft accent).
      // mobile: inline chip (padding 6px 12px, whiteSpace nowrap, borderBottom accent instead of left, flexShrink 0).
    })}
  </nav>
  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
    {/* header + main — unchanged */}
  </div>
</div>
```

For each NAV item, compute the style with a mobile branch. Replace the item's `style={{...}}` with:
```jsx
style={
  isMobile
    ? {
        padding: "6px 12px",
        whiteSpace: "nowrap",
        flexShrink: 0,
        fontWeight: active ? 600 : 400,
        color: active ? "#2563eb" : navigable ? "inherit" : "#a1a1aa",
        background: active ? "#eff6ff" : "transparent",
        borderRadius: 6,
        borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
        cursor: navigable && !active ? "pointer" : "default",
        fontSize: 13,
      }
    : {
        padding: "8px 16px",
        fontWeight: active ? 600 : 400,
        color: active ? "#2563eb" : navigable ? "inherit" : "#a1a1aa",
        background: active ? "#eff6ff" : "transparent",
        borderLeft: active ? "3px solid #2563eb" : "3px solid transparent",
        cursor: navigable && !active ? "pointer" : "default",
        fontSize: 14,
      }
}
```

(Keep the `role`/`tabIndex`/`onClick`/`onKeyDown`/`aria-current`/`title` from F8 — only `style` gets the mobile branch.)

Also wrap the `<main>` content in a min-width guard already present. The header toolbar already wraps; on mobile the PeriodChips + toolbarExtras may overflow — add `flexWrap: "wrap"` to the header's right-side container:

Find in the header:
```jsx
<div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
```
Change to:
```jsx
<div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
```

### Step 2: ClassDetail — responsive grids

In `src/pages/analytics/ClassDetail.jsx`, the two hard-coded grids:
- `gridTemplateColumns: "2fr 1fr"` (Trend + Composition)
- `gridTemplateColumns: "1fr 1fr 1fr"` (the 3 topic/missed panels)

Make them responsive with `auto-fit`/`minmax`:
```jsx
// Trend + composition row:
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
// 3-panel row:
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
```

(This lets them collapse to 1 column on narrow screens instead of squishing. The `2fr 1fr` intent is lost on wrap, but on wide screens auto-fit still gives a sensible multi-column layout; the trade-off favors mobile usability.)

### Step 3: StudentProfile — responsive grid

In `src/pages/analytics/StudentProfile.jsx`, the `gridTemplateColumns: "1fr 1fr"` (TopicBarList + StudentMostFailedList):
```jsx
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
```

### Step 4: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/StudioShell.jsx src/pages/analytics/ClassDetail.jsx src/pages/analytics/StudentProfile.jsx
git commit -m "feat(analytics): responsive StudioShell + grids (F9)

StudioShell: en mobile (useIsMobile) el sub-nav pasa de columna lateral
fija de 168px a una fila horizontal scrollable arriba (chips), y el
header right-side hace flex-wrap. ClassDetail + StudentProfile: las
grillas fijas (2fr 1fr, 1fr 1fr 1fr) pasan a repeat(auto-fit, minmax)
para colapsar a 1 columna en pantallas chicas sin desbordar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Reduced-motion sweep + empty-state polish + final gates + PR

**Files:**
- Modify: `src/components/charts/TrendBarChart.jsx` (recharts isAnimationActive guard)
- Modify: `src/components/charts/HorizontalBarList.jsx` (the bar has no transition today — skip if none)
- (any other inline `transition` on bars found)

### Step 1: Reduced-motion guard on recharts animations

Recharts animates bars/lines on mount by default (`isAnimationActive`). Under `prefers-reduced-motion` we should disable it. In `src/components/charts/TrendBarChart.jsx`, add a module-level helper and pass `isAnimationActive={!reduced}` to the `<Bar>`/`<Line>` elements:

```jsx
const reducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

Then on each `<Bar ...>` and `<Line ...>` add `isAnimationActive={!reducedMotion}`. (The forecast `<Line>` already has `isAnimationActive={false}` — leave it. Add the prop to the two `<Bar>`s and, if not present, keep the compare bar consistent.)

(Note: this reads matchMedia once at module load. That's acceptable — reduced-motion rarely changes mid-session. A more dynamic version would use a hook, but module-level is fine and avoids a re-render dependency.)

### Step 2: Empty-state polish

The sub-pages already have text empty-states ("Sin datos suficientes", etc.). F9's improvement is small: ensure the ClassDetail/StudentProfile **page-level** error/empty path is graceful. This is mostly already handled. The concrete fix: in any panel whose empty state is just a low-opacity text, that's acceptable — DO NOT over-engineer. Skip if nothing obvious. The main loading polish (skeletons) was Task 3.

(If the implementer finds a jarring empty state — e.g. a chart panel rendering an empty axis with no message — add a "Sin datos en esta ventana." centered note. Otherwise no change.)

### Step 3: Final gates

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: 0 lint errors, 0 typecheck, ≥107 tests, build clean.

### Step 4: Commit the reduced-motion sweep

```bash
git add src/components/charts/TrendBarChart.jsx
git commit -m "feat(analytics): reduced-motion guard on chart animations (F9)

TrendBarChart pasa isAnimationActive={!reducedMotion} a los Bars (la
Line de forecast ya estaba en false). Bajo prefers-reduced-motion los
charts no animan en mount. Cierra el barrido de motion de F9.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Step 5: Dispatch final code review subagent

Diff range `main..HEAD`. Focus:
- `count-up.ts`: easeOutCubic clamp, sampleCountUp boundaries (elapsed 0 / ≥duration / duration 0), non-zero from.
- `AnimatedNumber`: reduced-motion → direct, no-rAF → direct, cancelAnimationFrame cleanup, non-finite value passthrough, prevRef updates correctly (no stuck animation).
- KpiBand/StudentKpiBand: AnimatedNumber passed as `value` ReactNode works with StatCard (which renders `{value}`); delta chips + tone unaffected; auto-fit grid.
- StudioSkeleton: variants render; reused inside StudioShell loading branches; reduced-motion (Skeleton already guards).
- StudioShell responsive: mobile branch doesn't break desktop; nav items keep F8 keyboard/nav behavior in both layouts; no rules-of-hooks issue with useIsMobile.
- TrendBarChart reduced-motion: isAnimationActive guard, forecast Line still false.
- No regression to F8 interactivity (sort/filter/crossfilter/drawer still work — the files F9 touched overlap with F8 in ClassDetail/StudentProfile/KpiBand/StudioShell/TrendBarChart; confirm F9 edits are additive).

### Step 6: Push + PR

```bash
git push -u origin claude/analytics-studio-f9
gh pr create --base main --head claude/analytics-studio-f9 \
  --title "feat(analytics): Analytics Studio F9 — Pulido de producto" \
  --body "$(cat <<'EOF'
## Summary

Analytics Studio **Fase 9 — Pulido de producto**. La otra mitad de la ronda 2 (tras F8 Interactividad). Cero SQL, cero deps.

- **Skeletons de carga** (`StudioSkeleton`, 4 variantes) en ClassDetail / StudentProfile / TopicMastery / Reports — reemplazan el "Cargando…" en texto plano.
- **Responsive/mobile:** StudioShell colapsa el sub-nav lateral (168px fijo) a una fila horizontal scrollable en celular; KpiBand y las grillas de ClassDetail/StudentProfile pasan a `auto-fit/minmax` (no más desborde en pantallas chicas).
- **Count-up** en los números de los KPIs (`AnimatedNumber` + easing puro `count-up.ts`), respetando `prefers-reduced-motion`.
- **Reduced-motion sweep:** charts (recharts) no animan bajo `prefers-reduced-motion`.

### Out of scope
Director rebuild (área no elegida), data depth (área no elegida), mobile card-per-row tables, count-up fuera de los KPIs.

## Test plan
- [x] lint + typecheck + test:run (≥107) + build limpios.
- [ ] Cargar /school/class/:id en cold → ver skeletons (no "Cargando…").
- [ ] Achicar la ventana / celular → el sub-nav es una fila scrollable, las cards no se desbordan.
- [ ] Los KPIs cuentan hacia su valor al entrar.
- [ ] Con reduced-motion activado → sin count-up ni animación de charts.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec Coverage Self-Review

| Gap del audit (área "Pulido") | Task | Status |
|-------------------------------|------|--------|
| Skeletons en sub-pages (#13) | T3 | DONE |
| Responsive / mobile (#11) | T4 | DONE (sub-nav + grids) |
| Count-up / smooth updates (#7) | T1, T2 | DONE (KPIs) |
| prefers-reduced-motion (#9) | T1 (count-up), T5 (charts) | DONE |
| Empty states (#12) | T3 (loading) + T5 (note) | mejorado |

## Open notes
- **Count-up solo en KPIs.** Tablas/listas no animan números (sería ruido).
- **Mobile tables** hacen scroll horizontal dentro de su card (el `<table width:100%>` + el card con overflow). Un rediseño card-per-row por fila es follow-up; F9 prioriza que no se rompa el layout.
- **F9 toca archivos que F8 también tocó** (ClassDetail, StudentProfile, KpiBand, StudioShell, TrendBarChart) — pero las ediciones son aditivas (loading branch, grid columns, value wrapper, mobile style branch, isAnimationActive). El review final confirma que la interactividad de F8 (sort/filter/crossfilter/drawer) sigue intacta.
- **matchMedia leído a nivel módulo** en TrendBarChart (reduced-motion). Cambiar reduced-motion mid-sesión no re-renderiza; aceptable (caso rarísimo).
