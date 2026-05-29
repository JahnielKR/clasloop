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
  // ﻿ = UTF-8 BOM — keeps Excel happy with accented characters
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
