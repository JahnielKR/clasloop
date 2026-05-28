# Analytics Studio — Fase 1 (Detalle de Clase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the **Class Detail page** at `/school/class/:classId` — the dashboard estrella of Analytics Studio, with the 7 visible blocks of the approved Semrush mockup wired to the F0 RPCs (`class_analytics`, `class_timeseries`). Director's class cards become clickable into this page.

**Architecture:** Pure JS/React work — no SQL changes (F0 already shipped the motor). The page is composed of independent presentational blocks under `src/components/analytics/`, fed by the existing F0 hooks. New chart wrappers under `src/components/charts/` (recharts). Pure formatters in `src/lib/analytics/formatters.ts`. Route added via `src/routes.ts` + `pathToPage`. `StudioShell` from F0 gets `view="class"` to highlight the sub-nav item.

**Tech Stack:** React 18, `@tanstack/react-query` v5, `recharts` v3, vitest. No new deps.

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §3 (IA), §5 (Detalle de Clase composition + interactivity), §7 (component arch), §9 (F1 row).

**Branch:** `claude/analytics-studio-f1` (created off the F0 tip). Workflow: same as F0 — branch-per-PR, no `--no-verify`.

**Depends on:** F0 commits (PR #63). F1 uses `useClassAnalytics`, `useClassTimeseries`, `StudioShell`, `PeriodChips`, the `charts/` barrel, and `metrics.ts`. If F0 merges before F1, F1 PR opens against `main`; otherwise F1 PR opens against the F0 branch (stacked).

---

## Pre-task: File Structure

**Create (13 files):**

```
src/lib/analytics/
  formatters.ts                     # NEW: pure formatters (TDD)
  __tests__/formatters.test.ts      # NEW

src/components/charts/
  TrendBarChart.jsx                 # NEW: bar chart con tooltip y overlay opcional
  Donut.jsx                         # NEW: donut primitivo genérico
  HorizontalBarList.jsx             # NEW: lista de barras horizontales para Top-N
  SparklineCell.jsx                 # NEW: spark mini-chart para filas de tabla

src/components/analytics/
  KpiBand.jsx                       # NEW: banda de stat cards
  StatCardWithSparkline.jsx         # NEW: una stat card individual
  CleoStrip.jsx                     # NEW: franja Cleo (placeholder en F1)
  TrendPanel.jsx                    # NEW: TrendBarChart + tabs métrica
  ResponseCompositionPanel.jsx      # NEW: donut + leyenda
  TopicBarListPanel.jsx             # NEW: top dominated/critical (usa HorizontalBarList)
  MostMissedList.jsx                # NEW: lista + acciones (close-unit-ai)
  RosterTable.jsx                   # NEW: tabla con sparklines + badges

src/pages/analytics/
  ClassDetail.jsx                   # NEW: la página /school/class/:classId
```

**Modify (4 files):**

```
src/routes.ts                       # +ROUTE_PATTERNS.ANALYTICS_CLASS, +buildRoute.analyticsClass, +pathToPage branch
src/components/analytics/StudioShell.jsx   # NAV_ITEMS.class.enabled = (view === 'class'); cursor pointer cuando active
src/components/analytics/index.ts          # barrel: re-export nuevos componentes
src/components/charts/index.ts             # barrel: re-export nuevos charts
src/pages/Director.jsx              # roster/class-cards click → /school/class/:id
src/App.jsx (or main router file)   # register the new page route in the Routes tree
```

**Out of scope (deferred to later phases or polish):**
- StudentProfile page (F2), TopicMastery page (F3), CompareToggle wiring (F4), forecast band + real Cleo narrative (F5), Live (F6), Reports/Export (F7).
- Crossfilter (cross-widget highlight) — F5 or polish phase.
- Drawer side-peek (alumno/pregunta) — F2 or polish.
- Brush + zoom on TrendPanel — polish.
- Keyboard nav on tables — polish.
- Renaming sidebar "School" → "Analytics" — spec §10 open question.

---

## Task 1: TDD — `formatters.ts`

**Files:**
- Test: `src/lib/analytics/__tests__/formatters.test.ts`
- Create: `src/lib/analytics/formatters.ts`

Shared formatters used by every block (numbers, percents, durations, dates). Tested first.

- [ ] **Step 1: Write failing tests.**

Write `src/lib/analytics/__tests__/formatters.test.ts`:

```ts
/* @vitest-environment node */
// Pure formatters used by Analytics Studio blocks. No React, no Intl
// where it can be helped (we keep it dumb so the snapshot is stable
// across locales — el sistema i18n del proyecto se aplica donde haga falta).

import { describe, it, expect } from "vitest";
import {
  formatPercent,
  formatDelta,
  formatNumber,
  formatDurationShort,
  formatRelativeDay,
} from "../formatters";

describe("formatPercent", () => {
  it("rounds and appends %", () => {
    expect(formatPercent(78.4)).toBe("78%");
    expect(formatPercent(78.6)).toBe("79%");
  });
  it("returns em-dash for null/undefined", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });
  it("supports 1 decimal place when asked", () => {
    expect(formatPercent(78.45, 1)).toBe("78.5%");
  });
});

describe("formatDelta", () => {
  it("prefixes + for positive, − for negative, uses unicode triangles", () => {
    expect(formatDelta(6)).toBe("▲ 6%");
    expect(formatDelta(-3)).toBe("▼ 3%");
    expect(formatDelta(0)).toBe("→ 0%");
  });
  it("returns em-dash for null", () => {
    expect(formatDelta(null)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formats integers with thousand separator (en-US grouping)", () => {
    expect(formatNumber(1284)).toBe("1,284");
    expect(formatNumber(7)).toBe("7");
    expect(formatNumber(0)).toBe("0");
  });
  it("em-dash for null", () => {
    expect(formatNumber(null)).toBe("—");
  });
});

describe("formatDurationShort", () => {
  it("ms → human-readable short string", () => {
    expect(formatDurationShort(450)).toBe("0.4s");
    expect(formatDurationShort(1500)).toBe("1.5s");
    expect(formatDurationShort(65000)).toBe("1m 5s");
    expect(formatDurationShort(3650000)).toBe("60m 50s");
  });
  it("em-dash for 0 / null", () => {
    expect(formatDurationShort(0)).toBe("—");
    expect(formatDurationShort(null)).toBe("—");
  });
});

describe("formatRelativeDay", () => {
  it("'hoy' / 'ayer' / 'hace Nd' for recent dates", () => {
    const now = new Date("2026-05-28T10:00:00Z");
    expect(formatRelativeDay(new Date("2026-05-28T08:00:00Z"), now)).toBe("hoy");
    expect(formatRelativeDay(new Date("2026-05-27T08:00:00Z"), now)).toBe("ayer");
    expect(formatRelativeDay(new Date("2026-05-20T08:00:00Z"), now)).toBe("hace 8d");
  });
  it("'—' for null/undefined", () => {
    expect(formatRelativeDay(null)).toBe("—");
  });
  it("'hace Nd' beyond a year stays as days (we don't go fancy in F1)", () => {
    const now = new Date("2026-05-28T10:00:00Z");
    expect(formatRelativeDay(new Date("2025-05-28T10:00:00Z"), now)).toBe("hace 365d");
  });
});
```

- [ ] **Step 2: Run; expect red (module missing).**

```bash
npm run test:run -- src/lib/analytics
```

Expected: vitest fails to resolve `../formatters`.

- [ ] **Step 3: Implement `formatters.ts`.**

Write `src/lib/analytics/formatters.ts`:

```ts
// ─── src/lib/analytics/formatters.ts ─────────────────────────────────
// Pure formatters used by Analytics Studio. No React, no Supabase.
// Stable strings across locales — el i18n del proyecto, si hace falta,
// se aplica al wrap del componente, no acá.

const DASH = "—";

/** Round and append %. Optional decimals. null/undefined → em-dash. */
export function formatPercent(
  x: number | null | undefined,
  decimals = 0,
): string {
  if (x == null) return DASH;
  const factor = 10 ** decimals;
  const rounded = Math.round(x * factor) / factor;
  return `${rounded.toFixed(decimals)}%`;
}

/** Delta with arrow + sign. ▲ / ▼ / →. null → em-dash. */
export function formatDelta(x: number | null | undefined): string {
  if (x == null) return DASH;
  if (x > 0) return `▲ ${x}%`;
  if (x < 0) return `▼ ${Math.abs(x)}%`;
  return `→ 0%`;
}

/** Integer with thousand separator. null → em-dash. */
export function formatNumber(x: number | null | undefined): string {
  if (x == null) return DASH;
  return x.toLocaleString("en-US");
}

/** Milliseconds → "Xs" or "Nm Ss". 0/null → em-dash. */
export function formatDurationShort(ms: number | null | undefined): string {
  if (!ms) return DASH;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds - m * 60);
  return `${m}m ${s}s`;
}

/** "hoy" / "ayer" / "hace Nd". null → em-dash. */
export function formatRelativeDay(
  d: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (d == null) return DASH;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return DASH;
  // Day-only delta. Compare floor-to-day (UTC).
  const dayMs = 24 * 60 * 60 * 1000;
  const floorDay = (t: Date) =>
    Math.floor(t.getTime() / dayMs);
  const diff = floorDay(now) - floorDay(date);
  if (diff <= 0) return "hoy";
  if (diff === 1) return "ayer";
  return `hace ${diff}d`;
}
```

- [ ] **Step 4: Run tests; expect green.**

```bash
npm run test:run -- src/lib/analytics
```

Expected: previous 13 metrics tests still pass + new ~14 formatters tests pass.

- [ ] **Step 5: Re-export from the lib barrel.**

Read `src/lib/analytics/index.ts`. It currently has `export * from "./metrics";`. Add a new line `export * from "./formatters";`.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/analytics/formatters.ts src/lib/analytics/__tests__/formatters.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): formatters.ts — pure display helpers + tests (F1)

