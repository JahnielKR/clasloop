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
      period: "30 days",
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

  it("kpis section flattens kpi object to label/value rows (en default)", () => {
    const model = buildClassReportModel({
      className: "x",
      period: "7 days",
      classAnalytics,
      sections: ["kpis"],
    });
    const kpiSection = model.sections.find((s) => s.type === "kpis");
    expect(kpiSection!.rows!.find((r) => r.label === "% correct")!.value).toBe(72);
  });

  it("topics section is tabular (columns + data), localized", () => {
    const model = buildClassReportModel({
      className: "x",
      period: "7 days",
      classAnalytics,
      sections: ["topics"],
    });
    const topics = model.sections.find((s) => s.type === "topics");
    expect(topics!.columns).toEqual(["Topic", "Retention"]);
    expect(topics!.data).toEqual([
      ["Fracciones", 30],
      ["Suma", 85],
    ]);
  });

  it("localizes section titles + labels by lang", () => {
    const en = buildClassReportModel({
      className: "5A", period: "30 days", lang: "en",
      classAnalytics: { kpis: { pct_correct: 80 } }, sections: ["kpis"],
    });
    expect(en.sections[0].title).toBe("Key indicators");
    const es = buildClassReportModel({
      className: "5A", period: "30 días", lang: "es",
      classAnalytics: { kpis: { pct_correct: 80 } }, sections: ["kpis"],
    });
    expect(es.sections[0].title).toBe("Indicadores clave");
    expect(es.sections[0].rows!.find((r) => r.label === "% correcto")!.value).toBe(80);
  });

  it("tolerates empty analytics", () => {
    const model = buildClassReportModel({
      className: "x",
      period: "7 days",
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
