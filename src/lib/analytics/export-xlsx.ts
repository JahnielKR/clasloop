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