formatPercent / formatDelta / formatNumber / formatDurationShort /
formatRelativeDay. Reusados por todos los bloques del Class Detail
(KpiBand, RosterTable, MostMissedList…). 14 tests, mismo patrón
que metrics.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Routing — add `/school/class/:classId`

**Files:**
- Modify: `src/routes.ts`
- Modify: `src/components/analytics/StudioShell.jsx`

Enable URL navigation to the Class Detail page and the sub-nav highlight.

- [ ] **Step 1: Read current routes.ts to see the convention.**

Use the **Read tool** on `src/routes.ts` (limit 200 lines is enough). Note the format of `ROUTE_PATTERNS`, `buildRoute` helpers (around the `classInsights` line), and `pathToPage` (the `/^\/classes\/[^/]+\/insights\/?$/` precedent for sub-routes).

- [ ] **Step 2: Add the analytics class route.**

Add to `ROUTE_PATTERNS` (after `SCHOOL: "/school"`):

```ts
ANALYTICS_CLASS: "/school/class/:classId",
```

Add to `buildRoute` (near `classInsights`):

```ts
analyticsClass: (classId: string) => `/school/class/${enc(classId)}`,
```

Add to `pathToPage` (BEFORE the existing `if (pathname === "/school") return "director";` line, because more specific patterns must match first):

```ts
if (/^\/school\/class\/[^/]+\/?$/.test(pathname)) return "analyticsClassDetail";
```

