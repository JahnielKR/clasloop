# Analytics Studio — Fase 8 (Interactividad viva) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cumplir la capa de interactividad "vivo en todo" que el spec §5.2 / §7.3 prometió y que F1–F7 dejó sin construir: (1) **sort + filtro** en las tablas (RosterTable, SessionHistoryTable); (2) **keyboard nav** (filas y barras focuseables + Enter/Space para drill); (3) **tooltips ricos** (delta vs bucket previo en TrendBarChart, title enriquecido en barras y stat cards); (4) **crossfilter** (`useCrossfilter` Context: click en un tema crítico resalta sus preguntas en "Más falladas"); (5) **drawer lateral** (click en una fila del roster abre un quick-peek del alumno sin perder la página, con botón "Ver perfil completo").

**Architecture:** **Cero SQL, cero deps nuevas.** Toda la matemática nueva (orden de tablas) vive en una lib pura testeable (`table-sort.ts`). El crossfilter es un Context + hook (`useCrossfilter`) scoped a ClassDetail (estado en la página, leído por los widgets). El drawer es un componente presentacional que recibe datos ya cargados (peek instantáneo, sin fetch nuevo) + un botón que navega al perfil completo. Las tablas manejan su orden/filtro con estado local usando el helper puro. Sin god-files: cada cambio es acotado a su componente.

**Tech Stack:** React 18, vitest. Sin librerías nuevas. Reusa `useStudentDetail`/`useStudentRisk`/`riskScore` ya existentes donde aplica.

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §5.2 (tabla de interactividad), §7.3 (`useCrossfilter`).

**Branch:** `claude/analytics-studio-f8` — **FRESH off main** (`32f1d8a`, post F7).

**Depends on:** F1 (RosterTable, TopicBarListPanel, MostMissedList, HorizontalBarList, StatCardWithSparkline, TrendBarChart), F2 (SessionHistoryTable, StudentProfile), F5 (riskScore, RiskBadge).

---

## Decisiones de diseño (tomadas, no diferidas)

| Decisión | Valor | Razón |
|----------|-------|-------|
| Drawer vs navegación | **Coexisten.** Click en fila del roster → drawer peek; botón "Ver perfil completo →" navega a `/school/student/...`. | El peek es menos disruptivo (default); el drill completo es un click más. No se pierde nada. |
| Drawer data | **Sin fetch nuevo** — usa los datos del roster snapshot + riskInputs que ClassDetail ya tiene. | Peek instantáneo. El perfil completo (full fetch) ya existe en StudentProfile. |
| Crossfilter scope | **Solo ClassDetail en F8.** TopicBarListPanel (crítico) → MostMissedList. | Acotado y verificable. Extender a más widgets/vistas es follow-up. El Context queda listo para crecer. |
| Sort/filter tablas | **RosterTable** (sort 4 columnas + filtro texto por nombre) + **SessionHistoryTable** (sort 2 columnas). | Las 2 tablas que un docente escanea. La lógica de orden es pura/testeable. |
| Tooltips ricos | **TrendBarChart**: custom content con delta vs bucket previo. **HorizontalBarList + StatCard**: `title` HTML enriquecido (hover nativo). | El spec pide "valor + delta + contexto". Custom tooltip flotante full es polish; title nativo + el de recharts cubren el 80% sin lib nueva. |
| Keyboard nav | Filas/barras `tabIndex=0` + Enter/Space → drill. | Tab navega entre ellas (accesible). ↑↓ roving-tabindex es follow-up documentado. |

---

## Pre-task: File Structure

**Create (4 files):**

```
src/lib/analytics/
  table-sort.ts                          # NEW: pure sortRows + nextSortDir helpers
  __tests__/table-sort.test.ts           # NEW

src/hooks/
  useCrossfilter.jsx                     # NEW: Context + provider + hook (selectedTopic toggle)

src/components/analytics/
  StudentDrawer.jsx                      # NEW: lateral quick-peek of a roster student
```

**Modify (8 files):**

```
src/lib/analytics/index.ts               # +export table-sort
src/components/analytics/index.ts        # +export StudentDrawer
src/components/analytics/RosterTable.jsx          # sortable headers + name filter + keyboard rows
src/components/analytics/SessionHistoryTable.jsx  # sortable headers + keyboard rows
src/components/charts/HorizontalBarList.jsx       # keyboard (tabIndex+Enter) + rich title + active/dim for crossfilter
src/components/charts/TrendBarChart.jsx           # custom rich tooltip (delta vs prev bucket)
src/components/analytics/StatCardWithSparkline.jsx # rich title tooltip on the value
src/components/analytics/MostMissedList.jsx       # read crossfilter: highlight/dim rows by selected topic
src/pages/analytics/ClassDetail.jsx               # CrossfilterProvider + StudentDrawer state + wire
```

**Out of scope for F8 (explicit):**
- **Brush + zoom** on trends (recharts `<Brush>`) — separate, heavier; deferred.
- **↑↓ roving-tabindex** within tables — F8 uses focusable rows + Tab + Enter (accessible); arrow-key roving is a follow-up.
- **Crossfilter beyond ClassDetail** (StudentProfile/TopicMastery) and beyond topic→questions (e.g. topic→students highlight needs per-topic-per-student data not in the roster snapshot).
- **Full floating custom tooltips** on every viz — F8 does the rich TrendBarChart tooltip + native `title` elsewhere.
- **CountUp / motion** on numbers — that's F9 (Pulido).

---

## Task 1: TDD — `table-sort.ts` pure helpers

**Files:**
- Test: `src/lib/analytics/__tests__/table-sort.test.ts`
- Create: `src/lib/analytics/table-sort.ts`

