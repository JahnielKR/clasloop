# Analytics Studio — Fase 7 (Reportes + Export + Email) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El producto cerrado — saca la analítica fuera de la app. Tres entregables: (1) **Export** en cada vista (botón en la toolbar → PDF / CSV / Excel); (2) **Report builder** en `/school/reports` (composer por selección: clase + período + secciones → reporte guardado y exportable, persistido en `analytics_reports`); (3) **Email digest** semanal vía Vercel Cron → `api/analytics-digest.js` → Resend, que al fin honra los toggles de notificación de `Settings.jsx` que hoy son fake (`notifs` en local state, comentario literal "stored locally for now").

**Architecture:** **2 SQL nuevos** (`analytics_reports` tabla + `notification_settings` tabla, ambas RLS por teacher_id). Un **report model** central (`report-model.ts`) es la abstracción: `{ title, scope, sections[] }`; los 3 exporters (CSV vanilla, PDF vía jsPDF ya instalado, XLSX vía SheetJS) serializan ese model. El digest semanal corre por **Vercel Cron** (no pg_cron+pg_net — más limpio, sin extensión) pegando a `api/analytics-digest.js`, protegido con `CRON_SECRET`; el endpoint usa **service-role** (cron no tiene `auth.uid()`) + agregación pura testeable (`weekly-digest.ts`) + **Resend vía fetch directo** (sin instalar el paquete). Settings persiste los toggles en `notification_settings`.

**Tech Stack:** React 18, `@tanstack/react-query` v5, vitest, jsPDF (instalado), **SheetJS `xlsx` (NUEVA dep)**, Vercel Functions + Vercel Cron, Resend (HTTP API, sin SDK), Postgres RLS.

**Source spec:** `docs/superpowers/specs/2026-05-28-analytics-studio-design.md` §8.3 (Reportes + Export + Email), §6.6 (Email digest), §6.7 (Export), §9 (F7 row), §10 (decisiones diferidas — resueltas acá).

**Branch:** `claude/analytics-studio-f7` — **FRESH off main** (`3a587d8`, post F6).

**Depends on:** F0 (`StudioShell` toolbar slot, `useAnalyticsOverview`, `class_analytics`), F1-F3 (vistas a exportar), F5 (`cleo-analytics.ts` model shapes), F6 (`pulse-of-today.ts` aggregation pattern reusado por `weekly-digest.ts`).

---

## Decisiones diferidas del spec §10 — RESUELTAS

| Cuestión | Decisión F7 | Razón |
|----------|-------------|-------|
| Excel lib: `xlsx` vs `exceljs` | **`xlsx` (SheetJS)** | Más liviano, API simple (`utils.json_to_sheet` + `writeFile`), tree-shakeable. ExcelJS pesa más y aporta formato que no necesitamos. |
| Excel render: client vs server | **Client** | Volúmenes de un docente son chicos; evita un endpoint extra. |
| Resend: cuenta + key | **Usuario provisiona** (ver Task 9 + sección final) | `RESEND_API_KEY` en Vercel. Sin SDK — fetch directo. |
| Modelo de `analytics_reports` | **jsonb `model`** = `{ scope, period, sections[] }` | Un drag-drop builder futuro reusa el mismo jsonb sin migración. |
| Frecuencia de digest | **Semanal, lunes 8am UTC** (Vercel Cron `0 8 * * 1`) | Ajustable en vercel.json. |
| pg_cron vs Vercel Cron | **Vercel Cron** | No requiere `pg_net`; el endpoint ya vive en Vercel. Protegido con `CRON_SECRET`. |

---

## Pre-task: File Structure

**Create (16 files):**

```
src/lib/analytics/
  report-model.ts                                # NEW: report model builders (class/student → sections[])
  __tests__/report-model.test.ts                 # NEW
  export-csv.ts                                  # NEW: pure model → CSV string
  __tests__/export-csv.test.ts                   # NEW
  export-xlsx.ts                                 # NEW: model → SheetJS workbook (thin, SheetJS does the work)
  export-pdf.ts                                  # NEW: model → jsPDF doc (thin)
  weekly-digest.ts                               # NEW: pure weekly aggregation for the email
  __tests__/weekly-digest.test.ts                # NEW

src/hooks/
  useReports.js                                  # NEW: CRUD over analytics_reports (RQ)

src/components/analytics/
  ExportMenu.jsx                                 # NEW: dropdown PDF/CSV/Excel button for the toolbar
  ReportComposer.jsx                             # NEW: the builder form (class + period + section checkboxes)
  ReportList.jsx                                 # NEW: saved reports list w/ export + delete

src/pages/analytics/
  Reports.jsx                                    # NEW: /school/reports page

api/
  analytics-digest.js                            # NEW: Vercel Cron → Resend weekly digest endpoint

supabase/migrations/
  20240101000072_analytics_reports.sql           # NEW: report storage table + RLS
  20240101000073_notification_settings.sql       # NEW: notif prefs table + RLS + RPC
```

**Modify (8 files):**

```
package.json / package-lock.json                # +xlsx dependency
src/lib/analytics/index.ts                      # +export report-model, export-csv, weekly-digest
src/components/analytics/index.ts               # +export ExportMenu, ReportComposer, ReportList
src/components/analytics/StudioShell.jsx        # reports nav item enabled when view==="reports"
src/pages/analytics/ClassDetail.jsx             # +ExportMenu in toolbarExtras
src/pages/Director.jsx                          # +ExportMenu in StudioShell toolbar (overview export)
src/routes.ts                                   # +ANALYTICS_REPORTS route + pattern + pathToPage + guard + buildRoute
src/App.jsx                                     # +lazy Reports + COMPONENTS entry
src/pages/Settings.jsx                          # persist notif toggles → notification_settings
vercel.json                                     # +crons array
```

**Out of scope for F7 (explicit):**
- **Full drag-drop canvas builder** — F7 ships a "composer" (select scope + period + sections). The `analytics_reports.model` jsonb is forward-compatible with a richer editor later (no migration needed).
- **Scheduled report delivery (send a saved report by email on a schedule)** — F7 only has the fixed weekly *digest*; emailing a *saved report* on a cadence is a later iteration.
- **PDF charts (rasterized recharts)** — F7 PDF is text + tables (clean, fast, no html2canvas blur). Chart images are polish.
- **Push notifications** — the `push` toggle persists but no push infra is wired (out of scope; the toggle is honored as a stored preference only).
- **Per-student digest / family digest** — teacher-only weekly digest.
- **i18n of the email body** — F7 digest is Spanish-only (matching the analytics views). Multi-lang email is a follow-up.

---

## Task 1: Install SheetJS + TDD `export-csv.ts` + `report-model.ts`

**Files:**
- Modify: `package.json` (add `xlsx`)
- Create: `src/lib/analytics/report-model.ts`, `__tests__/report-model.test.ts`
- Create: `src/lib/analytics/export-csv.ts`, `__tests__/export-csv.test.ts`

### Step 1: Install SheetJS

```bash
npm install xlsx
```

Verify it lands in `package.json` dependencies. (SheetJS publishes to npm as `xlsx`.)

### Step 2: Write `report-model.ts` tests

`report-model.ts` builds a normalized report `model` from already-fetched analytics data. A model is `{ title, scope, period, sections }` where each section is `{ type, title, rows }` and `rows` is a flat array of `{ label, value }` or a tabular `{ columns, data }`. The CSV/PDF/XLSX exporters consume this uniform shape.

Create `src/lib/analytics/__tests__/report-model.test.ts`:

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { buildClassReportModel, SECTION_TYPES } from "../report-model";