- [ ] **Step 3: Register the new page in TEACHER_ONLY_PAGES (so students can't reach it by URL).**

In the same file, add `"analyticsClassDetail"` to the `TEACHER_ONLY_PAGES` Set:

```ts
const TEACHER_ONLY_PAGES = new Set([
  "sessions",
  "decks",
  "director",
  "analyticsClassDetail", // F1: Class Detail page under /school
  "adminAIStats",
  "scan",
]);
```

- [ ] **Step 4: Update StudioShell so "Clase" is enabled when `view='class'`.**

Read `src/components/analytics/StudioShell.jsx`. Change the `NAV_ITEMS` constant so the `class` item is enabled conditionally — easiest is to compute enablement in the render rather than as a static array. Replace the `NAV_ITEMS` declaration block + the `.map(...)` rendering block so the `class` item shows enabled when the current `view === 'class'`:

```jsx
const NAV_ITEMS = [
  { id: "overview", label: "Resumen", staticEnabled: true },
  { id: "class", label: "Clase", staticEnabled: false },
  { id: "student", label: "Estudiante", staticEnabled: false },
  { id: "topics", label: "Temas", staticEnabled: false },
  { id: "live", label: "En vivo", staticEnabled: false },
  { id: "reports", label: "Reportes", staticEnabled: false },
  { id: "ask", label: "Analista Cleo", staticEnabled: false },
];

// Inside the component, just before the return, compute per-item enabled state.
// The 'class' item is enabled if the current view IS class (so it can highlight),
// but in F1 it is not actually navigable from elsewhere — you reach class detail
// by clicking a class card in Director (Task 12).
const items = NAV_ITEMS.map((item) => ({
  ...item,
  enabled: item.staticEnabled || (item.id === "class" && view === "class"),
}));
```

Then update the `.map()` over `NAV_ITEMS` to use `items` instead, and read `item.enabled` (already does; just rename).

- [ ] **Step 5: Lint + typecheck + tests + build.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: all green; no new warnings.

- [ ] **Step 6: Commit.**

```bash
git add src/routes.ts src/components/analytics/StudioShell.jsx
git commit -m "feat(analytics): route /school/class/:classId + StudioShell view='class' (F1)

ROUTE_PATTERNS.ANALYTICS_CLASS + buildRoute.analyticsClass +
pathToPage('/school/class/:id' → analyticsClassDetail) +
TEACHER_ONLY_PAGES gate.

StudioShell 'Clase' item ya no es estático: enabled cuando view='class'
para que destaque cuando estamos en la página. F1 no permite navegar
a 'Clase' desde el sidebar (no hay 'última clase' state); se llega
desde el roster del Director (task 12).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Chart wrappers — `TrendBarChart` + `Donut`

**Files:**
- Create: `src/components/charts/TrendBarChart.jsx`
- Create: `src/components/charts/Donut.jsx`
- Modify: `src/components/charts/index.ts` (barrel)

Two recharts wrappers. `TrendBarChart` powers TrendPanel; `Donut` powers ResponseCompositionPanel.

- [ ] **Step 1: Write `TrendBarChart.jsx`.**

```jsx
// src/components/charts/TrendBarChart.jsx
//
// F1 Analytics Studio: bar chart de tendencia (estilo Semrush).
// Recibe datos de useClassTimeseries: [{ bucket, value, responses_total, unique_participants }].
//
// Props:
//   data: array as above
//   yLabel: string para tooltip (ej. "% correcto")
//   yFormatter: (value:number)=>string para tooltip + eje (default: x => `${x}`)
//
// Forecast band, compare overlay y brush quedan para fases posteriores (F4/F5).

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const ACCENT = "#2563eb";
const AXIS_COLOR = "#94a3b8";

function defaultFormatter(v) {
  return typeof v === "number" ? `${v}` : v;
}

export default function TrendBarChart({
  data = [],
  yLabel = "valor",
  yFormatter = defaultFormatter,
  height = 180,
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
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
            formatter={(value) => [yFormatter(value), yLabel]}
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="value" fill={ACCENT} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Write `Donut.jsx`.**

```jsx
// src/components/charts/Donut.jsx
//
// F1 Analytics Studio: donut chart primitivo genérico (estilo Semrush).
//
// Props:
//   data: [{ name: string, value: number, color: string }]
//   centerLabel: string opcional para el texto principal del centro
//   centerSubLabel: string opcional para el texto secundario del centro
//   height: number (default 160)

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function Donut({
  data = [],
  centerLabel,
  centerSubLabel,
  height = 160,
}) {
  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              border: "1px solid #e4e4e7",
              borderRadius: 6,
              fontSize: 12,
              padding: "6px 10px",
            }}
            formatter={(value, name) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerSubLabel) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {centerLabel && (
            <div style={{ fontSize: 22, fontWeight: 700 }}>{centerLabel}</div>
          )}
          {centerSubLabel && (
            <div style={{ fontSize: 11, opacity: 0.55 }}>{centerSubLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update charts barrel.**

Edit `src/components/charts/index.ts` to add:

```ts
export { default as TrendBarChart } from "./TrendBarChart";
export { default as Donut } from "./Donut";
```

- [ ] **Step 4: Lint + typecheck + build.**

```bash
npm run lint && npm run typecheck && npm run build
```

- [ ] **Step 5: Commit.**

```bash
git add src/components/charts/TrendBarChart.jsx src/components/charts/Donut.jsx src/components/charts/index.ts
git commit -m "feat(analytics): chart wrappers TrendBarChart + Donut (F1)

Recharts wrappers para los bloques principales del Class Detail.
TrendBarChart powers TrendPanel; Donut powers ResponseComposition.
Tooltips ricos por defecto. Forecast band/compare/brush para F4-F5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Chart wrappers — `HorizontalBarList` + `SparklineCell`

**Files:**
- Create: `src/components/charts/HorizontalBarList.jsx`
- Create: `src/components/charts/SparklineCell.jsx`
- Modify: `src/components/charts/index.ts`

Two lightweight wrappers — neither needs recharts (raw SVG/divs faster than a chart lib for tiny visuals).

- [ ] **Step 1: Write `HorizontalBarList.jsx`.**

```jsx
// src/components/charts/HorizontalBarList.jsx
//
// F1 Analytics Studio: Top-N de barras horizontales (estilo Semrush).
// Sin recharts — un map de divs con width % es más fluido para esto.
//
// Props:
//   items: [{ label: string, value: number, color?: string }]
//   max: number opcional (si no, usa el mayor value del array)
//   valueFormatter: (n)=>string para el texto del valor (default: "${n}%")
//   onItemClick?: (item) => void  — opcional, click drill-down

export default function HorizontalBarList({
  items = [],
  max,
  valueFormatter = (n) => `${n}%`,
  onItemClick,
}) {
  const cap = max ?? Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      {items.map((item, idx) => {
        const pct = Math.min(100, ((item.value || 0) / cap) * 100);
        const color = item.color || "#dbeafe";
        const clickable = !!onItemClick;
        return (
          <div
            key={item.label + idx}
            onClick={clickable ? () => onItemClick(item) : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 0",
              cursor: clickable ? "pointer" : "default",
            }}
          >
            <span style={{ flex: "0 0 90px", color: "#111" }}>{item.label}</span>
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 6,
                background: "#f4f4f5",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 3,
                }}
              />
            </span>
            <span style={{ flex: "0 0 48px", textAlign: "right", fontWeight: 600 }}>
              {valueFormatter(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write `SparklineCell.jsx`.**

```jsx
// src/components/charts/SparklineCell.jsx
//
// F1 Analytics Studio: spark mini-chart inline para filas de tabla.
// SVG polyline simple, sin recharts (más liviano para muchas filas).
//
// Props:
//   points: number[]    valores en orden cronológico (any range — se escala al min/max).
//   color: string       línea (default azul de marca)
//   width / height: ints
//   "trend"?: "up"|"down"|"flat"|"new" — si se pasa, ignora 'color' y pinta verde/rojo/gris.

const TREND_COLORS = {
  up: "#16a34a",
  down: "#dc2626",
  flat: "#94a3b8",
  new: "#a1a1aa",
};

export default function SparklineCell({
  points = [],
  color = "#2563eb",
  trend,
  width = 80,
  height = 18,
}) {
  if (points.length < 2) {
    return (
      <span style={{ display: "inline-block", width, height, opacity: 0.4, fontSize: 11 }}>
        —
      </span>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stride = width / (points.length - 1);
  const coords = points
    .map((p, i) => {
      const x = i * stride;
      const y = height - ((p - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
  const strokeColor = trend ? TREND_COLORS[trend] || color : color;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height, display: "inline-block", verticalAlign: "middle" }}
      aria-hidden
    >
      <polyline
        points={coords}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 3: Update charts barrel.**

Add to `src/components/charts/index.ts`:

```ts
export { default as HorizontalBarList } from "./HorizontalBarList";
export { default as SparklineCell } from "./SparklineCell";
```

- [ ] **Step 4: Lint + typecheck + build.**

```bash
npm run lint && npm run typecheck && npm run build
```

- [ ] **Step 5: Commit.**

```bash
git add src/components/charts/HorizontalBarList.jsx src/components/charts/SparklineCell.jsx src/components/charts/index.ts
git commit -m "feat(analytics): chart wrappers HorizontalBarList + SparklineCell (F1)

Wrappers ligeros (sin recharts) para los patrones 'Top-N con barrita'
y 'spark inline en celda de tabla' del look Semrush. Más liviano que
una pieza de recharts para visualizaciones diminutas en lista/tabla.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `ClassDetail.jsx` skeleton

**Files:**
- Create: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/App.jsx` (or whichever file owns the page switch) — register the new page.

La página fetches data, renderiza el StudioShell + el contenido. Los blocks reales llegan en tasks 6-11; en F0 step we ship el shell + loading + un slot por bloque.

- [ ] **Step 1: Identify where pages are routed.**

Use the **Grep tool** in `src/` with pattern `pathToPage|case "director"` to find where Director is rendered. The codebase uses a page-switch in `src/App.jsx` (per `pathToPage` returning string ids). Find the switch that maps `"director"` → `<Director />`.

- [ ] **Step 2: Write the page skeleton.**

Write `src/pages/analytics/ClassDetail.jsx`:

```jsx
// src/pages/analytics/ClassDetail.jsx
//
// F1 Analytics Studio: Class Detail page — el dashboard estrella.
// Ruta /school/class/:classId. Fetches via useClassAnalytics +
// useClassTimeseries (RPCs de F0). Compone los bloques presentacionales
// definidos en src/components/analytics/.

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StudioShell } from "../../components/analytics";
import { useClassAnalytics } from "../../hooks/useClassAnalytics";
import { useClassTimeseries } from "../../hooks/useClassTimeseries";
import { ROUTES } from "../../routes";

// Map period chip → from/to timestamps. F1 keeps it simple; Custom no-ops.
function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  switch (period) {
    case "d7":
      return { from: new Date(now.getTime() - ms(7)).toISOString(), to: now.toISOString() };
    case "d90":
      return { from: new Date(now.getTime() - ms(90)).toISOString(), to: now.toISOString() };
    case "custom":
      return { from: null, to: null }; // F1 stub
    case "d30":
    default:
      return { from: new Date(now.getTime() - ms(30)).toISOString(), to: now.toISOString() };
  }
}

export default function ClassDetail() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Pull :classId from /school/class/:classId
  const match = /^\/school\/class\/([^/]+)\/?$/.exec(pathname);
  const classId = match ? decodeURIComponent(match[1]) : null;

  const [period, setPeriod] = useState("d30");
  const { from, to } = periodToRange(period);

  const analyticsQ = useClassAnalytics(classId, { from, to });
  const timeseriesQ = useClassTimeseries(classId, {
    metric: "pct_correct",
    granularity: "day",
    from,
    to,
  });

  useEffect(() => {
    if (!classId) navigate(ROUTES.SCHOOL, { replace: true });
  }, [classId, navigate]);

  if (!classId) return null;

  const a = analyticsQ.data;
  const ts = timeseriesQ.data ?? [];
  const loading = analyticsQ.isPending || timeseriesQ.isPending;
  const error = analyticsQ.error || timeseriesQ.error;

  return (
    <StudioShell view="class" title="Clase" period={period} onPeriodChange={setPeriod}>
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
            Error cargando la clase: {String(error.message || error)}
          </div>
        )}

        {loading && !a ? (
          <div style={{ opacity: 0.55, fontSize: 14 }}>Cargando análisis de la clase…</div>
        ) : (
          <>
            {/* Bloques reales se enchufan en tasks 6-11. En F1 task 5 el
                shell + data fetch + slots están listos. */}
            <div data-block="KpiBand" />
            <div data-block="CleoStrip" />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <div data-block="TrendPanel" />
              <div data-block="ResponseCompositionPanel" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div data-block="TopicBarListPanel" data-variant="dominated" />
              <div data-block="TopicBarListPanel" data-variant="critical" />
              <div data-block="MostMissedList" />
            </div>
            <div data-block="RosterTable" />
          </>
        )}
      </div>
    </StudioShell>
  );
}
```

- [ ] **Step 3: Register the page in the page switch.**

Edit `src/App.jsx` (or whichever file maps page ids to components). Add an import:

```jsx
import ClassDetail from "./pages/analytics/ClassDetail";
```

And add a branch in the page switch that mirrors how `director` is rendered:

```jsx
{page === "analyticsClassDetail" && <ClassDetail />}
```

(Match the existing switch style: if the codebase uses a `switch(page)` block, use the matching case; if it uses `&&` conditions like the example above, use that.)

- [ ] **Step 4: Lint + typecheck + tests + build.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: all green; route `/school/class/<id>` now loads ClassDetail (empty slots are placeholders for tasks 6-11).

- [ ] **Step 5: Commit.**

```bash
git add src/pages/analytics/ClassDetail.jsx src/App.jsx
git commit -m "feat(analytics): ClassDetail page skeleton at /school/class/:id (F1)

Página esqueleto: fetch via useClassAnalytics + useClassTimeseries,
StudioShell view='class', PeriodChips controlados (7d/30d/90d),
manejo de loading + error. Slots de bloques para los tasks 6-11.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `KpiBand` + `StatCardWithSparkline`

**Files:**
- Create: `src/components/analytics/KpiBand.jsx`
- Create: `src/components/analytics/StatCardWithSparkline.jsx`
- Modify: `src/components/analytics/index.ts` (barrel)
- Modify: `src/pages/analytics/ClassDetail.jsx` (use the new block)

5 tiles: Retención · Participación · Sesiones · Δ vs período anterior · En riesgo. La tile "Δ" en F1 muestra solo el valor (cómo se compara con el período anterior viene en F4 con la lógica de Comparar; en F1 mostramos "—" como placeholder honesto).

- [ ] **Step 1: Write `StatCardWithSparkline.jsx`.**

```jsx
// src/components/analytics/StatCardWithSparkline.jsx
//
// F1 Analytics Studio: una stat card del look Semrush.
// label + número grande + chip de delta opcional + spark line opcional.
//
// Props:
//   label: string ("Retención", "Participación", …)
//   value: string (ya pre-formateado: "78%", "27/30", "14", "—")
//   delta: { sign: "▲"|"▼"|"→"|null, label: string, tone: "good"|"bad"|"neutral" } | null
//   sparkPoints: number[] | undefined
//   sparkTrend: "up"|"down"|"flat"|"new" | undefined
//   tone: "default" | "danger" (cambia el borde de la card)

import { SparklineCell } from "../charts";

const TONE_BG = {
  good: "#dcfce7",
  bad: "#fee2e2",
  neutral: "#f4f4f5",
};
const TONE_COLOR = {
  good: "#15803d",
  bad: "#b91c1c",
  neutral: "#52525b",
};

export default function StatCardWithSparkline({
  label,
  value,
  delta = null,
  sparkPoints,
  sparkTrend,
  tone = "default",
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "#fff",
        border:
          tone === "danger"
            ? "1px solid #fecaca"
            : "1px solid #e4e4e7",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          opacity: 0.55,
          letterSpacing: ".05em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700 }}>{value}</span>
        {delta && (
          <span
            style={{
              background: TONE_BG[delta.tone] || TONE_BG.neutral,
              color: TONE_COLOR[delta.tone] || TONE_COLOR.neutral,
              padding: "1px 6px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {delta.label}
          </span>
        )}
      </div>
      {sparkPoints && sparkPoints.length > 1 && (
        <div style={{ marginTop: 6 }}>
          <SparklineCell
            points={sparkPoints}
            trend={sparkTrend}
            width={140}
            height={22}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `KpiBand.jsx`.**

```jsx
// src/components/analytics/KpiBand.jsx
//
// F1 Analytics Studio: banda de stat cards del Class Detail.
// 5 tiles: Retención · Participación · Sesiones · Δ vs período · En riesgo.
//
// Props:
//   kpis: { responses_total, responses_correct, pct_correct, avg_time_ms, unique_participants }
//         — viene de class_analytics RPC (campo "kpis").
//   timeseries: array de useClassTimeseries (para sparklines).
//   topicMastery: array (para contar "en riesgo" en F1 — alumnos en riesgo
//                        real entra en F5 con Cleo+Predictivo; F1 cuenta
//                        topics con retention<40 como proxy).
//
// En F1 "Δ vs período anterior" muestra "—" — la lógica de período anterior
// vive en F4 (Comparar). Honest placeholder.

import StatCardWithSparkline from "./StatCardWithSparkline";
import { formatPercent, formatNumber, formatDurationShort } from "../../lib/analytics";

export default function KpiBand({ kpis = {}, timeseries = [], topicMastery = [] }) {
  const pctSpark = timeseries.map((t) => Number(t.value) || 0);
  const participationSpark = timeseries.map((t) => Number(t.unique_participants) || 0);
  const sessionsSpark = timeseries.map((t) => Number(t.responses_total) || 0);

  // F1 proxy: tópicos en riesgo = retention_score < 40 (la "en riesgo
  // por alumno" llega en F5 con Cleo + el RPC student_risk).
  const atRiskTopics = topicMastery.filter(
    (t) => (t.retention_score ?? 0) < 40,
  ).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
      <StatCardWithSparkline
        label="% correcto"
        value={formatPercent(kpis.pct_correct)}
        sparkPoints={pctSpark}
      />
      <StatCardWithSparkline
        label="Participación"
        value={formatNumber(kpis.unique_participants)}
        sparkPoints={participationSpark}
      />
      <StatCardWithSparkline
        label="Respuestas"
        value={formatNumber(kpis.responses_total)}
        sparkPoints={sessionsSpark}
      />
      <StatCardWithSparkline
        label="Tiempo promedio"
        value={formatDurationShort(kpis.avg_time_ms)}
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

- [ ] **Step 3: Wire into ClassDetail.**

Edit `src/pages/analytics/ClassDetail.jsx`. Add import:

```jsx
import KpiBand from "../../components/analytics/KpiBand";
```

Replace the `<div data-block="KpiBand" />` placeholder with:

```jsx
<KpiBand
  kpis={a?.kpis ?? {}}
  timeseries={ts}
  topicMastery={a?.topic_mastery ?? []}
/>
```

- [ ] **Step 4: Update barrel.**

In `src/components/analytics/index.ts` add:

```ts
export { default as KpiBand } from "./KpiBand";
export { default as StatCardWithSparkline } from "./StatCardWithSparkline";
```

- [ ] **Step 5: Lint + typecheck + tests + build.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

- [ ] **Step 6: Commit.**

```bash
git add src/components/analytics/KpiBand.jsx src/components/analytics/StatCardWithSparkline.jsx src/components/analytics/index.ts src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): KpiBand + StatCardWithSparkline (F1)

5 tiles del Class Detail header (% correcto / Participación / Respuestas /
Tiempo promedio / Temas en riesgo) cada uno con su mini-spark. Lee
kpis + timeseries de class_analytics/class_timeseries (F0 RPCs).
'En riesgo' usa proxy de tópicos<40% en F1; el risk por alumno real
llega en F5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `CleoStrip` (placeholder narrative + action chips)

**Files:**
- Create: `src/components/analytics/CleoStrip.jsx`
- Modify: `src/components/analytics/index.ts` (barrel)
- Modify: `src/pages/analytics/ClassDetail.jsx`

Franja Cleo con texto placeholder + 3 chips de acción funcionales (las acciones reusan `src/lib/close-unit-ai.js` — ya existen).

- [ ] **Step 1: Read close-unit-ai.js to understand the action API.**

Use the **Read tool** on `src/lib/close-unit-ai.js` (limit 80 lines). Note the signatures of `generateSuggestedReviewQuestions` and `saveReviewDeck`. We will use them in the chip click handlers.

- [ ] **Step 2: Write `CleoStrip.jsx`.**

```jsx
// src/components/analytics/CleoStrip.jsx
//
// F1 Analytics Studio: franja Cleo en el Class Detail.
// En F1 el TEXTO del narrador es placeholder honesto — la narrativa
// real de Cleo llega en F5 cuando se cablee api/cleo-chat.js con
// contexto analítico (src/lib/cleo-analytics.ts).
//
// Los chips de ACCIÓN sí funcionan en F1: reusan
// generateSuggestedReviewQuestions + saveReviewDeck de
// src/lib/close-unit-ai.js (que ya existían en el repo).
//
// Props:
//   classId: string
//   weakTopics: string[]  — top temas con peor retención (para "Generar repaso")
//   onActionDone: (action, result) => void   opcional, feedback al padre

import { useState } from "react";
import {
  generateSuggestedReviewQuestions,
  saveReviewDeck,
} from "../../lib/close-unit-ai";

const ACCENT = "#7c3aed";
const ACCENT_BG = "#ede9fe";

export default function CleoStrip({ classId, weakTopics = [], onActionDone }) {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  async function handleGenerateReview() {
    if (!classId || weakTopics.length === 0) return;
    setBusy("review");
    setMsg(null);
    try {
      const suggested = await generateSuggestedReviewQuestions({
        classId,
        topics: weakTopics.slice(0, 3),
      });
      const deck = await saveReviewDeck({
        classId,
        topics: weakTopics.slice(0, 3),
        questions: suggested,
      });
      setMsg("Repaso generado y guardado en la clase.");
      onActionDone?.("review", deck);
    } catch (err) {
      setMsg(`No pude generar: ${err.message || err}`);
    } finally {
      setBusy(null);
    }
  }

  // F1 placeholder narrative; F5 replaces with Gemini output.
  const narrative =
    weakTopics.length > 0
      ? `Los temas con menor retención esta ventana son: ${weakTopics.slice(0, 3).join(", ")}. La narrativa pedagógica completa llega cuando se active Cleo (F5).`
      : "Sin datos suficientes en esta ventana de fechas. La narrativa pedagógica llega cuando se active Cleo (F5).";

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
          <button
            disabled={busy != null || weakTopics.length === 0}
            onClick={handleGenerateReview}
            style={{
              border: `1px solid ${ACCENT}`,
              color: ACCENT,
              background: "transparent",
              padding: "2px 9px",
              borderRadius: 20,
              fontSize: 12,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy === "review" ? "Generando…" : "Generar repaso de lo flojo"}
          </button>
          {/* Reenseñar ahora + Que vuelva mañana — visibles pero stub en F1.
              Se conectan en F5 con Cleo o más adelante con el motor de
              repetición espaciada. */}
          <span
            style={{
              border: "1px solid #d4d4d8",
              color: "#71717a",
              padding: "2px 9px",
              borderRadius: 20,
              fontSize: 12,
              cursor: "not-allowed",
            }}
            title="Llega en una fase posterior"
          >
            Reenseñar ahora · pronto
          </span>
          <span
            style={{
              border: "1px solid #d4d4d8",
              color: "#71717a",
              padding: "2px 9px",
              borderRadius: 20,
              fontSize: 12,
              cursor: "not-allowed",
            }}
            title="Llega en una fase posterior"
          >
            Que vuelva mañana · pronto
          </span>
        </div>
        {msg && (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>{msg}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into ClassDetail.**

Add import in `src/pages/analytics/ClassDetail.jsx`:

```jsx
import CleoStrip from "../../components/analytics/CleoStrip";
```

Replace `<div data-block="CleoStrip" />` with:

```jsx
<CleoStrip
  classId={classId}
  weakTopics={(a?.topic_mastery ?? [])
    .filter((t) => (t.retention_score ?? 0) < 40)
    .slice(0, 3)
    .map((t) => t.topic)}
/>
```

- [ ] **Step 4: Update barrel + gates + commit.**

```bash
git add src/components/analytics/CleoStrip.jsx src/components/analytics/index.ts src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): CleoStrip with placeholder narrative + working action chips (F1)

Franja Cleo del Class Detail. Narrativa placeholder honesta hasta F5
(cuando se cablee Cleo+Gemini con contexto analítico). 'Generar
repaso de lo flojo' funcional reusando close-unit-ai (genera deck +
lo guarda en la clase). Los otros 2 chips visibles pero stub.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

(Also add `export { default as CleoStrip } from "./CleoStrip";` to the analytics barrel before the commit.)

---

## Task 8: `TrendPanel` + `ResponseCompositionPanel`

**Files:**
- Create: `src/components/analytics/TrendPanel.jsx`
- Create: `src/components/analytics/ResponseCompositionPanel.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/ClassDetail.jsx`

- [ ] **Step 1: Write `TrendPanel.jsx`.**

```jsx
// src/components/analytics/TrendPanel.jsx
//
// F1 Analytics Studio: tendencia temporal del Class Detail.
// Tabs de métrica (pct_correct | avg_time | participation), bar chart
// con tooltips ricos. Forecast band + compare overlay quedan para F4/F5.
//
// Props:
//   metric, onMetricChange — controlado por el padre (que también
//   re-fetches via useClassTimeseries con el nuevo metric).
//   data: array del hook, [{ bucket, value, responses_total, unique_participants }]
//   loading: boolean

import { TrendBarChart } from "../charts";
import { formatPercent, formatNumber, formatDurationShort } from "../../lib/analytics";

const METRICS = [
  { id: "pct_correct", label: "% correcto", formatter: (v) => formatPercent(v) },
  { id: "avg_time", label: "Tiempo medio", formatter: (v) => formatDurationShort(v) },
  { id: "participation", label: "Participación", formatter: (v) => formatNumber(v) },
];

export default function TrendPanel({
  metric = "pct_correct",
  onMetricChange,
  data = [],
  loading = false,
}) {
  const def = METRICS.find((m) => m.id === metric) || METRICS[0];
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
        <span style={{ marginLeft: "auto", opacity: 0.65, fontSize: 11 }}>
          — pronóstico y comparar llegan en F4/F5
        </span>
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
        <TrendBarChart data={data} yLabel={def.label} yFormatter={def.formatter} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `ResponseCompositionPanel.jsx`.**

```jsx
// src/components/analytics/ResponseCompositionPanel.jsx
//
// F1 Analytics Studio: composición de respuestas (donut + leyenda) del Class Detail.
// kpis viene de class_analytics: { responses_total, responses_correct }.
// Esta vista en F0 no tenía parcial/pendiente desagregados — los pintamos
// como 0 hasta F1 (cuando podríamos extender el RPC) o más adelante.

import { Donut } from "../charts";
import { formatNumber } from "../../lib/analytics";

const PALETTE = {
  correct: "#16a34a",
  incorrect: "#dc2626",
  pending: "#e4e4e7",
};

export default function ResponseCompositionPanel({ kpis = {} }) {
  const total = kpis.responses_total ?? 0;
  const correct = kpis.responses_correct ?? 0;
  const incorrect = Math.max(0, total - correct);

  const data = [
    { name: "Correcto", value: correct, color: PALETTE.correct },
    { name: "Incorrecto", value: incorrect, color: PALETTE.incorrect },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Composición de respuestas
      </div>
      {total === 0 ? (
        <div style={{ height: 160, opacity: 0.45, fontSize: 13, padding: 12 }}>
          Sin respuestas en esta ventana.
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Donut
            data={data}
            centerLabel={formatNumber(total)}
            centerSubLabel="respuestas"
            height={150}
          />
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <LegendRow color={PALETTE.correct} label="Correcto" value={correct} total={total} />
            <LegendRow color={PALETTE.incorrect} label="Incorrecto" value={incorrect} total={total} />
          </div>
        </div>
      )}
    </div>
  );
}

function LegendRow({ color, label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          background: color,
          borderRadius: 2,
          marginRight: 6,
        }}
      />
      {label} · <b>{pct}%</b>
    </div>
  );
}
```

- [ ] **Step 3: Wire into ClassDetail.**

In `src/pages/analytics/ClassDetail.jsx`:

1. Add a state for the trend metric and a memo of `useClassTimeseries` that re-fetches when metric changes (the hook already supports it):

   ```jsx
   const [metric, setMetric] = useState("pct_correct");
   const timeseriesQ = useClassTimeseries(classId, {
     metric,
     granularity: "day",
     from,
     to,
   });
   ```

   (Replace the previously-fixed `metric: "pct_correct"` from Task 5.)

2. Add imports:

   ```jsx
   import TrendPanel from "../../components/analytics/TrendPanel";
   import ResponseCompositionPanel from "../../components/analytics/ResponseCompositionPanel";
   ```

3. Replace the placeholder block in the 2-column row:

   ```jsx
   <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
     <TrendPanel
       metric={metric}
       onMetricChange={setMetric}
       data={ts}
       loading={timeseriesQ.isPending}
     />
     <ResponseCompositionPanel kpis={a?.kpis ?? {}} />
   </div>
   ```

- [ ] **Step 4: Barrel + gates + commit.**

Add to `src/components/analytics/index.ts`:

```ts
export { default as TrendPanel } from "./TrendPanel";
export { default as ResponseCompositionPanel } from "./ResponseCompositionPanel";
```

Gates + commit:

```bash
git add src/components/analytics/TrendPanel.jsx src/components/analytics/ResponseCompositionPanel.jsx src/components/analytics/index.ts src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): TrendPanel + ResponseCompositionPanel (F1)

Segundo row del Class Detail: tendencia temporal (bar chart con
tabs métrica pct_correct/avg_time/participation, re-fetch via
useClassTimeseries) + composición de respuestas (donut con número
al centro). Forecast/comparar diferido a F4/F5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `TopicBarListPanel` (Top dominados + críticos)

**Files:**
- Create: `src/components/analytics/TopicBarListPanel.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/ClassDetail.jsx`

- [ ] **Step 1: Write `TopicBarListPanel.jsx`.**

```jsx
// src/components/analytics/TopicBarListPanel.jsx
//
// F1 Analytics Studio: panel con Top-N temas (dominados o críticos)
// del Class Detail. Reusa HorizontalBarList. Variant = "dominated" | "critical".
//
// Props:
//   variant: "dominated" | "critical"
//   topicMastery: array — viene de class_analytics.topic_mastery
//                        [{ topic, retention_score, … }]
//   limit: number = 5
//   onTopicClick: (topic) => void  opcional — F1 no se cablea (la página
//   de Tema entra en F3).

import { HorizontalBarList } from "../charts";

const COLORS = {
  dominated: "#dcfce7", // verde claro
  critical: "#fee2e2",  // rojo claro
};

export default function TopicBarListPanel({
  variant = "dominated",
  topicMastery = [],
  limit = 5,
  onTopicClick,
}) {
  const isDominated = variant === "dominated";
  // class_analytics ya ordena por retention_score ASC (peor primero).
  const sorted = [...topicMastery].sort((a, b) => {
    const av = a.retention_score ?? 0;
    const bv = b.retention_score ?? 0;
    return isDominated ? bv - av : av - bv;
  });
  const items = sorted.slice(0, limit).map((t) => ({
    label: t.topic,
    value: Math.round(t.retention_score ?? 0),
    color: COLORS[variant],
  }));

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {isDominated ? "Top temas dominados" : "Top temas críticos"}
      </div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>
          Sin temas registrados.
        </div>
      ) : (
        <HorizontalBarList
          items={items}
          max={100}
          onItemClick={onTopicClick}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into ClassDetail.**

Import:

```jsx
import TopicBarListPanel from "../../components/analytics/TopicBarListPanel";
```

In the 3-column row, replace the two `data-block="TopicBarListPanel"` placeholders with:

```jsx
<TopicBarListPanel variant="dominated" topicMastery={a?.topic_mastery ?? []} />
<TopicBarListPanel variant="critical" topicMastery={a?.topic_mastery ?? []} />
```

- [ ] **Step 3: Barrel + gates + commit.**

Add `export { default as TopicBarListPanel } from "./TopicBarListPanel";` to the analytics barrel.

```bash
git add src/components/analytics/TopicBarListPanel.jsx src/components/analytics/index.ts src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): TopicBarListPanel — top dominados + críticos (F1)

Panel reutilizable con variant=dominated|critical. Reusa
HorizontalBarList. Click drill-down a la página de Tema queda
deshabilitado en F1 (la página llega en F3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `MostMissedList` (con acciones reusando close-unit-ai)

**Files:**
- Create: `src/components/analytics/MostMissedList.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/ClassDetail.jsx`

- [ ] **Step 1: Write `MostMissedList.jsx`.**

```jsx
// src/components/analytics/MostMissedList.jsx
//
// F1 Analytics Studio: Top preguntas más falladas del Class Detail.
// Recibe most_missed de class_analytics (top 10, ya ordenado por error_rate).
// El botón "Generar repaso" reusa close-unit-ai (mismo motor del CleoStrip)
// para crear un deck nuevo a partir de los temas representados.
//
// Props:
//   classId: string
//   items: most_missed array de class_analytics
//          [{ question_index, deck_id, topic, total_responses, incorrect_count, error_rate }]
//   onItemClick: (item) => void — opcional, drill al DeckResults para el deck/pregunta.

import { useState } from "react";
import {
  generateSuggestedReviewQuestions,
  saveReviewDeck,
} from "../../lib/close-unit-ai";

export default function MostMissedList({ classId, items = [], onItemClick }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleGenerate() {
    if (!classId || items.length === 0) return;
    const topics = Array.from(new Set(items.map((i) => i.topic).filter(Boolean))).slice(0, 3);
    setBusy(true);
    setMsg(null);
    try {
      const questions = await generateSuggestedReviewQuestions({ classId, topics });
      await saveReviewDeck({ classId, topics, questions });
      setMsg("Repaso guardado en la clase.");
    } catch (err) {
      setMsg(`No pude generar: ${err.message || err}`);
    } finally {
      setBusy(false);
    }
  }

  const show = items.slice(0, 3);

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        Más falladas
      </div>
      {show.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 4 }}>Sin datos suficientes.</div>
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
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
      <button
        onClick={handleGenerate}
        disabled={busy || items.length === 0}
        style={{
          marginTop: 8,
          border: "1px solid #2563eb",
          color: "#2563eb",
          background: "transparent",
          padding: "2px 9px",
          borderRadius: 6,
          fontSize: 12,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Generando…" : "Generar repaso"}
      </button>
      {msg && <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75 }}>{msg}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Wire into ClassDetail with onItemClick drill-down.**

Import:

```jsx
import MostMissedList from "../../components/analytics/MostMissedList";
import { buildRoute } from "../../routes";
```

Replace the `data-block="MostMissedList"` placeholder with:

```jsx
<MostMissedList
  classId={classId}
  items={a?.most_missed ?? []}
  onItemClick={(it) => {
    if (it.deck_id) navigate(buildRoute.deckResults(it.deck_id));
  }}
/>
```

- [ ] **Step 3: Barrel + gates + commit.**

```bash
git add src/components/analytics/MostMissedList.jsx src/components/analytics/index.ts src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): MostMissedList with action + drill (F1)

Top 3 preguntas más falladas de la clase (de most_missed del RPC
class_analytics). Click en una pregunta → DeckResults para ese deck
(reusa la página por-pregunta existente). 'Generar repaso' funcional
reusando close-unit-ai.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: `RosterTable`

**Files:**
- Create: `src/components/analytics/RosterTable.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/ClassDetail.jsx`

- [ ] **Step 1: Write `RosterTable.jsx`.**

```jsx
// src/components/analytics/RosterTable.jsx
//
// F1 Analytics Studio: roster del Class Detail con sparklines + badges
// (Semrush "table con visuals en cada fila").
//
// Data: en F1 derivamos el roster del students_snapshot que ya viene en
// analytics_overview (para la lista cross-clase de Director). Pero
// ClassDetail consume class_analytics que NO devuelve students_snapshot.
// → Pedimos al ClassDetail que también pase students (de analytics_overview)
//   filtrados por su classId. Esto evita un RPC nuevo en F1; F2 introduce
//   student_detail y el RosterTable migra a su propio fetch.
//
// Props:
//   students: per-student aggregated array — { name, topics[], avgRetention, weakTopics, strongTopics }
//             (formato que ya entrega buildStudentList en useDirector.js).
//   onRowClick: (student) => void — opcional; F1 puede no cablearlo si la
//               StudentProfile aún no existe (F2).

import { SparklineCell } from "../charts";
import { formatRelativeDay } from "../../lib/analytics";

function badgeStyle(tone) {
  return {
    padding: "1px 7px",
    borderRadius: 10,
    fontSize: 11,
    background:
      tone === "good" ? "#dcfce7" : tone === "warn" ? "#fef3c7" : tone === "bad" ? "#fee2e2" : "#f4f4f5",
    color:
      tone === "good" ? "#15803d" : tone === "warn" ? "#854d0e" : tone === "bad" ? "#b91c1c" : "#52525b",
  };
}

function statusFor(s) {
  if (s.weakTopics > s.strongTopics) return { tone: "bad", label: "Riesgo" };
  if (s.strongTopics > s.weakTopics) return { tone: "good", label: "Subiendo" };
  return { tone: "warn", label: "Estable" };
}

function lastReviewedDate(s) {
  // s.topics each has last_reviewed_at; pick the max.
  let latest = null;
  for (const t of s.topics || []) {
    if (!t.last_reviewed_at) continue;
    const d = new Date(t.last_reviewed_at);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

function topicRetentionPoints(s) {
  // F1: ordenar los topics por last_reviewed_at asc y devolver retention_score
  // como serie. No es una serie temporal real, pero el sparkline ilustra
  // la dispersión del alumno por temas.
  const arr = [...(s.topics || [])]
    .filter((t) => t.last_reviewed_at)
    .sort(
      (a, b) =>
        new Date(a.last_reviewed_at).getTime() - new Date(b.last_reviewed_at).getTime(),
    );
  return arr.map((t) => Number(t.retention_score) || 0);
}

export default function RosterTable({ students = [], onRowClick }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Roster</div>
      {students.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin alumnos registrados.</div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              <th style={{ padding: "5px 0" }}>Alumno</th>
              <th>Retención</th>
              <th>Disp. por tema</th>
              <th>Última actividad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const status = statusFor(s);
              const lastDate = lastReviewedDate(s);
              const points = topicRetentionPoints(s);
              const clickable = !!onRowClick;
              return (
                <tr
                  key={s.name}
                  onClick={clickable ? () => onRowClick(s) : undefined}
                  style={{
                    borderTop: "1px solid #f4f4f5",
                    cursor: clickable ? "pointer" : "default",
                  }}
                >
                  <td style={{ padding: "7px 0" }}>{s.name}</td>
                  <td>
                    <div style={{ display: "inline-block", width: 80, marginRight: 6 }}>
                      <div
                        style={{
                          background:
                            s.avgRetention >= 70
                              ? "#dcfce7"
                              : s.avgRetention >= 40
                                ? "#fef3c7"
                                : "#fee2e2",
                          height: 6,
                          width: `${Math.min(100, s.avgRetention)}%`,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    {s.avgRetention}%
                  </td>
                  <td>
                    <SparklineCell points={points} trend="flat" width={70} height={16} />
                  </td>
                  <td>{formatRelativeDay(lastDate)}</td>
                  <td>
                    <span style={badgeStyle(status.tone)}>{status.label}</span>
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

- [ ] **Step 2: Wire into ClassDetail.**

ClassDetail needs students for this class. The `useDirector` hook returns the per-class students under `studentData[classId]`. Reuse it: ClassDetail calls `useDirector` purely to grab `studentData[classId]`. React Query caches the call (DIRECTOR_KEY), so if Director is already in cache, this is free.

Add to `src/pages/analytics/ClassDetail.jsx`:

```jsx
import { useDirector } from "../../hooks/useDirector";
import RosterTable from "../../components/analytics/RosterTable";

// inside the component, near the other hooks:
const directorQ = useDirector();
const students = directorQ.data?.studentData?.[classId] ?? [];
```

Replace `<div data-block="RosterTable" />` with:

```jsx
<RosterTable students={students} /* onRowClick = F2 student page */ />
```

- [ ] **Step 3: Barrel + gates + commit.**

```bash
git add src/components/analytics/RosterTable.jsx src/components/analytics/index.ts src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): RosterTable with sparkline + badges (F1)

Tabla del Class Detail con avatar, retención (mini-bar), dispersión
por tema (sparkline), última actividad (relativa) y badge de estado.
F1 reusa students del useDirector cache (DIRECTOR_KEY) por classId
para evitar otro RPC; F2 introducirá student_detail y la tabla
migra a su propio fetch + drill-down al StudentProfile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Director roster → `/school/class/:id` navigation

**Files:**
- Modify: `src/pages/Director.jsx`

Director ya tiene cards de clase (cross-clase). Cada card debe ser clickeable a la nueva página de detalle.

- [ ] **Step 1: Read Director.jsx to find the class-cards block.**

Use the **Read tool** on `src/pages/Director.jsx`. Look for where `classes.map(...)` (o equivalente) renderiza cards/rows con nombre de clase. Probablemente alrededor de los lines 245-285 según el final review.

- [ ] **Step 2: Add navigation handler.**

Add (near the existing imports):

```jsx
import { useNavigate } from "react-router-dom";
import { buildRoute } from "../routes";
```

Inside the `Director` component, add:

```jsx
const navigate = useNavigate();
```

For each clickable class card / row, add `onClick`:

```jsx
onClick={() => navigate(buildRoute.analyticsClass(cls.id))}
style={{ ..., cursor: "pointer" }}
```

If Director already has card hover/active styles, reuse them — solo agregar el onClick + cursor.

- [ ] **Step 3: Gates + commit.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/pages/Director.jsx
git commit -m "feat(analytics): class cards in Director navigate to /school/class/:id (F1)

Cierra el loop: usuario aterriza en /school (Resumen), clic en una
clase del overview lo lleva al Class Detail (F1). Última pieza para
que la página estrella sea alcanzable navegando, no solo por URL.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Final gates + final review + PR

- [ ] **Step 1: Run all 4 gates.**

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: 0 lint errors, 0 typecheck errors, all tests passing (≥330 — should be 330 + 14 new formatters tests = 344), build OK.

- [ ] **Step 2: Sanity-check the F1 commits.**

```bash
git log --oneline <F0-tip>..HEAD
```

Where `<F0-tip>` = commit `cd6d39e` (last F0 commit on PR #63). Expected: 12 new commits (one per task 1-12, plus possibly small barrel updates).

- [ ] **Step 3: Dispatch final code review subagent.**

Use the same pattern as F0 — dispatch a `general-purpose` subagent with a code-review prompt scoped to the F1 diff range. Ask it to focus on:
- Whether each block reads the correct fields from the RPC outputs (kpis, topic_mastery, most_missed shape).
- The CleoStrip / MostMissedList action paths (close-unit-ai integration).
- Any leaked styles / leftover placeholder divs.
- Whether the StudioShell "Clase" enablement renders correctly when on `/school/class/:id`.

Fix any 🟥/🟧 issues found in 1-2 commits, then proceed.

- [ ] **Step 4: Push the branch + open the PR.**

```bash
git push -u origin claude/analytics-studio-f1
gh pr create --base main --head claude/analytics-studio-f1 --title "feat(analytics): Analytics Studio F1 — Class Detail page" --body "$(cat <<'EOF'
## Summary

Fase 1 de Analytics Studio: la **Class Detail page** (el dashboard estrella) en `/school/class/:classId`. Reusa todas las RPCs y hooks de F0 (PR #63) — solo JS/React, sin migraciones SQL.

- 📐 Página completa con los **7 bloques** del look Semrush:
  - KpiBand · CleoStrip · TrendPanel · ResponseCompositionPanel · TopicBarListPanel (×2) · MostMissedList · RosterTable
- 🔗 Director's class cards → /school/class/:id (close el loop de navegación).
- 🧱 4 chart wrappers nuevos: TrendBarChart, Donut, HorizontalBarList, SparklineCell.
- 🧮 formatters.ts puro + tests (~14 unit tests).
- 🪝 Reusa useClassAnalytics + useClassTimeseries (de F0). El RosterTable reusa useDirector cache (DIRECTOR_KEY) para evitar otro RPC en F1.
- 🤖 CleoStrip + MostMissedList: chips de acción FUNCIONALES reusando close-unit-ai (Generar repaso → deck nuevo en la clase). Narrativa real de Cleo llega en F5.

## What's NOT here (deferred)

- StudentProfile (F2), TopicMastery (F3), CompareToggle wiring (F4), forecast band + Cleo narrative (F5), Live (F6), Reports/Export (F7).
- Crossfilter / drawer / brush+zoom / keyboard nav — polish posterior.

## Spec + plan

- 📄 `docs/superpowers/specs/2026-05-28-analytics-studio-design.md`
- 📋 `docs/superpowers/plans/2026-05-28-analytics-studio-phase-1.md`

## Test plan

- [ ] Login como pedro@hola.com, abrir /school.
- [ ] Click en una class card del Resumen → URL cambia a /school/class/<id>, ClassDetail carga.
- [ ] StudioShell: 'Clase' destacado activo; los otros 5 disabled.
- [ ] KpiBand renderiza 5 tiles con sparklines y números coherentes.
- [ ] CleoStrip muestra placeholder + 'Generar repaso de lo flojo' funcional (crea deck visible en la clase).
- [ ] TrendPanel cambia entre % correcto / Tiempo medio / Participación y re-fetches data.
- [ ] ResponseCompositionPanel donut con número grande al centro.
- [ ] Top temas dominados + críticos rinden 5 barras cada uno.
- [ ] MostMissedList: 3 ítems con error rate, click va a DeckResults, 'Generar repaso' funcional.
- [ ] RosterTable con avatar/nombre, mini-bar de retención, sparkline de dispersión, fecha relativa, badge de estado.
- [ ] Chips de período (7d/30d/90d) re-filtran toda la página.
- [ ] No console errors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

If F0 (PR #63) hasn't merged yet, set `--base claude/vigorous-chaum-c056f3` (stacked PR) instead of `main`. After F0 merges, the PR auto-updates to compare against main.

- [ ] **Step 5: Offer the user the verification path.**

> "F1 PR abierto en #NN. Login a pedro@hola.com, /school, click en una clase → debes ver la Class Detail con los 7 bloques. Reporta cualquier regresión visual o de datos."

---

## Spec Coverage Self-Review

| Spec §5 / §9 F1 deliverable | Task |
|------------------------------|------|
| KpiBand (5 tiles con sparkline) | Task 6 |
| CleoStrip (placeholder narrative + acciones) | Task 7 |
| TrendPanel (bar chart, tabs métrica) | Task 8 |
| ResponseCompositionPanel (donut + leyenda) | Task 8 |
| TopicBarListPanel (dominated + critical) | Task 9 |
| MostMissedList (+ acción reusando close-unit-ai) | Task 10 |
| RosterTable (sparkline + badges) | Task 11 |
| Class Actions (lanzar repaso, exportar) | Partial — Lanzar repaso vive en CleoStrip + MostMissedList; Exportar = F7 |
| /school/class/:id routing | Task 2 |
| Director cards → navegación | Task 12 |
| formatters.ts pure lib | Task 1 |
| 4 chart wrappers (TrendBarChart, Donut, HorizontalBarList, SparklineCell) | Tasks 3-4 |
| StudioShell view='class' activation | Task 2 |

All F1 spec items mapped.

## Open notes

- **Class Actions panel separado** (un componente `ClassActions` con "Lanzar repaso" y "Exportar") podría agregarse después si la página lo necesita visualmente; en F1 las acciones viven dentro de CleoStrip y MostMissedList que es suficiente.
- **Sub-nav nav from `/school` to `/school/class/<id>`:** F1 no permite clicar 'Clase' en el sub-nav desde Resumen (no hay 'última clase' state). El roster del Director es el único path.
- **`participation_pct` del RPC analytics_overview** se devuelve pero no se muestra todavía en el Class Detail (KpiBand usa `kpis.unique_participants`). Decidir en F4 si lo cableamos al CompareToggle.
- **Sparkline en KpiBand para "Tiempo promedio" + "Temas en riesgo":** no se renderiza porque no es serie temporal natural. Quedan como tiles "limpias" sin spark.