Helpers puros para ordenar filas por un accessor + dirección, y para ciclar la dirección al click de header. Nulls van siempre al final. Orden estable.

### Step 1: Write failing tests

Create `src/lib/analytics/__tests__/table-sort.test.ts`:

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { sortRows, nextSortDir } from "../table-sort";

describe("sortRows", () => {
  const rows = [
    { name: "Beto", score: 40 },
    { name: "Ana", score: 90 },
    { name: "Cleo", score: null },
    { name: "Dux", score: 70 },
  ];

  it("sorts ascending by a numeric accessor", () => {
    const out = sortRows(rows, (r) => r.score, "asc");
    expect(out.map((r) => r.name)).toEqual(["Beto", "Dux", "Ana", "Cleo"]);
  });
  it("sorts descending by a numeric accessor", () => {
    const out = sortRows(rows, (r) => r.score, "desc");
    expect(out.map((r) => r.name)).toEqual(["Ana", "Dux", "Beto", "Cleo"]);
  });
  it("puts null/undefined accessor values last regardless of direction", () => {
    expect(sortRows(rows, (r) => r.score, "asc").at(-1).name).toBe("Cleo");
    expect(sortRows(rows, (r) => r.score, "desc").at(-1).name).toBe("Cleo");
  });
  it("sorts strings case-insensitively", () => {
    const out = sortRows(rows, (r) => r.name, "asc");
    expect(out.map((r) => r.name)).toEqual(["Ana", "Beto", "Cleo", "Dux"]);
  });
  it("does not mutate the input array", () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.score, "asc");
    expect(rows).toEqual(copy);
  });
  it("returns the array unchanged when dir is null (no sort)", () => {
    const out = sortRows(rows, (r) => r.score, null);
    expect(out.map((r) => r.name)).toEqual(["Beto", "Ana", "Cleo", "Dux"]);
  });
});

describe("nextSortDir", () => {
  it("cycles asc → desc → null when clicking the same key", () => {
    expect(nextSortDir(null, "asc")).toBe("desc"); // currently asc, click same → desc
    expect(nextSortDir("desc", "desc")).toBe(null); // currently desc, click same → null
    expect(nextSortDir(null, null)).toBe("asc");    // unsorted, first click → asc
  });
  it("resets to asc when switching to a different key", () => {
    // currentDir for the NEW key is null (it wasn't the active key) → asc
    expect(nextSortDir(null, null)).toBe("asc");
  });
});
```

### Step 2: Run; expect red

```bash
npm run test:run -- src/lib/analytics
```

### Step 3: Implement `src/lib/analytics/table-sort.ts`

```ts
// ─── src/lib/analytics/table-sort.ts ───────────────────────────────────
// Helpers puros para tablas ordenables. Sin React, sin Supabase.
// sortRows: orden estable por accessor + dirección; null/undefined al final.
// nextSortDir: ciclo de dirección al click del header (asc → desc → none).

export type SortDir = "asc" | "desc" | null;

/**
 * Sorta una copia de `rows` por el valor que devuelve `accessor`.
 * - dir null → devuelve una copia sin ordenar (orden original).
 * - null/undefined del accessor van SIEMPRE al final (en asc y desc).
 * - strings se comparan case-insensitive con localeCompare.
 * - orden estable (preserva el orden relativo de empates).
 */
export function sortRows<T>(
  rows: readonly T[],
  accessor: (row: T) => unknown,
  dir: SortDir,
): T[] {
  const copy = [...rows];
  if (!dir) return copy;
  const factor = dir === "asc" ? 1 : -1;
  // decorate-sort-undecorate para estabilidad
  return copy
    .map((row, i) => ({ row, i, v: accessor(row) }))
    .sort((a, b) => {
      const an = a.v == null;
      const bn = b.v == null;
      if (an && bn) return a.i - b.i;
      if (an) return 1; // nulls al final siempre
      if (bn) return -1;
      let cmp: number;
      if (typeof a.v === "string" || typeof b.v === "string") {
        cmp = String(a.v).localeCompare(String(b.v), undefined, { sensitivity: "base" });
      } else {
        cmp = (a.v as number) - (b.v as number);
      }
      if (cmp === 0) return a.i - b.i; // estable
      return cmp * factor;
    })
    .map((d) => d.row);
}

/**
 * Próxima dirección al clickear un header.
 * Si clickeás la columna ACTIVA: asc → desc → null (des-ordena).
 * Si clickeás una columna NUEVA: su currentDir es null → asc.
 * Llamá con la dirección actual de ESA columna (null si no es la activa).
 */
export function nextSortDir(_prevForOtherKeys: SortDir, currentDirForKey: SortDir): SortDir {
  if (currentDirForKey === "asc") return "desc";
  if (currentDirForKey === "desc") return null;
  return "asc";
}
```

### Step 4: Run tests; expect green

```bash
npm run test:run -- src/lib/analytics
```

Expected: previous (~91 from F7) + ~8 table-sort = ≥99 passing.

### Step 5: Barrel + commit

Add to `src/lib/analytics/index.ts`:

```ts
export * from "./table-sort";
```

```bash
git add src/lib/analytics/table-sort.ts src/lib/analytics/__tests__/table-sort.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): table-sort.ts — pure sort helpers (F8)