describe("buildClassReportModel", () => {
  const classAnalytics = {
    kpis: { pct_correct: 72, unique_participants: 20, responses_total: 300, avg_time_ms: 9000 },
    topic_mastery: [
      { topic: "Fracciones", retention_score: 30 },
      { topic: "Suma", retention_score: 85 },
    ],
    most_missed: [
      { question_index: 2, topic: "Fracciones", error_rate: 70 },
    ],
  };

  it("builds a model with the requested sections only", () => {
    const model = buildClassReportModel({
      className: "5to A",
      period: "30 días",
      classAnalytics,
      sections: ["kpis", "topics"],
    });
    expect(model.scope).toBe("class");
    expect(model.title).toContain("5to A");
    const types = model.sections.map((s) => s.type);
    expect(types).toContain("kpis");
    expect(types).toContain("topics");
    expect(types).not.toContain("most_missed");
  });

  it("kpis section flattens kpi object to label/value rows", () => {
    const model = buildClassReportModel({
      className: "x",
      period: "7 días",
      classAnalytics,
      sections: ["kpis"],
    });
    const kpiSection = model.sections.find((s) => s.type === "kpis");
    expect(kpiSection.rows.find((r) => r.label === "% correcto").value).toBe(72);
  });

  it("topics section is tabular (columns + data)", () => {
    const model = buildClassReportModel({
      className: "x",
      period: "7 días",
      classAnalytics,
      sections: ["topics"],
    });
    const topics = model.sections.find((s) => s.type === "topics");
    expect(topics.columns).toEqual(["Tema", "Retención"]);
    expect(topics.data).toEqual([
      ["Fracciones", 30],
      ["Suma", 85],
    ]);
  });

  it("tolerates empty analytics", () => {
    const model = buildClassReportModel({
      className: "x",
      period: "7 días",
      classAnalytics: {},
      sections: ["kpis", "topics", "most_missed"],
    });
    expect(model.sections.length).toBe(3);
  });

  it("exposes the catalog of section types", () => {
    expect(SECTION_TYPES.map((s) => s.id)).toEqual(
      expect.arrayContaining(["kpis", "topics", "most_missed"]),
    );
  });
});
```

### Step 3: Implement `report-model.ts`

```ts
// ─── src/lib/analytics/report-model.ts ─────────────────────────────────
// Modelo normalizado de reporte. Una sola forma uniforme que los 3
// exporters (CSV / PDF / XLSX) consumen. Sin React, sin Supabase.
//
// Un model = { title, scope, period, sections }.
// Cada section es:
//   - tipo "list": { type, title, rows: [{label, value}] }
//   - tipo "table": { type, title, columns: string[], data: any[][] }

export interface ReportSection {
  type: string;
  title: string;
  rows?: { label: string; value: any }[];
  columns?: string[];
  data?: any[][];
}

export interface ReportModel {
  title: string;
  scope: "class" | "student" | "overview";
  period: string;
  sections: ReportSection[];
}

/** Catálogo de secciones que el composer ofrece como checkboxes. */
export const SECTION_TYPES = [
  { id: "kpis", label: "Indicadores clave" },
  { id: "topics", label: "Dominio por tema" },
  { id: "most_missed", label: "Preguntas más falladas" },
];

const KPI_LABELS: Record<string, string> = {
  pct_correct: "% correcto",
  unique_participants: "Participantes",
  responses_total: "Respuestas",
  avg_time_ms: "Tiempo medio (ms)",
};

function kpiSection(kpis: any): ReportSection {
  const k = kpis || {};
  const rows = Object.keys(KPI_LABELS)
    .filter((key) => k[key] != null)
    .map((key) => ({ label: KPI_LABELS[key], value: k[key] }));
  return { type: "kpis", title: "Indicadores clave", rows };
}

function topicsSection(topicMastery: any[]): ReportSection {
  const data = (topicMastery || [])
    .filter((t) => t.retention_score != null)
    .map((t) => [t.topic, Number(t.retention_score)]);
  return { type: "topics", title: "Dominio por tema", columns: ["Tema", "Retención"], data };
}

function mostMissedSection(missed: any[]): ReportSection {
  const data = (missed || []).map((m) => [
    `P. ${Number(m.question_index) + 1}`,
    m.topic || "",
    `${Math.round(Number(m.error_rate))}%`,
  ]);
  return {
    type: "most_missed",
    title: "Preguntas más falladas",
    columns: ["Pregunta", "Tema", "Error"],
    data,
  };
}

export function buildClassReportModel(args: {
  className: string;
  period: string;
  classAnalytics: any;
  sections: string[];
}): ReportModel {
  const ca = args.classAnalytics || {};
  const builders: Record<string, () => ReportSection> = {
    kpis: () => kpiSection(ca.kpis),
    topics: () => topicsSection(ca.topic_mastery),
    most_missed: () => mostMissedSection(ca.most_missed),
  };
  const sections = (args.sections || [])
    .filter((id) => builders[id])
    .map((id) => builders[id]());
  return {
    title: `Reporte — ${args.className || "Clase"} (${args.period})`,
    scope: "class",
    period: args.period,
    sections,
  };
}
```

### Step 4: Write `export-csv.ts` tests

Create `src/lib/analytics/__tests__/export-csv.test.ts`:

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { modelToCsv, escapeCsvCell } from "../export-csv";

describe("escapeCsvCell", () => {
  it("quotes cells with commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });
  it("quotes + doubles internal quotes", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("quotes cells with newlines", () => {
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("leaves plain cells unquoted", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
  });
  it("stringifies numbers and null", () => {
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("modelToCsv", () => {
  it("emits a title line, then each section with its rows/tables", () => {
    const model = {
      title: "Reporte — 5to A (30 días)",
      scope: "class" as const,
      period: "30 días",
      sections: [
        {
          type: "kpis",
          title: "Indicadores clave",
          rows: [
            { label: "% correcto", value: 72 },
            { label: "Participantes", value: 20 },
          ],
        },
        {
          type: "topics",
          title: "Dominio por tema",
          columns: ["Tema", "Retención"],
          data: [["Fracciones", 30], ["Suma", 85]],
        },
      ],
    };
    const csv = modelToCsv(model);
    expect(csv).toContain("Reporte — 5to A (30 días)");
    expect(csv).toContain("Indicadores clave");
    expect(csv).toContain("% correcto,72");
    expect(csv).toContain("Tema,Retención");
    expect(csv).toContain("Fracciones,30");
  });
  it("returns at least the title for an empty model", () => {
    const csv = modelToCsv({ title: "Vacío", scope: "class", period: "x", sections: [] });
    expect(csv).toContain("Vacío");
  });
});
```

### Step 5: Implement `export-csv.ts`

```ts
// ─── src/lib/analytics/export-csv.ts ───────────────────────────────────
// Serializa un ReportModel a CSV vanilla (sin dep). RFC-4180-ish:
// comillas dobles para celdas con coma/comilla/newline; comilla interna
// se duplica. Sin React, sin Supabase.

import type { ReportModel } from "./report-model";

export function escapeCsvCell(value: any): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: any[]): string {
  return cells.map(escapeCsvCell).join(",");
}

export function modelToCsv(model: ReportModel): string {
  const lines: string[] = [];
  lines.push(row([model.title]));
  lines.push("");
  for (const section of model.sections || []) {
    lines.push(row([section.title]));
    if (section.rows) {
      for (const r of section.rows) lines.push(row([r.label, r.value]));
    }
    if (section.columns && section.data) {
      lines.push(row(section.columns));
      for (const d of section.data) lines.push(row(d));
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Browser-side helper: triggers a download of the CSV. */
export function downloadCsv(model: ReportModel, filename = "reporte.csv"): void {
  if (typeof document === "undefined") return;
  const csv = modelToCsv(model);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Step 6: Run tests; barrel; commit

```bash
npm run test:run -- src/lib/analytics
```

Expected: previous (~74 from F6) + ~5 report-model + ~7 export-csv = ≥86 passing.

Add to `src/lib/analytics/index.ts`:

```ts
export * from "./report-model";
export * from "./export-csv";
```

```bash
git add package.json package-lock.json src/lib/analytics/report-model.ts \
        src/lib/analytics/export-csv.ts src/lib/analytics/__tests__/report-model.test.ts \
        src/lib/analytics/__tests__/export-csv.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): report-model + CSV export + SheetJS dep (F7)

