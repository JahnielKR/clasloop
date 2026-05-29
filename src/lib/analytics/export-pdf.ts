// ─── src/lib/analytics/export-pdf.ts ───────────────────────────────────
// Serializa un ReportModel a un PDF con jsPDF (ya instalado). Texto +
// tablas simples (sin html2canvas → nítido y rápido). Dynamic import.
// Sin tests unitarios (binario; el model ya está testeado).
//
// Import shape: jsPDF v4 exports `default` as `jsPDF` class. The static
// usage in pdf-export.js uses `import jsPDF from "jspdf"`. Dynamic import
// matches: `const { default: JsPDF } = await import("jspdf")`.

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