sortRows (orden estable, null/undefined al final, strings case-insensitive,
no muta) + nextSortDir (ciclo asc→desc→none al click de header). Sin React,
sin Supabase. ~8 unit tests. Base para las tablas ordenables (Task 2-3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: RosterTable — sortable headers + name filter + keyboard rows

**Files:**
- Modify: `src/components/analytics/RosterTable.jsx`

Las columnas (Alumno / Retención / Riesgo / Última actividad) se vuelven clickeables para ordenar. Un input de texto filtra por nombre. Las filas son focuseables (Enter/Space drill). El sort usa `table-sort.ts`.

Current signature: `RosterTable({ students = [], riskInputsByName = {}, onRowClick })`.

### Step 1: Rewrite `src/components/analytics/RosterTable.jsx`

The file currently maps `students` directly. We add: `sortKey`/`sortDir`/`filter` state, an accessor map, a filter input, sortable `<th>`s, and focusable rows. Replace the whole file:

```jsx
// src/components/analytics/RosterTable.jsx
//
// F1 Analytics Studio: roster del Class Detail con sparklines + badges.
// F5: columna de riesgo (RiskBadge).
// F8: headers ordenables (table-sort), filtro por nombre, filas con
// keyboard nav (tabIndex + Enter/Space → drill).

import { useMemo, useState } from "react";
import { SparklineCell } from "../charts";
import { formatRelativeDay } from "../../lib/analytics/formatters";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";
import RiskBadge from "./RiskBadge";
import { riskScore } from "../../lib/analytics/risk";

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
  let latest = null;
  for (const t of s.topics || []) {
    if (!t.last_reviewed_at) continue;
    const d = new Date(t.last_reviewed_at);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

function topicRetentionPoints(s) {
  const arr = [...(s.topics || [])]
    .filter((t) => t.last_reviewed_at)
    .sort(
      (a, b) =>
        new Date(a.last_reviewed_at).getTime() - new Date(b.last_reviewed_at).getTime(),
    );
  return arr.map((t) => Number(t.retention_score) || 0);
}

// Columnas ordenables: key → accessor sobre el row "decorado" (ver más abajo).
const COLUMNS = [
  { key: "name", label: "Alumno", accessor: (r) => r.name },
  { key: "retention", label: "Retención", accessor: (r) => r.avgRetention },
  { key: "risk", label: "Riesgo", accessor: (r) => r._riskScore },
  { key: "lastActivity", label: "Última actividad", accessor: (r) => r._lastTs },
  { key: "status", label: "Estado", accessor: (r) => r._statusLabel },
];

export default function RosterTable({ students = [], riskInputsByName = {}, onRowClick }) {
  const [sortKey, setSortKey] = useState("retention");
  const [sortDir, setSortDir] = useState("desc");
  const [filter, setFilter] = useState("");

  // Decorate rows once: precompute risk score, last-activity timestamp, status
  // label so the sort accessors are cheap + stable.
  const decorated = useMemo(() => {
    return students.map((s) => {
      const inputs = riskInputsByName[s.name];
      const risk = inputs ? riskScore(inputs) : null;
      const lastDate = lastReviewedDate(s);
      return {
        ...s,
        _risk: risk,
        _riskScore: risk ? risk.score : null,
        _lastTs: lastDate ? lastDate.getTime() : null,
        _lastDate: lastDate,
        _statusLabel: statusFor(s).label,
      };
    });
  }, [students, riskInputsByName]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return decorated;
    return decorated.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [decorated, filter]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return sortRows(filtered, col.accessor, sortDir);
  }, [filtered, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) {
      const nd = nextSortDir(null, sortDir);
      if (nd === null) {
        setSortKey("retention");
        setSortDir("desc");
      } else {
        setSortDir(nd);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const arrow = (key) => {
    if (key !== sortKey || !sortDir) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Roster</div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre…"
          aria-label="Filtrar alumnos por nombre"
          style={{
            marginLeft: "auto",
            padding: "4px 9px",
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid #e4e4e7",
            width: 170,
          }}
        />
      </div>
      {students.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin alumnos registrados.</div>
      ) : sorted.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin alumnos que coincidan con “{filter}”.</div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  aria-sort={c.key === sortKey ? (sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none") : "none"}
                  style={{ padding: "5px 0", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  title="Ordenar"
                >
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const status = statusFor(s);
              const points = topicRetentionPoints(s);
              const clickable = !!onRowClick;
              const drill = clickable ? () => onRowClick(s) : undefined;
              return (
                <tr
                  key={s.name}
                  onClick={drill}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            drill();
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  style={{ borderTop: "1px solid #f4f4f5", cursor: clickable ? "pointer" : "default" }}
                >
                  <td style={{ padding: "7px 0" }}>{s.name}</td>
                  <td>
                    <div style={{ display: "inline-block", width: 80, marginRight: 6 }}>
                      <div
                        style={{
                          background: s.avgRetention >= 70 ? "#dcfce7" : s.avgRetention >= 40 ? "#fef3c7" : "#fee2e2",
                          height: 6,
                          width: `${Math.min(100, s.avgRetention)}%`,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    {s.avgRetention}%
                  </td>
                  <td>
                    {s._risk ? (
                      <RiskBadge level={s._risk.level} score={s._risk.score} compact />
                    ) : (
                      <span style={{ opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td>{formatRelativeDay(s._lastDate)}</td>
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

### Step 2: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/RosterTable.jsx
git commit -m "feat(analytics): RosterTable sortable + filter + keyboard (F8)

Headers ordenables (table-sort.sortRows + nextSortDir cycle), filtro de
texto por nombre, filas focuseables con Enter/Space → drill. Rows
decoradas con risk score + last-activity ts para accessors estables.
aria-sort en los headers. Default sort: retención desc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: SessionHistoryTable — sortable headers + keyboard rows

**Files:**
- Modify: `src/components/analytics/SessionHistoryTable.jsx`

Sort por "Cuándo" (fecha) y "% correcto". Filas focuseables (las que tienen deck_id).

### Step 1: Rewrite `src/components/analytics/SessionHistoryTable.jsx`

```jsx
// src/components/analytics/SessionHistoryTable.jsx
//
// F2 Analytics Studio: historial por sesión del alumno.
// F8: headers ordenables (Cuándo / % correcto) + filas con keyboard nav.

import { useMemo, useState } from "react";
import {
  formatPercent,
  formatDurationShort,
  formatRelativeDay,
} from "../../lib/analytics/formatters";
import { sortRows, nextSortDir } from "../../lib/analytics/table-sort";

function pctColor(pct) {
  if (pct == null) return "#71717a";
  if (pct >= 70) return "#15803d";
  if (pct >= 40) return "#854d0e";
  return "#b91c1c";
}

const TYPE_LABEL = { warmup: "Warmup", exitTicket: "Exit ticket" };

// Columnas ordenables (las no-ordenables van sin onClick).
const SORT_COLS = {
  when: (r) => (r.session_completed_at ? new Date(r.session_completed_at).getTime() : null),
  pct: (r) => (r.pct_correct == null ? null : Number(r.pct_correct)),
};

export default function SessionHistoryTable({ items = [], onRowClick }) {
  // Default: por fecha desc (el RPC ya viene así, pero hacemos el sort explícito).
  const [sortKey, setSortKey] = useState("when");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const accessor = SORT_COLS[sortKey];
    if (!accessor) return items;
    return sortRows(items, accessor, sortDir);
  }, [items, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) {
      const nd = nextSortDir(null, sortDir);
      if (nd === null) {
        setSortKey("when");
        setSortDir("desc");
      } else {
        setSortDir(nd);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  const arrow = (key) => (key !== sortKey || !sortDir ? "" : sortDir === "asc" ? " ▲" : " ▼");
  const sortableTh = (key, label) => (
    <th
      onClick={() => handleSort(key)}
      aria-sort={key === sortKey ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      title="Ordenar"
    >
      {label}{arrow(key)}
    </th>
  );

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Historial por sesión</div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>
          Sin sesiones completadas en esta ventana.
        </div>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, textAlign: "left" }}>
            <tr>
              <th style={{ padding: "5px 0" }}>{sortableTh("when", "Cuándo")}</th>
              <th>Tema</th>
              <th>Tipo</th>
              {sortableTh("pct", "% correcto")}
              <th>Tiempo medio</th>
              <th>Respuestas</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((it) => {
              const clickable = !!onRowClick && !!it.deck_id;
              const drill = clickable ? () => onRowClick(it) : undefined;
              return (
                <tr
                  key={it.session_id}
                  onClick={drill}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            drill();
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                  style={{ borderTop: "1px solid #f4f4f5", cursor: clickable ? "pointer" : "default" }}
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

Note: the `<th style={{ padding: "5px 0" }}>{sortableTh(...)}</th>` double-wrap is wrong — `sortableTh` already returns a `<th>`. Fix: render `sortableTh("when","Cuándo")` directly as the cell (it IS the `<th>`), and add the padding into `sortableTh`'s style. Adjust `sortableTh` to take an optional `first` flag for the left padding:

```jsx
  const sortableTh = (key, label, first = false) => (
    <th
      onClick={() => handleSort(key)}
      aria-sort={key === sortKey ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", padding: first ? "5px 0" : undefined }}
      title="Ordenar"
    >
      {label}{arrow(key)}
    </th>
  );
```

And the header row becomes:

```jsx
<tr>
  {sortableTh("when", "Cuándo", true)}
  <th>Tema</th>
  <th>Tipo</th>
  {sortableTh("pct", "% correcto")}
  <th>Tiempo medio</th>
  <th>Respuestas</th>
</tr>
```

### Step 2: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/SessionHistoryTable.jsx
git commit -m "feat(analytics): SessionHistoryTable sortable + keyboard (F8)

Headers 'Cuándo' y '% correcto' ordenables (table-sort), filas con deck_id
focuseables (Enter/Space → DeckResults). Default: fecha desc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Rich tooltips — TrendBarChart + HorizontalBarList + StatCardWithSparkline

**Files:**
- Modify: `src/components/charts/TrendBarChart.jsx`
- Modify: `src/components/charts/HorizontalBarList.jsx`
- Modify: `src/components/analytics/StatCardWithSparkline.jsx`

### Step 1: TrendBarChart — custom tooltip content with delta vs previous bucket

In `src/components/charts/TrendBarChart.jsx`, replace the `<Tooltip ... />` element with a custom `content` renderer that shows the value + delta vs the previous bucket. Add this component above the default export, and reference the merged data for prev-bucket lookup.

Add near the top (after imports):

```jsx
// F8: tooltip rico — valor + delta vs el bucket anterior de la misma serie.
function RichTooltip({ active, payload, label, yFormatter, yLabel, rows }) {
  if (!active || !payload || payload.length === 0) return null;
  // El bucket actual es `label`; buscamos su índice en rows para el delta.
  const idx = rows.findIndex((r) => r.bucket === label);
  const cur = rows[idx];
  const prev = idx > 0 ? rows[idx - 1] : null;
  const mainEntry = payload.find((p) => p.dataKey === "value") || payload[0];
  const v = mainEntry?.value;
  let deltaNode = null;
  if (cur && prev && typeof cur.value === "number" && typeof prev.value === "number") {
    const d = Math.round((cur.value - prev.value) * 10) / 10;
    const tone = d > 0 ? "#15803d" : d < 0 ? "#b91c1c" : "#71717a";
    const sign = d > 0 ? "▲ +" : d < 0 ? "▼ " : "→ ";
    deltaNode = (
      <div style={{ color: tone, fontSize: 11, marginTop: 2 }}>
        {sign}{Math.abs(d)} vs bucket anterior
      </div>
    );
  }
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 6, fontSize: 12, padding: "6px 10px" }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div>{yLabel}: <b>{yFormatter(v)}</b></div>
      {payload.find((p) => p.dataKey === "compare_value") && (
        <div style={{ color: "#2563eb", fontSize: 11 }}>
          Período anterior: {yFormatter(payload.find((p) => p.dataKey === "compare_value").value)}
        </div>
      )}
      {deltaNode}
    </div>
  );
}
```

Then replace the existing `<Tooltip ... />` JSX with:

```jsx
<Tooltip
  cursor={{ fill: "#eff6ff" }}
  content={(props) => (
    <RichTooltip {...props} yFormatter={yFormatter} yLabel={yLabel} rows={merged} />
  )}
/>
```

(`merged` is the array already built in the component body. `yFormatter` + `yLabel` are props.)

### Step 2: HorizontalBarList — keyboard + rich title + crossfilter active/dim

In `src/components/charts/HorizontalBarList.jsx`, add: a `title` on each row (rich hover), `tabIndex`/`onKeyDown` when clickable, and optional `activeLabel` + `dimWhenInactive` props for the crossfilter (Task 5 will pass them). Replace the file:

```jsx
// src/components/charts/HorizontalBarList.jsx
//
// F1 Analytics Studio: Top-N de barras horizontales (estilo Semrush).
// F8: keyboard (tabIndex + Enter/Space), title rico en hover, y soporte
// de crossfilter (activeLabel resalta una barra y atenúa el resto).
//
// Props:
//   items, max, valueFormatter, onItemClick (igual que F1)
//   activeLabel?: string  — la barra cuyo label coincide se resalta; si hay
//                           activeLabel, las demás se atenúan.
//   titleFormatter?: (item) => string  — texto del title nativo en hover.

export default function HorizontalBarList({
  items = [],
  max,
  valueFormatter = (n) => `${n}%`,
  onItemClick,
  activeLabel = null,
  titleFormatter,
}) {
  const cap = max ?? Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      {items.map((item, idx) => {
        const pct = Math.min(100, ((item.value || 0) / cap) * 100);
        const color = item.color || "#dbeafe";
        const clickable = !!onItemClick;
        const isActive = activeLabel != null && item.label === activeLabel;
        const dimmed = activeLabel != null && !isActive;
        const drill = clickable ? () => onItemClick(item) : undefined;
        return (
          <div
            key={item.label + idx}
            onClick={drill}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      drill();
                    }
                  }
                : undefined
            }
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? "button" : undefined}
            title={titleFormatter ? titleFormatter(item) : `${item.label}: ${valueFormatter(item.value)}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 0",
              cursor: clickable ? "pointer" : "default",
              opacity: dimmed ? 0.4 : 1,
              fontWeight: isActive ? 700 : 400,
              transition: "opacity .15s ease",
            }}
          >
            <span style={{ flex: "0 0 90px", color: "#111" }}>{item.label}</span>
            <span aria-hidden style={{ flex: 1, height: 6, background: "#f4f4f5", borderRadius: 3, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
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

### Step 3: StatCardWithSparkline — rich title on the value

In `src/components/analytics/StatCardWithSparkline.jsx`, add an optional `hint` prop and render it as the `title` of the value span (native hover tooltip):

Change the signature:
```jsx
export default function StatCardWithSparkline({
  label,
  value,
  delta = null,
  sparkPoints,
  sparkTrend,
  tone = "default",
  hint = null,   // F8: rich native tooltip on hover
}) {
```

Change the value span:
```jsx
<span style={{ fontSize: 24, fontWeight: 700 }} title={hint || undefined}>{value}</span>
```

(Callers can pass `hint` later; if not passed, no tooltip — back-compat.)

### Step 4: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/charts/TrendBarChart.jsx src/components/charts/HorizontalBarList.jsx src/components/analytics/StatCardWithSparkline.jsx
git commit -m "feat(analytics): rich tooltips + keyboard on bars (F8)

TrendBarChart: custom tooltip content con delta vs bucket anterior +
período anterior cuando hay compare. HorizontalBarList: tabIndex+Enter,
title nativo rico, y activeLabel para resaltar/atenuar (crossfilter T5).
StatCardWithSparkline: prop hint opcional → title nativo en el valor.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `useCrossfilter` Context + wire TopicBarListPanel ↔ MostMissedList

**Files:**
- Create: `src/hooks/useCrossfilter.jsx`
- Modify: `src/components/analytics/TopicBarListPanel.jsx`
- Modify: `src/components/analytics/MostMissedList.jsx`
- Modify: `src/pages/analytics/ClassDetail.jsx`

El crossfilter es un Context con `{ selectedTopic, toggleTopic }`. ClassDetail lo provee. TopicBarListPanel (crítico) llama `toggleTopic(label)` al click (además del drill). MostMissedList lee `selectedTopic` y resalta las preguntas de ese tema (atenúa el resto).

### Step 1: Create `src/hooks/useCrossfilter.jsx`

```jsx
// src/hooks/useCrossfilter.jsx
//
// F8 Analytics Studio: estado de crossfilter compartido entre los widgets
// de una vista (spec §7.3). En F8 sólo lleva `selectedTopic` (click en un
// tema resalta sus preguntas en otros widgets). Extensible a más ejes
// (alumno, deck) en el futuro sin cambiar la API.

import { createContext, useContext, useMemo, useState } from "react";

const CrossfilterContext = createContext(null);

export function CrossfilterProvider({ children }) {
  const [selectedTopic, setSelectedTopic] = useState(null);

  const value = useMemo(
    () => ({
      selectedTopic,
      // Toggle: click en el mismo tema lo deselecciona.
      toggleTopic: (topic) =>
        setSelectedTopic((cur) => (cur === topic ? null : topic)),
      clear: () => setSelectedTopic(null),
    }),
    [selectedTopic],
  );

  return <CrossfilterContext.Provider value={value}>{children}</CrossfilterContext.Provider>;
}

// Devuelve el estado de crossfilter, o un no-op seguro si no hay provider
// (así los widgets se pueden usar fuera de una vista con crossfilter).
export function useCrossfilter() {
  return (
    useContext(CrossfilterContext) || {
      selectedTopic: null,
      toggleTopic: () => {},
      clear: () => {},
    }
  );
}
```

### Step 2: TopicBarListPanel — call toggleTopic + show active bar

In `src/components/analytics/TopicBarListPanel.jsx`, read the crossfilter and pass `activeLabel` to HorizontalBarList; make the critical variant toggle the topic on click (in addition to the existing `onTopicClick` drill).

```jsx
import { HorizontalBarList } from "../charts";
import { useCrossfilter } from "../../hooks/useCrossfilter";

const COLORS = { dominated: "#dcfce7", critical: "#fee2e2" };

export default function TopicBarListPanel({
  variant = "dominated",
  topicMastery = [],
  limit = 5,
  onTopicClick,
}) {
  const { selectedTopic, toggleTopic } = useCrossfilter();
  const isDominated = variant === "dominated";
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

  // Solo el panel "crítico" maneja el crossfilter (resalta preguntas malas).
  const crossfilterActive = variant === "critical";

  function handleItemClick(item) {
    if (crossfilterActive) toggleTopic(item.label);
    onTopicClick?.(item);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {isDominated ? "Top temas dominados" : "Top temas críticos"}
      </div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.45, fontSize: 13, padding: 6 }}>Sin temas registrados.</div>
      ) : (
        <HorizontalBarList
          items={items}
          max={100}
          onItemClick={onTopicClick || crossfilterActive ? handleItemClick : undefined}
          activeLabel={crossfilterActive ? selectedTopic : null}
          titleFormatter={(it) => `${it.label}: ${it.value}% retención · clic para ${crossfilterActive ? "resaltar sus preguntas" : "ver el tema"}`}
        />
      )}
    </div>
  );
}
```

### Step 3: MostMissedList — highlight rows matching the selected topic

In `src/components/analytics/MostMissedList.jsx`, read `selectedTopic` and dim rows whose topic ≠ selected. Add a subtle "filtrando por: X" hint. Read the current file first, then modify the row rendering. Key changes:

```jsx
import { useCrossfilter } from "../../hooks/useCrossfilter";

export default function MostMissedList({ classId, items = [], onItemClick, onGenerateReview, generating = false }) {
  const { selectedTopic } = useCrossfilter();
  const show = items.slice(0, 3);
  // … existing header …
```

Wrap each row's style with dim logic — a row whose `it.topic !== selectedTopic` (when a topic is selected) gets `opacity: 0.35`; the matching ones stay full + get a left accent:

```jsx
{show.map((it, i) => {
  const dimmed = selectedTopic != null && it.topic !== selectedTopic;
  const match = selectedTopic != null && it.topic === selectedTopic;
  return (
    <div
      key={`${it.deck_id}-${it.question_index}`}
      onClick={onItemClick ? () => onItemClick(it) : undefined}
      onKeyDown={
        onItemClick
          ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onItemClick(it); } }
          : undefined
      }
      tabIndex={onItemClick ? 0 : undefined}
      role={onItemClick ? "button" : undefined}
      style={{
        borderBottom: i < show.length - 1 ? "1px solid #f4f4f5" : "none",
        borderLeft: match ? "3px solid #2563eb" : "3px solid transparent",
        paddingLeft: 6,
        padding: "3px 0 3px 6px",
        cursor: onItemClick ? "pointer" : "default",
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        opacity: dimmed ? 0.35 : 1,
        transition: "opacity .15s ease",
      }}
    >
      {/* … existing span + bold error rate … */}
    </div>
  );
})}
```

Also add, right under the "Más falladas" title, a hint when a topic is selected:

```jsx
{selectedTopic && (
  <div style={{ fontSize: 11, color: "#2563eb", marginBottom: 4 }}>
    Resaltando: {selectedTopic}
  </div>
)}
```

(Keep the existing "Generar repaso" button + onGenerateReview wiring from F5 intact.)

### Step 4: ClassDetail — wrap content in CrossfilterProvider

In `src/pages/analytics/ClassDetail.jsx`, import the provider and wrap the dashboard body (inside StudioShell) so TopicBarListPanel + MostMissedList share the crossfilter:

```jsx
import { CrossfilterProvider } from "../../hooks/useCrossfilter";
```

Wrap the `<div style={{ padding: 18, ... }}>…</div>` (the whole dashboard body inside `<StudioShell>`) with `<CrossfilterProvider>…</CrossfilterProvider>`. The provider must be INSIDE StudioShell (so the toolbar isn't affected) but AROUND both TopicBarListPanel and MostMissedList.

Concretely, the return becomes:

```jsx
<StudioShell view="class" title="Clase" period={period} onPeriodChange={setPeriod} toolbarExtras={...}>
  <CrossfilterProvider>
    <div style={{ padding: 18, background: "#fafafa", minHeight: "100%" }}>
      {/* …everything that's already there… */}
    </div>
  </CrossfilterProvider>
</StudioShell>
```

### Step 5: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/hooks/useCrossfilter.jsx src/components/analytics/TopicBarListPanel.jsx src/components/analytics/MostMissedList.jsx src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): useCrossfilter — topic→questions highlight (F8)

useCrossfilter Context (selectedTopic + toggleTopic, no-op seguro sin
provider). ClassDetail envuelve el dashboard en CrossfilterProvider.
Click en un tema crítico (TopicBarListPanel) resalta la barra y atenúa
el resto, y resalta en MostMissedList las preguntas de ese tema
(atenúa el resto + borde azul + hint 'Resaltando: X'). Re-click
deselecciona. Spec §7.3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `StudentDrawer` — lateral quick-peek + wire en ClassDetail

**Files:**
- Create: `src/components/analytics/StudentDrawer.jsx`
- Modify: `src/components/analytics/index.ts`
- Modify: `src/pages/analytics/ClassDetail.jsx`

Click en una fila del roster abre un drawer lateral con un peek del alumno (datos ya cargados: nombre, retención, riesgo, top temas críticos) + botón "Ver perfil completo →". Esc o click en backdrop cierran.

### Step 1: Create `src/components/analytics/StudentDrawer.jsx`

```jsx
// src/components/analytics/StudentDrawer.jsx
//
// F8 Analytics Studio: quick-peek lateral de un alumno del roster, sin
// salir del Class Detail (spec §5.2 "drawer lateral"). Usa los datos que
// ClassDetail ya tiene (roster snapshot + riskInputs) — peek instantáneo,
// sin fetch. El botón "Ver perfil completo" navega al StudentProfile.
//
// Props:
//   student: row del roster snapshot ({ name, avgRetention, strongTopics,
//            weakTopics, topics: [{topic, retention_score, last_reviewed_at}] })
//            o null (drawer cerrado).
//   riskInputs: inputs para riskScore() (o null).
//   onClose: () => void
//   onOpenFull: (student) => void  — navega al perfil completo.

import { useEffect } from "react";
import { riskScore } from "../../lib/analytics/risk";
import RiskBadge from "./RiskBadge";

const retCol = (v) => (v >= 70 ? "#15803d" : v >= 40 ? "#854d0e" : "#b91c1c");

export default function StudentDrawer({ student, riskInputs = null, onClose, onOpenFull }) {
  const open = !!student;

  // Esc cierra.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const risk = riskInputs ? riskScore(riskInputs) : null;
  const weakTopics = [...(student.topics || [])]
    .filter((t) => t.retention_score != null)
    .sort((a, b) => a.retention_score - b.retention_score)
    .slice(0, 4);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.28)", zIndex: 60, animation: "fadeIn .15s ease-out" }}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-label={`Resumen de ${student.name}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 340,
          maxWidth: "90vw",
          background: "#fff",
          borderLeft: "1px solid #e4e4e7",
          boxShadow: "-8px 0 24px rgba(0,0,0,.10)",
          zIndex: 61,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          animation: "drawerIn .22s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <style>{`
          @keyframes drawerIn { from { transform: translateX(20px); opacity: .6 } to { transform: none; opacity: 1 } }
          @media (prefers-reduced-motion: reduce) { aside[role=dialog] { animation: none !important } }
        `}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, flex: 1, minWidth: 0 }}>{student.name}</div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", lineHeight: 1, color: "#71717a" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55 }}>Retención</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: retCol(student.avgRetention) }}>
              {student.avgRetention}%
            </div>
          </div>
          {risk && <RiskBadge level={risk.level} score={risk.score} />}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Temas más flojos</div>
          {weakTopics.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.55 }}>Sin datos de temas.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {weakTopics.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{t.topic}</span>
                  <b style={{ color: retCol(Number(t.retention_score)) }}>{Math.round(t.retention_score)}%</b>
                </div>
              ))}
            </div>
          )}
        </div>

        {risk && risk.reasons.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Señales de riesgo</div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, lineHeight: 1.5, color: "#52525b" }}>
              {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        <button
          onClick={() => onOpenFull?.(student)}
          style={{
            marginTop: "auto",
            padding: "9px 14px",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Ver perfil completo →
        </button>
      </aside>
    </>
  );
}
```

(Note: `fadeIn` keyframe is already defined globally in the app — used by Director/App. If lint/runtime complains it's undefined, the inline `<style>` block can add it; but it's safe to rely on the global one. To be self-contained, the drawer defines `drawerIn` itself.)

### Step 2: Barrel

Add to `src/components/analytics/index.ts`:

```ts
export { default as StudentDrawer } from "./StudentDrawer";
```

### Step 3: Wire in ClassDetail

In `src/pages/analytics/ClassDetail.jsx`:

Add import + state:
```jsx
import StudentDrawer from "../../components/analytics/StudentDrawer";
// inside the component:
const [peekStudent, setPeekStudent] = useState(null);
```

Change the RosterTable `onRowClick` from navigating to opening the drawer:
```jsx
<RosterTable
  students={students}
  riskInputsByName={riskInputsByName}
  onRowClick={(s) => setPeekStudent(s)}
/>
```

Render the drawer at the end of the dashboard body (inside CrossfilterProvider's div is fine, or just before its close — anywhere in the ClassDetail return after the grid). It navigates on "Ver perfil completo":
```jsx
<StudentDrawer
  student={peekStudent}
  riskInputs={peekStudent ? riskInputsByName[peekStudent.name] : null}
  onClose={() => setPeekStudent(null)}
  onOpenFull={(s) => navigate(buildRoute.analyticsStudent(classId, s.name))}
/>
```

(`navigate` + `buildRoute` + `classId` + `riskInputsByName` all already exist in ClassDetail.)

### Step 4: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/components/analytics/StudentDrawer.jsx src/components/analytics/index.ts src/pages/analytics/ClassDetail.jsx
git commit -m "feat(analytics): StudentDrawer — lateral quick-peek (F8)

Click en una fila del roster abre un drawer lateral con peek del alumno
(retención + RiskBadge + top temas flojos + señales de riesgo) usando
los datos que ClassDetail ya tiene (sin fetch). Esc / click en backdrop
cierran. Botón 'Ver perfil completo →' navega al StudentProfile. Spec §5.2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Final gates + Code Review + PR

### Step 1: Final gates

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: 0 lint errors, 0 typecheck, ≥99 tests (91 from F7 + ~8 table-sort), build clean.

### Step 2: Dispatch final code review subagent

Diff range `main..HEAD`. Focus:
- `table-sort.ts`: stable sort, nulls-last in both dirs, no mutation, dir=null passthrough.
- RosterTable/SessionHistoryTable: sort cycle (asc→desc→reset), aria-sort, keyboard rows don't break click, filter empty-state.
- TrendBarChart RichTooltip: delta vs prev bucket correct, compare line still labeled, no crash when payload empty.
- HorizontalBarList: keyboard + activeLabel dim/highlight, back-compat when no activeLabel.
- useCrossfilter: no-op safe without provider, toggle deselects on same topic, provider scoped inside StudioShell.
- MostMissedList: dim/highlight by topic, "Generar repaso" (F5) still wired, keyboard rows.
- StudentDrawer: Esc + backdrop close, reduced-motion, no fetch (uses passed data), "ver perfil completo" navigates.
- ClassDetail: roster click now opens drawer (not navigate); the full-profile path still reachable via drawer button; CrossfilterProvider wraps both topic panel + most-missed.

### Step 3: Push + PR

```bash
git push -u origin claude/analytics-studio-f8
gh pr create --base main --head claude/analytics-studio-f8 \
  --title "feat(analytics): Analytics Studio F8 — Interactividad viva" \
  --body "$(cat <<'EOF'
## Summary

Analytics Studio **Fase 8 — la capa de interactividad "vivo en todo"** que el spec §5.2/§7.3 prometió y que F1–F7 dejó sin construir. Cero SQL, cero deps nuevas.

- **Sort + filtro en tablas:** RosterTable (4 columnas ordenables + filtro por nombre) y SessionHistoryTable (Cuándo / % correcto). Lógica de orden en `table-sort.ts` puro (TDD).
- **Keyboard nav:** filas de tablas + barras de tema focuseables (Tab) con Enter/Space → drill.
- **Tooltips ricos:** TrendBarChart con delta vs bucket anterior; title nativo enriquecido en barras y stat cards.
- **Crossfilter (`useCrossfilter`):** click en un tema crítico resalta la barra y atenúa el resto, y resalta en "Más falladas" las preguntas de ese tema. Re-click deselecciona.
- **Drawer lateral (`StudentDrawer`):** click en una fila del roster abre un quick-peek del alumno (retención + riesgo + temas flojos) sin salir de la página; botón "Ver perfil completo →" navega.

### Out of scope (documentado)
Brush+zoom en charts, ↑↓ roving-tabindex, crossfilter más allá de ClassDetail, CountUp/motion (eso es F9 — Pulido).

## Test plan
- [x] lint + typecheck + test:run (≥99) + build limpios.
- [ ] /school/class/:id → ordenar el roster por cada columna, filtrar por nombre.
- [ ] Click en un tema crítico → se resaltan sus preguntas en "Más falladas".
- [ ] Click en una fila del roster → abre el drawer; "Ver perfil completo" navega; Esc cierra.
- [ ] Tab + Enter sobre filas y barras hace drill.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Spec Coverage Self-Review

| Spec §5.2 / §7.3 row | Task | Status en F8 |
|----------------------|------|--------------|
| Hover tooltip rico (valor + delta + contexto) | T4 | TrendBarChart full; barras/cards via title |
| Click drill-down | (ya en F1-F3) + T2/T3/T4 keyboard | mejorado |
| Crossfilter | T5 | topic→questions (ClassDetail) |
| Brush + zoom | — | OUT (deferred) |
| Drawer lateral | T6 | DONE |
| Sort/filter en tablas | T2, T3 | DONE |
| Updates suaves / CountUp | — | OUT (F9) |
| Keyboard nav | T2, T3, T4 | filas/barras focuseables + Enter; ↑↓ roving OUT |
| prefers-reduced-motion | T6 (drawer) | drawer guarded; resto ya estaba |
| `useCrossfilter` (§7.3) | T5 | DONE (Context, extensible) |

## Open notes
- **Crossfilter es topic→questions only en F8.** topic→students (atenuar el roster por retención en ese tema) necesita retención por-tema-por-alumno en el snapshot del roster — no está hoy. Documentado como follow-up.
- **Drawer usa datos del snapshot** (peek), no el `student_detail` full. Si el snapshot del roster carece de algún campo, el peek lo omite con gracia; el perfil completo (botón) trae todo.
- **↑↓ roving-tabindex** quedó fuera: F8 hace filas focuseables con Tab + Enter (accesible). Arrow-key roving es un refinamiento posterior.