report-model.ts: forma uniforme {title, scope, period, sections[]} que
los 3 exporters consumen. buildClassReportModel + SECTION_TYPES catalog.
export-csv.ts: modelToCsv vanilla RFC-4180-ish + downloadCsv browser
helper. Instala xlsx (SheetJS) para el exporter Excel (Task 2). ~12 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `export-xlsx.ts` + `export-pdf.ts` + `ExportMenu` component

**Files:**
- Create: `src/lib/analytics/export-xlsx.ts`, `src/lib/analytics/export-pdf.ts`
- Create: `src/components/analytics/ExportMenu.jsx`
- Modify: `src/components/analytics/index.ts`

These are thin glue over SheetJS / jsPDF — no unit tests (they produce binary blobs; verified by the reviewer reading the code + a manual smoke). The pure model lives in `report-model.ts` (already tested).

### Step 1: Implement `export-xlsx.ts`

```ts
// ─── src/lib/analytics/export-xlsx.ts ──────────────────────────────────
// Serializa un ReportModel a un workbook SheetJS — una hoja por sección.
// Dynamic import de xlsx para no inflar el bundle inicial (se carga solo
// cuando el docente exporta). Sin tests unitarios (genera binario; el
// model que consume ya está testeado en report-model).

import type { ReportModel } from "./report-model";

export async function downloadXlsx(model: ReportModel, filename = "reporte.xlsx"): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const section of model.sections || []) {
    let aoa: any[][] = [];
    if (section.rows) {
      aoa = [["Indicador", "Valor"], ...section.rows.map((r) => [r.label, r.value])];
    } else if (section.columns && section.data) {
      aoa = [section.columns, ...section.data];
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [["(sin datos)"]]);
    // Sheet names: max 31 chars, no special chars.
    const name = (section.title || "Hoja").slice(0, 28).replace(/[:\\/?*[\]]/g, "");
    XLSX.utils.book_append_sheet(wb, ws, name || "Hoja");
  }
  if (!model.sections?.length) {
    const ws = XLSX.utils.aoa_to_sheet([[model.title]]);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  }
  XLSX.writeFile(wb, filename);
}
```

### Step 2: Implement `export-pdf.ts`

```ts
// ─── src/lib/analytics/export-pdf.ts ───────────────────────────────────
// Serializa un ReportModel a un PDF con jsPDF (ya instalado). Texto +
// tablas simples (sin html2canvas → nítido y rápido). Dynamic import.
// Sin tests unitarios (binario; el model ya está testeado).

import type { ReportModel } from "./report-model";

export async function downloadPdf(model: ReportModel, filename = "reporte.pdf"): Promise<void> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  ensureSpace(24);
  doc.text(model.title, margin, y);
  y += 26;

  doc.setFontSize(11);
  for (const section of model.sections || []) {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    if (section.rows) {
      for (const r of section.rows) {
        ensureSpace(16);
        doc.text(`${r.label}: ${r.value ?? ""}`, margin + 8, y);
        y += 16;
      }
    }
    if (section.columns && section.data) {
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.text(section.columns.join("    "), margin + 8, y);
      y += 15;
      doc.setFont("helvetica", "normal");
      for (const d of section.data) {
        ensureSpace(15);
        doc.text(d.map((c) => String(c ?? "")).join("    "), margin + 8, y);
        y += 14;
      }
    }
    y += 12;
  }

  doc.save(filename);
}
```

### Step 3: Implement `ExportMenu.jsx`

