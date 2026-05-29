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