```jsx
// src/components/analytics/ExportMenu.jsx
//
// F7 Analytics Studio: botón "Exportar" en la toolbar (StudioShell
// toolbarExtras slot). Dropdown con PDF / CSV / Excel. Recibe una función
// `buildModel` que el padre provee (arma el ReportModel de los datos
// cargados de esa vista). Los exporters hacen dynamic import de jspdf/xlsx.

import { useState } from "react";
import { downloadCsv } from "../../lib/analytics/export-csv";
import { downloadPdf } from "../../lib/analytics/export-pdf";
import { downloadXlsx } from "../../lib/analytics/export-xlsx";

export default function ExportMenu({ buildModel, baseName = "reporte", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(kind) {
    if (busy) return;
    setOpen(false);
    const model = buildModel?.();
    if (!model) return;
    setBusy(true);
    try {
      if (kind === "csv") downloadCsv(model, `${baseName}.csv`);
      else if (kind === "pdf") await downloadPdf(model, `${baseName}.pdf`);
      else if (kind === "xlsx") await downloadXlsx(model, `${baseName}.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          padding: "4px 11px",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          background: "#fff",
          border: "1px solid #e4e4e7",
          cursor: disabled || busy ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {busy ? "Exportando…" : "Exportar ▾"}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: 8,
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
            zIndex: 30,
            minWidth: 120,
            overflow: "hidden",
          }}
        >
          {[
            ["pdf", "PDF"],
            ["csv", "CSV"],
            ["xlsx", "Excel"],
          ].map(([kind, label]) => (
            <button
              key={kind}
              role="menuitem"
              onClick={() => run(kind)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 13,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f4f5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Step 4: Barrel + gates + commit

Add to `src/components/analytics/index.ts`:

```ts
export { default as ExportMenu } from "./ExportMenu";
```

(`export-xlsx`/`export-pdf` are NOT added to the lib barrel — they're imported directly by ExportMenu to keep the dynamic-import boundary clean.)

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/lib/analytics/export-xlsx.ts src/lib/analytics/export-pdf.ts \
        src/components/analytics/ExportMenu.jsx src/components/analytics/index.ts
git commit -m "feat(analytics): XLSX + PDF exporters + ExportMenu (F7)

export-xlsx.ts (SheetJS, dynamic import, una hoja por sección) +
export-pdf.ts (jsPDF, texto+tablas, dynamic import). ExportMenu dropdown
PDF/CSV/Excel para el toolbar slot de StudioShell; recibe buildModel del
padre. Dynamic imports mantienen jspdf/xlsx fuera del bundle inicial.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire `ExportMenu` en ClassDetail + Director

**Files:**
- Modify: `src/pages/analytics/ClassDetail.jsx`
- Modify: `src/pages/Director.jsx`

### Step 1: ClassDetail — add ExportMenu to toolbarExtras

In `src/pages/analytics/ClassDetail.jsx`:

Add imports:
```jsx
import { ExportMenu } from "../../components/analytics";
import { buildClassReportModel } from "../../lib/analytics/report-model";
```

Find the existing `toolbarExtras={<CompareToggle ... />}` on the `<StudioShell>`. Change it to render both CompareToggle AND ExportMenu:

```jsx
toolbarExtras={
  <>
    <CompareToggle value={compareMode} onChange={setCompareMode} />
    <ExportMenu
      baseName={`reporte-clase`}
      disabled={!a}
      buildModel={() =>
        buildClassReportModel({
          className:
            overviewRows.find((r) => r.class_id === classId)?.class_name || "Clase",
          period,
          classAnalytics: a,
          sections: ["kpis", "topics", "most_missed"],
        })
      }
    />
  </>
}
```

(`a` is the `analyticsQ.data`, `overviewRows` and `period` already exist in the component from F4/F5.)

### Step 2: Director — add ExportMenu to the overview StudioShell toolbar

The Director (`src/pages/Director.jsx`) renders `<StudioShell view="overview" title="Analytics">` without `toolbarExtras`. Add an ExportMenu that exports a cross-class overview.

For the overview, build a simple model from the aggregate stats already computed (`avgRetention`, `classes.length`, `totalStudents`, `totalSessions`). Add a small inline model builder (overview isn't a class, so reuse `report-model`'s shape directly — add an `buildOverviewReportModel` to report-model.ts):

First, extend `src/lib/analytics/report-model.ts` with:

```ts
export function buildOverviewReportModel(args: {
  period: string;
  stats: { avgRetention: number; classes: number; students: number; sessions: number };
  perClass?: { name: string; retention: number }[];
}): ReportModel {
  const s = args.stats;
  const sections: ReportSection[] = [
    {
      type: "kpis",
      title: "Resumen general",
      rows: [
        { label: "Retención promedio", value: `${s.avgRetention}%` },
        { label: "Clases activas", value: s.classes },
        { label: "Estudiantes", value: s.students },
        { label: "Sesiones", value: s.sessions },
      ],
    },
  ];
  if (args.perClass?.length) {
    sections.push({
      type: "topics",
      title: "Retención por clase",
      columns: ["Clase", "Retención"],
      data: args.perClass.map((c) => [c.name, c.retention]),
    });
  }
  return {
    title: `Reporte general (${args.period})`,
    scope: "overview",
    period: args.period,
    sections,
  };
}
```

Then in `Director.jsx`:

```jsx
import { StudioShell, PulseStrip, ExportMenu } from "../components/analytics";
import { buildOverviewReportModel } from "../lib/analytics/report-model";
```

Add `toolbarExtras` to the MAIN (non-loading) `<StudioShell view="overview" title="Analytics">`:

```jsx
<StudioShell
  view="overview"
  title="Analytics"
  toolbarExtras={
    <ExportMenu
      baseName="reporte-general"
      disabled={classes.length === 0}
      buildModel={() =>
        buildOverviewReportModel({
          period: "actual",
          stats: { avgRetention, classes: classes.length, students: totalStudents, sessions: totalSessions },
          perClass: classes.map((c) => ({
            name: c.name,
            retention: retentionData[c.id]?.average ?? 0,
          })),
        })
      }
    />
  }
>
```

(`avgRetention`, `totalStudents`, `totalSessions`, `classes`, `retentionData` all already exist in Director.jsx — see lines 136-139.)

### Step 3: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/pages/analytics/ClassDetail.jsx src/pages/Director.jsx src/lib/analytics/report-model.ts
git commit -m "feat(analytics): ExportMenu en ClassDetail + Director overview (F7)

ClassDetail toolbar suma ExportMenu (PDF/CSV/Excel del reporte de clase
con kpis+topics+most_missed). Director overview suma ExportMenu con
buildOverviewReportModel (resumen general + retención por clase). El
botón se deshabilita cuando no hay datos.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: SQL migration 072 — `analytics_reports` table

**Files:**
- Create: `supabase/migrations/20240101000072_analytics_reports.sql`

Almacena los reportes guardados del docente. RLS por teacher_id (a diferencia de las RPCs SECURITY DEFINER, esta tabla se lee/escribe directo con RLS).

### Step 1: Write the migration

```sql
-- ─── Analytics Studio F7 · analytics_reports table ─────────────────────
-- Reportes guardados del docente (composer de /school/reports). El "model"
-- jsonb guarda {scope, period, sections[]} — forward-compatible con un
-- drag-drop builder futuro sin migración. RLS estándar por teacher_id
-- (no SECURITY DEFINER: es CRUD directo del dueño).

CREATE TABLE IF NOT EXISTS "public"."analytics_reports" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'class',
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  period text,
  model jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."analytics_reports" ENABLE ROW LEVEL SECURITY;

-- El docente sólo ve / maneja sus propios reportes.
CREATE POLICY "analytics_reports_select_own"
  ON "public"."analytics_reports" FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "analytics_reports_insert_own"
  ON "public"."analytics_reports" FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "analytics_reports_update_own"
  ON "public"."analytics_reports" FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "analytics_reports_delete_own"
  ON "public"."analytics_reports" FOR DELETE
  USING (teacher_id = auth.uid());

CREATE INDEX IF NOT EXISTS analytics_reports_teacher_idx
  ON "public"."analytics_reports" (teacher_id, created_at DESC);

COMMENT ON TABLE "public"."analytics_reports" IS
  'Analytics Studio F7: reportes guardados del docente. model jsonb = {scope, period, sections[]}. RLS por teacher_id.';
```

### Step 2: DO NOT execute locally — user applies in Supabase SQL editor. Commit.

```bash
git add supabase/migrations/20240101000072_analytics_reports.sql
git commit -m "feat(analytics): SQL analytics_reports table (F7)

Migration 072. Tabla de reportes guardados con RLS por teacher_id (CRUD
directo del dueño, no SECURITY DEFINER). model jsonb forward-compatible
con un drag-drop builder futuro. Index (teacher_id, created_at desc).

User aplica con Supabase SQL editor antes de mergear (mismo flow que
064-071).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `useReports` hook + `ReportComposer` + `ReportList` + `Reports` page

**Files:**
- Create: `src/hooks/useReports.js`
- Create: `src/components/analytics/ReportComposer.jsx`
- Create: `src/components/analytics/ReportList.jsx`
- Create: `src/pages/analytics/Reports.jsx`
- Modify: `src/components/analytics/index.ts`

### Step 1: `useReports.js`

```js
// src/hooks/useReports.js
//
// F7 Analytics Studio: CRUD sobre analytics_reports (tabla con RLS por
// teacher_id). React Query: lista + create + delete con invalidación.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const reportsKey = ["analytics", "reports"];

async function fetchReports() {
  const { data, error } = await supabase
    .from("analytics_reports")
    .select("id, name, scope, class_id, period, model, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export function useReports() {
  return useQuery({ queryKey: reportsKey, queryFn: fetchReports });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not_authenticated");
      const { data, error } = await supabase
        .from("analytics_reports")
        .insert({
          teacher_id: user.id,
          name: report.name,
          scope: report.scope || "class",
          class_id: report.class_id || null,
          period: report.period || null,
          model: report.model || {},
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reportsKey }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("analytics_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reportsKey }),
  });
}
```

### Step 2: `ReportComposer.jsx`

```jsx
// src/components/analytics/ReportComposer.jsx
//
// F7 Analytics Studio: el "composer" de reportes. NO es un drag-drop canvas
// (ver plan §out-of-scope) — es selección: clase + período + qué secciones
// incluir + nombre. Al guardar, persiste el model en analytics_reports.

import { useState } from "react";
import { SECTION_TYPES } from "../../lib/analytics/report-model";

const PERIODS = [
  { id: "d7", label: "7 días" },
  { id: "d30", label: "30 días" },
  { id: "d90", label: "90 días" },
];

export default function ReportComposer({ classes = [], onSave, saving = false }) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(classes[0]?.class_id || "");
  const [period, setPeriod] = useState("d30");
  const [sections, setSections] = useState(SECTION_TYPES.map((s) => s.id));

  function toggleSection(id) {
    setSections((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSave() {
    if (!name.trim() || !classId || sections.length === 0) return;
    onSave?.({ name: name.trim(), classId, period, sections });
  }

  const valid = name.trim() && classId && sections.length > 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Nuevo reporte</div>

      <label style={labelStyle}>Nombre</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Reporte mensual 5to A"
        style={inputStyle}
      />

      <label style={labelStyle}>Clase</label>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} style={inputStyle}>
        {classes.map((c) => (
          <option key={c.class_id} value={c.class_id}>{c.class_name || c.class_id}</option>
        ))}
      </select>

      <label style={labelStyle}>Período</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              padding: "4px 11px",
              borderRadius: 6,
              fontSize: 13,
              border: "1px solid #e4e4e7",
              background: period === p.id ? "#2563eb" : "#fff",
              color: period === p.id ? "#fff" : "inherit",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label style={labelStyle}>Secciones</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {SECTION_TYPES.map((s) => (
          <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={sections.includes(s.id)} onChange={() => toggleSection(s.id)} />
            {s.label}
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!valid || saving}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: valid ? "#2563eb" : "#e4e4e7",
          color: valid ? "#fff" : "#a1a1aa",
          fontSize: 14,
          fontWeight: 600,
          cursor: valid && !saving ? "pointer" : "not-allowed",
        }}
      >
        {saving ? "Guardando…" : "Guardar reporte"}
      </button>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 4, marginTop: 8 };
const inputStyle = { width: "100%", padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #e4e4e7", marginBottom: 8, boxSizing: "border-box" };
```

### Step 3: `ReportList.jsx`

```jsx
// src/components/analytics/ReportList.jsx
//
// F7 Analytics Studio: lista de reportes guardados con export (PDF/CSV/Excel)
// + delete. El export re-fetcha los datos frescos de class_analytics y arma
// el model con las secciones guardadas (el model guardado es la receta;
// los datos se traen al vuelo para que el reporte siempre sea actual).

import ExportMenu from "./ExportMenu";

export default function ReportList({ reports = [], onExportModel, onDelete, deletingId = null }) {
  if (reports.length === 0) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: 16, opacity: 0.6, fontSize: 13 }}>
        Todavía no guardaste ningún reporte. Creá uno con el formulario.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {reports.map((r) => (
        <div
          key={r.id}
          style={{
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#71717a" }}>
              {(r.model?.sections?.length ?? 0)} secciones · {r.period || "—"}
            </div>
          </div>
          <ExportMenu
            baseName={r.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "reporte"}
            buildModel={() => onExportModel?.(r)}
          />
          <button
            onClick={() => onDelete?.(r.id)}
            disabled={deletingId === r.id}
            title="Eliminar"
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              cursor: deletingId === r.id ? "wait" : "pointer",
            }}
          >
            {deletingId === r.id ? "…" : "Eliminar"}
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Step 4: `Reports.jsx` page

```jsx
// src/pages/analytics/Reports.jsx
//
// F7 Analytics Studio: vista /school/reports. Composer (crear reporte) +
// lista de reportes guardados (exportar / eliminar). El export re-fetcha
// class_analytics fresco y arma el model con las secciones guardadas.

import { useState } from "react";
import { StudioShell } from "../../components/analytics";
import ReportComposer from "../../components/analytics/ReportComposer";
import ReportList from "../../components/analytics/ReportList";
import { useAnalyticsOverview } from "../../hooks/useAnalyticsOverview";
import { useReports, useCreateReport, useDeleteReport } from "../../hooks/useReports";
import { buildClassReportModel } from "../../lib/analytics/report-model";
import { supabase } from "../../lib/supabase";

const PERIOD_LABEL = { d7: "7 días", d30: "30 días", d90: "90 días" };

function periodToRange(period) {
  const now = new Date();
  const ms = (d) => d * 24 * 60 * 60 * 1000;
  const days = period === "d7" ? 7 : period === "d90" ? 90 : 30;
  return { from: new Date(now.getTime() - ms(days)).toISOString(), to: now.toISOString() };
}

export default function Reports() {
  const overviewQ = useAnalyticsOverview();
  const classes = overviewQ.data ?? [];
  const reportsQ = useReports();
  const createM = useCreateReport();
  const deleteM = useDeleteReport();
  const [deletingId, setDeletingId] = useState(null);

  function handleSave({ name, classId, period, sections }) {
    const cls = classes.find((c) => c.class_id === classId);
    createM.mutate({
      name,
      scope: "class",
      class_id: classId,
      period: PERIOD_LABEL[period] || period,
      model: {
        scope: "class",
        period: PERIOD_LABEL[period] || period,
        periodId: period,
        className: cls?.class_name || "",
        sections,
      },
    });
  }

  // Re-fetch fresh class_analytics + build the model from the saved recipe.
  async function buildModelForReport(report) {
    const m = report.model || {};
    const { from, to } = periodToRange(m.periodId || "d30");
    const { data } = await supabase.rpc("class_analytics", {
      p_class_id: report.class_id,
      p_from: from,
      p_to: to,
    });
    return buildClassReportModel({
      className: m.className || "Clase",
      period: m.period || report.period || "30 días",
      classAnalytics: data || {},
      sections: m.sections || ["kpis", "topics", "most_missed"],
    });
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteM.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <StudioShell view="reports" title="Reportes">
      <div style={{ padding: 18, background: "#fafafa", minHeight: "100%", display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        <ReportComposer classes={classes} onSave={handleSave} saving={createM.isPending} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Reportes guardados</div>
          {reportsQ.isPending ? (
            <div style={{ opacity: 0.55, fontSize: 13 }}>Cargando reportes…</div>
          ) : (
            <ReportList
              reports={reportsQ.data ?? []}
              onExportModel={buildModelForReport}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          )}
        </div>
      </div>
    </StudioShell>
  );
}
```

**IMPORTANT — async buildModel:** `ExportMenu.run()` calls `buildModel()` and currently expects a synchronous return. `buildModelForReport` is async (it re-fetches). Update `ExportMenu` to `await` the model:

In `src/components/analytics/ExportMenu.jsx`, change:
```jsx
const model = buildModel?.();
```
to:
```jsx
const model = await buildModel?.();
```
(`run` is already `async`, so awaiting a non-promise value is harmless for the synchronous ClassDetail/Director callers.)

### Step 5: Barrel + gates + commit

Add to `src/components/analytics/index.ts`:

```ts
export { default as ReportComposer } from "./ReportComposer";
export { default as ReportList } from "./ReportList";
```

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/hooks/useReports.js src/components/analytics/ReportComposer.jsx \
        src/components/analytics/ReportList.jsx src/pages/analytics/Reports.jsx \
        src/components/analytics/ExportMenu.jsx src/components/analytics/index.ts
git commit -m "feat(analytics): Reports page /school/reports — composer + list (F7)

useReports (CRUD sobre analytics_reports). ReportComposer (selección:
clase + período + secciones + nombre). ReportList (export PDF/CSV/Excel
+ delete). Reports page los compone. El export re-fetcha class_analytics
fresco y arma el model con las secciones guardadas (la receta se guarda;
los datos se traen al vuelo para que el reporte siempre sea actual).
ExportMenu ahora await-ea buildModel (soporta el caller async).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Route wiring `/school/reports`

**Files:**
- Modify: `src/routes.ts`, `src/App.jsx`, `src/components/analytics/StudioShell.jsx`

### Step 1: `src/routes.ts`

**A.** In `ROUTES` add `ANALYTICS_REPORTS: "/school/reports",`.
**B.** In `ROUTE_PATTERNS` add `ANALYTICS_REPORTS: "/school/reports",`.
**C.** In `buildRoute` add `analyticsReports: () => "/school/reports",`.
**D.** In `pathToPage`, BEFORE `if (pathname === "/school")`, add:
```ts
if (pathname === "/school/reports") return "analyticsReports";
```
**E.** In `TEACHER_ONLY_PAGES` add `"analyticsReports",`.

### Step 2: `src/App.jsx`

```jsx
const importReportsPage = () => import('./pages/analytics/Reports');
const ReportsPage = lazy(importReportsPage);
```

In `COMPONENTS` add `analyticsReports: ReportsPage,`.
In `COMPACT_PAGES` add `"analyticsReports"`.

### Step 3: `StudioShell.jsx` — enable the "reports" nav item

In `src/components/analytics/StudioShell.jsx`, the `items` map computes `enabled`. Add the `reports` view to the enabled-when-active list:

```jsx
enabled:
  item.staticEnabled ||
  (item.id === "class" && view === "class") ||
  (item.id === "student" && view === "student") ||
  (item.id === "topics" && view === "topics") ||
  (item.id === "reports" && view === "reports") ||
  (item.id === "live" && view === "live") ||
  (item.id === "ask" && view === "ask"),
```

(Also adds `live` and `ask` which F5/F6 should have enabled — defensive; if already present, keep idempotent. Verify the current state and only add what's missing.)

### Step 4: Gates + commit

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
git add src/routes.ts src/App.jsx src/components/analytics/StudioShell.jsx
git commit -m "feat(analytics): route /school/reports → Reports page (F7)

ROUTES.ANALYTICS_REPORTS + pattern + pathToPage + guard + buildRoute.
App.jsx lazy + COMPONENTS + COMPACT_PAGES. StudioShell habilita el nav
item 'Reportes' cuando view==='reports' (+ live/ask defensivo).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: SQL migration 073 — `notification_settings` + Settings persistence

**Files:**
- Create: `supabase/migrations/20240101000073_notification_settings.sql`
- Modify: `src/pages/Settings.jsx`

### Step 1: Write migration 073

```sql
-- ─── Analytics Studio F7 · notification_settings table ─────────────────
-- Persiste las preferencias de notificación del docente que hoy viven
-- sólo en local state de Settings.jsx ("stored locally for now"). El
-- toggle `weekly` controla si recibe el digest semanal (api/analytics-digest).
-- RLS por teacher_id. Una fila por usuario (PK = user id).

CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifs boolean NOT NULL DEFAULT true,
  push_notifs boolean NOT NULL DEFAULT true,
  weekly_digest boolean NOT NULL DEFAULT true,
  study_reminders boolean NOT NULL DEFAULT true,
  streak_reminders boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."notification_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_select_own"
  ON "public"."notification_settings" FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notification_settings_insert_own"
  ON "public"."notification_settings" FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_settings_update_own"
  ON "public"."notification_settings" FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE "public"."notification_settings" IS
  'Analytics Studio F7: preferencias de notificación del docente. weekly_digest gobierna el email semanal (api/analytics-digest, leído server-side con service-role). RLS por user_id.';
```

### Step 2: Settings.jsx — hydrate + persist

Read `src/pages/Settings.jsx`. Find the `notifs` state (line 96):

```jsx
const [notifs, setNotifs] = useState({ email: true, push: true, weekly: true, studyRemind: true, streakRemind: true });
```

Add a hydration effect (after the existing effects, around line 133) and a persist helper. Replace the inline `setNotifs(p => ({...}))` calls in the toggles with a wrapper that also writes to DB.

Add near the top imports (supabase is likely already imported — verify):
```jsx
import { supabase } from "../lib/supabase";
```

Add hydration + persist logic inside the component:

```jsx
// F7: hydrate notif prefs from notification_settings (replaces the
// "stored locally for now" placeholder). Falls back to defaults if no row.
useEffect(() => {
  if (!profile?.id) return;
  let cancelled = false;
  (async () => {
    const { data } = await supabase
      .from("notification_settings")
      .select("email_notifs, push_notifs, weekly_digest, study_reminders, streak_reminders")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (cancelled || !data) return;
    setNotifs({
      email: data.email_notifs,
      push: data.push_notifs,
      weekly: data.weekly_digest,
      studyRemind: data.study_reminders,
      streakRemind: data.streak_reminders,
    });
  })();
  return () => { cancelled = true; };
}, [profile?.id]);

// F7: optimistic flip + upsert. Maps local keys → DB columns.
const persistNotif = async (key, value) => {
  if (!profile?.id) return;
  const colMap = {
    email: "email_notifs",
    push: "push_notifs",
    weekly: "weekly_digest",
    studyRemind: "study_reminders",
    streakRemind: "streak_reminders",
  };
  const next = { ...notifs, [key]: value };
  setNotifs(next);
  await supabase.from("notification_settings").upsert(
    {
      user_id: profile.id,
      email_notifs: next.email,
      push_notifs: next.push,
      weekly_digest: next.weekly,
      study_reminders: next.studyRemind,
      streak_reminders: next.streakRemind,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
};
```

Then change each notif toggle's `onToggle` from:
```jsx
onToggle={() => setNotifs(p => ({ ...p, email: !p.email }))}
```
to:
```jsx
onToggle={() => persistNotif("email", !notifs.email)}
```
(and analogously for `push`, `weekly`, `studyRemind`, `streakRemind` — the 5 toggles at lines 560-567).

### Step 3: Commit (migration not executed locally)

```bash
npm run lint && npm run typecheck && npm run build
git add supabase/migrations/20240101000073_notification_settings.sql src/pages/Settings.jsx
git commit -m "feat(analytics): notification_settings table + Settings persistence (F7)

Migration 073: tabla notification_settings (RLS por user_id, una fila
por docente). Settings.jsx hidrata de la DB on mount y upsert-ea en cada
toggle — reemplaza el 'stored locally for now'. El toggle weekly_digest
gobierna el email semanal (Task 9). User aplica SQL antes de mergear.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: TDD — `weekly-digest.ts` pure aggregation

**Files:**
- Create: `src/lib/analytics/weekly-digest.ts`, `__tests__/weekly-digest.test.ts`

Agregación pura para el cuerpo del email. Toma sessions + responses de la última semana (de UN docente) y produce el resumen + el HTML. El endpoint (Task 9) la llama con datos traídos por service-role.

### Step 1: Write tests

```ts
/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { computeWeeklyDigest, renderDigestHtml } from "../weekly-digest";

describe("computeWeeklyDigest", () => {
  it("aggregates week totals + best class", () => {
    const sessions = [
      { id: "s1", class_id: "a", status: "completed" },
      { id: "s2", class_id: "a", status: "completed" },
      { id: "s3", class_id: "b", status: "completed" },
    ];
    const responses = [
      { session_id: "s1", class_id: "a", points: 1, max_points: 1, is_correct: true },
      { session_id: "s1", class_id: "a", points: 0, max_points: 1, is_correct: false },
      { session_id: "s3", class_id: "b", points: 1, max_points: 1, is_correct: true },
    ];
    const classes = [{ id: "a", name: "5to A" }, { id: "b", name: "5to B" }];
    const d = computeWeeklyDigest({ sessions, responses, classes });
    expect(d.sessions_count).toBe(3);
    expect(d.responses_count).toBe(3);
    expect(d.pct_correct).toBeCloseTo(67, 0);
    expect(d.top_class?.name).toBe("5to A");
    expect(d.has_activity).toBe(true);
  });
  it("flags no activity for an empty week", () => {
    const d = computeWeeklyDigest({ sessions: [], responses: [], classes: [] });
    expect(d.has_activity).toBe(false);
    expect(d.pct_correct).toBeNull();
  });
});

describe("renderDigestHtml", () => {
  it("includes the teacher name and the totals", () => {
    const html = renderDigestHtml({
      teacherName: "Pedro",
      digest: {
        sessions_count: 3,
        responses_count: 50,
        pct_correct: 72,
        top_class: { name: "5to A", response_count: 30 },
        has_activity: true,
      },
    });
    expect(html).toContain("Pedro");
    expect(html).toContain("3");
    expect(html).toContain("72");
    expect(html).toContain("5to A");
  });
  it("renders a calm no-activity message", () => {
    const html = renderDigestHtml({
      teacherName: "Pedro",
      digest: { sessions_count: 0, responses_count: 0, pct_correct: null, top_class: null, has_activity: false },
    });
    expect(html.toLowerCase()).toContain("sin actividad");
  });
});
```

### Step 2: Implement `weekly-digest.ts`

```ts
// ─── src/lib/analytics/weekly-digest.ts ────────────────────────────────
// Agregación pura para el email digest semanal + render del HTML.
// El endpoint api/analytics-digest la llama con datos traídos por
// service-role (sin auth.uid() en un cron). Sin React, sin Supabase.
//
// NOTA: reusa el espíritu de pulse-of-today pero para la ventana semanal
// y agrega el render de HTML (el email es Spanish-only en F7).

export interface DigestInputs {
  sessions: any[];
  responses: any[];
  classes: any[];
}

export interface WeeklyDigest {
  sessions_count: number;
  responses_count: number;
  pct_correct: number | null;
  top_class: { name: string; response_count: number } | null;
  has_activity: boolean;
}

export function computeWeeklyDigest(inputs: DigestInputs): WeeklyDigest {
  const sessions = inputs.sessions || [];
  const responses = inputs.responses || [];
  const classes = inputs.classes || [];

  let sumPoints = 0;
  let sumMax = 0;
  const byClass = new Map<string, number>();
  for (const r of responses) {
    if (Number.isFinite(Number(r?.points))) sumPoints += Number(r.points);
    if (Number.isFinite(Number(r?.max_points))) sumMax += Number(r.max_points);
    if (r?.class_id) byClass.set(r.class_id, (byClass.get(r.class_id) || 0) + 1);
  }
  const pct = sumMax > 0 ? Math.round((sumPoints / sumMax) * 100) : null;

  let topClass: WeeklyDigest["top_class"] = null;
  if (byClass.size > 0) {
    const [id, count] = [...byClass.entries()].sort((a, b) => b[1] - a[1])[0];
    const cls = classes.find((c) => c.id === id);
    topClass = { name: cls?.name || id, response_count: count };
  }

  return {
    sessions_count: sessions.length,
    responses_count: responses.length,
    pct_correct: pct,
    top_class: topClass,
    has_activity: sessions.length > 0 || responses.length > 0,
  };
}

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c),
  );
}

export function renderDigestHtml(args: { teacherName: string; digest: WeeklyDigest }): string {
  const { teacherName, digest } = args;
  const name = esc(teacherName || "");

  if (!digest.has_activity) {
    return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#7c3aed;margin:0 0 12px">Tu semana en Clasloop</h2>
  <p>Hola ${name}, esta semana no hubo actividad en tus clases. Cuando lances una sesión, acá te resumimos cómo le fue a tus estudiantes.</p>
  <p style="color:#71717a;font-size:13px;margin-top:20px">— Cleo, tu analista en Clasloop</p>
</div>`;
  }

  const rows = [
    ["Sesiones", String(digest.sessions_count)],
    ["Respuestas", String(digest.responses_count)],
    ["% correcto", digest.pct_correct != null ? `${digest.pct_correct}%` : "—"],
    ["Clase más activa", digest.top_class ? esc(digest.top_class.name) : "—"],
  ];
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#71717a">${k}</td><td style="padding:6px 0;font-weight:700;text-align:right">${v}</td></tr>`,
    )
    .join("");

  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#7c3aed;margin:0 0 4px">Tu semana en Clasloop</h2>
  <p style="margin:0 0 16px;color:#52525b">Hola ${name}, esto pasó en tus clases esta semana:</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml}</table>
  <p style="color:#71717a;font-size:13px;margin-top:20px">— Cleo, tu analista en Clasloop</p>
</div>`;
}
```

### Step 3: Run tests; barrel; commit

```bash
npm run test:run -- src/lib/analytics
```

Expected: previous + ~4 weekly-digest tests = ≥90 passing.

Add to `src/lib/analytics/index.ts`:
```ts
export * from "./weekly-digest";
```

```bash
git add src/lib/analytics/weekly-digest.ts src/lib/analytics/__tests__/weekly-digest.test.ts src/lib/analytics/index.ts
git commit -m "feat(analytics): weekly-digest.ts — pure aggregation + HTML render (F7)

computeWeeklyDigest({sessions, responses, classes}) → {sessions_count,
responses_count, pct_correct, top_class, has_activity}. renderDigestHtml
arma el email (Spanish-only, con estado calmo si no hubo actividad).
Pura, testeable sin DB — el endpoint la alimenta con service-role queries.
~6 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `api/analytics-digest.js` endpoint + Vercel Cron

**Files:**
- Create: `api/analytics-digest.js`
- Modify: `vercel.json`

Endpoint cron-triggered. Protegido con `CRON_SECRET`. Usa service-role para leer todos los docentes con `weekly_digest = true`, arma el digest de cada uno con queries directas de la última semana, y envía vía Resend (fetch directo).

### Step 1: Write `api/analytics-digest.js`

```js
// ─── api/analytics-digest.js ────────────────────────────────────────────
// F7 Analytics Studio: digest semanal por email. Lo dispara Vercel Cron
// (vercel.json crons → lunes 8am UTC). NO tiene auth de usuario — corre
// como cron, así que:
//   1. Se protege con CRON_SECRET (header Authorization: Bearer <secret>).
//   2. Usa SERVICE_KEY para leer todos los docentes con weekly_digest=true
//      y armar el resumen de cada uno con queries directas (sin RPCs, que
//      dependen de auth.uid()).
//   3. Envía vía Resend (HTTP API directa, sin SDK).
//
// Env requeridas en Vercel:
//   SUPABASE_URL (o VITE_SUPABASE_URL), SUPABASE_SERVICE_KEY (o
//   SUPABASE_SERVICE_ROLE_KEY) — mismo fallback que api/_lib/auth.js,
//   RESEND_API_KEY (NUEVA — el usuario la crea), CRON_SECRET (NUEVA),
//   DIGEST_FROM_EMAIL (opcional; default onboarding@resend.dev para test).
//
// NOTA IMPORTANTE: `profiles` NO tiene columna email (verificado en prod:
// solo full_name, language, role). El email del docente vive en auth.users,
// así que se obtiene con supabase.auth.admin.getUserById(id) (service-role).

import { createClient } from '@supabase/supabase-js';
import { computeWeeklyDigest, renderDigestHtml } from '../src/lib/analytics/weekly-digest.ts';

export default async function handler(req, res) {
  // 1. Auth gate — Vercel Cron manda Authorization: Bearer <CRON_SECRET>.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }
  const fromEmail = process.env.DIGEST_FROM_EMAIL || 'Clasloop <onboarding@resend.dev>';

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 2. Docentes que optaron por el digest.
    const { data: optedIn, error: nsErr } = await supabase
      .from('notification_settings')
      .select('user_id')
      .eq('weekly_digest', true);
    if (nsErr) throw nsErr;
    if (!optedIn || optedIn.length === 0) {
      return res.status(200).json({ sent: 0, note: 'no opted-in teachers' });
    }
    const ids = optedIn.map((r) => r.user_id);

    // profiles da el nombre + el role gate (email NO está acá — está en auth.users).
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', ids)
      .eq('role', 'teacher');
    if (pErr) throw pErr;

    let sent = 0;
    const failures = [];

    for (const prof of profiles || []) {
      try {
        // El email vive en auth.users — lo traemos con el admin API.
        const { data: authUser, error: auErr } = await supabase.auth.admin.getUserById(prof.id);
        const email = authUser?.user?.email;
        if (auErr || !email) {
          failures.push({ id: prof.id, error: 'no_email' });
          continue;
        }
        // Sessions de la semana del docente.
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, class_id, status, created_at')
          .eq('teacher_id', prof.id)
          .gte('created_at', weekAgo);

        const sessionIds = (sessions || []).map((s) => s.id);
        let responses = [];
        if (sessionIds.length > 0) {
          const { data: rs } = await supabase
            .from('responses')
            .select('session_id, points, max_points, is_correct, created_at')
            .in('session_id', sessionIds)
            .gte('created_at', weekAgo);
          // Enriquecer con class_id desde la sesión.
          const byId = new Map((sessions || []).map((s) => [s.id, s]));
          responses = (rs || []).map((r) => ({ ...r, class_id: byId.get(r.session_id)?.class_id || null }));
        }

        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', prof.id);

        const digest = computeWeeklyDigest({ sessions: sessions || [], responses, classes: classes || [] });
        const html = renderDigestHtml({ teacherName: prof.full_name || '', digest });

        // 3. Enviar vía Resend (HTTP directa).
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: 'Tu semana en Clasloop',
            html,
          }),
        });
        if (resp.ok) sent += 1;
        else failures.push({ id: prof.id, status: resp.status });
      } catch (e) {
        failures.push({ id: prof.id, error: String(e?.message || e) });
      }
    }

    return res.status(200).json({ sent, failures: failures.length, detail: failures.slice(0, 5) });
  } catch (err) {
    console.error('[analytics-digest] failed:', err);
    return res.status(500).json({ error: 'digest_failed' });
  }
}
```

**Note on importing a `.ts` file from an `api/*.js` Vercel function:** Vercel's build compiles TS, but importing `../src/lib/analytics/weekly-digest.ts` with the extension from a `.js` ESM file can fail depending on the toolchain. **Mitigation:** if the import errors at build, inline the two functions (`computeWeeklyDigest`, `renderDigestHtml`) directly into `analytics-digest.js` (copy from the tested `weekly-digest.ts`). The reviewer/implementer should verify the import resolves; if not, inline and note it. Prefer the import if it works (single source of truth).

### Step 2: Add Vercel Cron to `vercel.json`

Read `vercel.json`. Add a top-level `crons` array (sibling to `rewrites`/`headers`):

```json
  "crons": [
    { "path": "/api/analytics-digest", "schedule": "0 8 * * 1" }
  ]
```

(Lunes 8am UTC. Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set in env.)

### Step 3: Gates + commit

```bash
npm run lint && npm run typecheck && npm run build
git add api/analytics-digest.js vercel.json
git commit -m "feat(analytics): weekly email digest endpoint + Vercel Cron (F7)

api/analytics-digest.js: cron-triggered (lunes 8am UTC via vercel.json
crons). Protegido con CRON_SECRET. Service-role lee docentes con
weekly_digest=true, arma el digest semanal de cada uno (queries directas,
sin RPCs porque el cron no tiene auth.uid()) y envía vía Resend (HTTP
directa, sin SDK). Reusa computeWeeklyDigest + renderDigestHtml.

Requiere env nuevas en Vercel: RESEND_API_KEY + CRON_SECRET
(+ opcional DIGEST_FROM_EMAIL). Ver PR body para el setup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Final gates + Code Review + PR

### Step 1: Final gates

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
```

Expected: 0 lint errors, 0 typecheck, ≥90 tests (402 from F6 + ~18 new), build clean.

### Step 2: Dispatch final code review subagent

Diff range `main..HEAD`. Focus areas:
- **`report-model.ts`:** section builders correct, empty-tolerant, SECTION_TYPES catalog.
- **`export-csv.ts`:** RFC-4180 escaping (comma/quote/newline), BOM prefix for Excel-compat, downloadCsv browser guard.
- **`export-xlsx.ts` / `export-pdf.ts`:** dynamic imports, sheet-name sanitization (31 char + special chars), PDF page-break (`ensureSpace`).
- **`ExportMenu`:** async buildModel awaited, busy state, dropdown a11y (menu/menuitem roles).
- **`analytics_reports` + `notification_settings` SQL:** RLS policies cover all 4 ops (reports) / 3 ops (settings), teacher_id/user_id guards, FK cascade.
- **`useReports`:** mutations invalidate the list, getUser for teacher_id.
- **`Reports` page:** composer validation, buildModelForReport re-fetches fresh, delete loading state.
- **Settings persistence:** hydration effect deps `[profile?.id]`, upsert onConflict user_id, optimistic flip.
- **`weekly-digest.ts`:** aggregation math, HTML escaping (XSS), no-activity branch.
- **`api/analytics-digest.js`:** CRON_SECRET gate, service-role client config, Resend payload, per-teacher error isolation (one failure doesn't abort the loop), the `.ts` import caveat.
- **Route wiring:** `/school/reports` matched before `/school` equality, TEACHER_ONLY guard.

### Step 3: Push + open PR

```bash
git push -u origin claude/analytics-studio-f7
gh pr create --base main --head claude/analytics-studio-f7 \
  --title "feat(analytics): Analytics Studio F7 — Reportes + Export + Email" \
  --body "<see below>"
```

PR body must include the **user provisioning checklist**:

```
## ⚠️ Antes de mergear — provisioning del usuario

1. Aplicar en Supabase SQL editor (en orden):
   - supabase/migrations/20240101000072_analytics_reports.sql
   - supabase/migrations/20240101000073_notification_settings.sql
2. Crear cuenta en Resend (resend.com) + obtener API key.
   - Para test inmediato: el from default `onboarding@resend.dev` sólo
     envía a tu propio email verificado. Para producción, verificar un
     dominio y setear DIGEST_FROM_EMAIL.
3. Agregar env vars en Vercel (Project Settings → Environment Variables):
   - RESEND_API_KEY = <tu key de Resend>
   - CRON_SECRET = <string random largo> (Vercel lo manda como Bearer al cron)
   - DIGEST_FROM_EMAIL = "Clasloop <noreply@tudominio.com>" (opcional)
4. Re-deploy para que el cron de vercel.json se registre.
   El digest corre lunes 8am UTC. Para probar antes: pegarle al endpoint
   con `Authorization: Bearer <CRON_SECRET>`.
```

---

## Spec Coverage Self-Review

| Spec §8.3 / §6.6 / §6.7 deliverable | Task |
|--------------------------|------|
| Export PDF | Task 2 (export-pdf.ts) |
| Export CSV | Task 1 (export-csv.ts) |
| Export Excel | Task 2 (export-xlsx.ts, SheetJS) |
| Botón "Exportar" en cada vista | Tasks 2-3 (ExportMenu en ClassDetail + Director) |
| Report builder `/school/reports` | Tasks 5-6 (composer, no full drag-drop — documentado) |
| Tabla `analytics_reports` | Task 4 |
| Email digest semanal | Tasks 8-9 (weekly-digest + endpoint + Vercel Cron) |
| pg_cron → endpoint → Resend | Task 9 (Vercel Cron en vez de pg_cron — documentado §decisiones) |
| Cierra toggles de Settings que "mienten" | Task 7 (notification_settings + persistencia) |

All §8.3 mapped (con las decisiones de §10 resueltas arriba).

## Open notes

- **`.ts` import desde `api/*.js`:** Task 9 importa `weekly-digest.ts` desde el endpoint. Si el build de Vercel no lo resuelve, inline las 2 funciones (documentado en Task 9 Step 1). El implementador verifica.
- **Resend `from` default:** `onboarding@resend.dev` sólo entrega al email del dueño de la cuenta Resend hasta verificar dominio — suficiente para QA, no para producción multi-docente. El usuario verifica dominio cuando quiera mandar a todos.
- **Export re-fetch:** los reportes guardados re-fetchan `class_analytics` al exportar (la receta se guarda, los datos son frescos). Trade-off: un export tarda una RPC; alternativa (snapshot al guardar) quedaría obsoleto. F7 elige frescura.
- **PDF charts:** F7 PDF es texto+tablas. Rasterizar recharts (html2canvas) es polish posterior.
- **i18n del email:** Spanish-only en F7. El digest podría leer `profiles.language` y renderizar en/ko en una iteración futura.
- **push toggle:** persiste pero no hay infra de push; es una preferencia guardada sin efecto hasta que exista push.
