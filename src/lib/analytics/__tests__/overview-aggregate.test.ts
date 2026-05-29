import { describe, it, expect } from "vitest";
import { globalKpis, classTrend, criticalTopics, topRiskStudents } from "../overview-aggregate";

describe("globalKpis", () => {
  it("weights % correct by responses_total across rows", () => {
    const ts = [
      { class_id: "a", bucket: "2026-05-01", value: 80, responses_total: 10 },
      { class_id: "a", bucket: "2026-05-02", value: 40, responses_total: 30 },
    ];
    const overview = [
      { class_id: "a", member_count: 8, session_count: 3 },
      { class_id: "b", member_count: 5, session_count: 2 },
    ];
    const k = globalKpis(ts, overview);
    // (80*10 + 40*30) / 40 = 2000/40 = 50
    expect(k.pctCorrect).toBe(50);
    expect(k.classesActive).toBe(2);
    expect(k.totalStudents).toBe(13);
    expect(k.totalSessions).toBe(5);
  });
  it("returns null pctCorrect when there are no responses", () => {
    expect(globalKpis([], []).pctCorrect).toBeNull();
  });
});

describe("classTrend", () => {
  it("groups by class_id and computes points + avg + delta + trend", () => {
    const ts = [
      { class_id: "a", bucket: "2026-05-01", value: 40, responses_total: 5 },
      { class_id: "a", bucket: "2026-05-02", value: 60, responses_total: 5 },
      { class_id: "b", bucket: "2026-05-01", value: 70, responses_total: 5 },
    ];
    const map = classTrend(ts);
    expect(map.a.points).toEqual([40, 60]);
    expect(map.a.avg).toBe(50); // (40*5 + 60*5) / 10
    expect(map.a.delta).toBe(20);
    expect(map.a.trend).toBe("up");
    expect(map.b.points).toEqual([70]);
    expect(map.b.avg).toBe(70);
    expect(map.b.trend).toBe("new"); // <2 points
  });
});

describe("criticalTopics", () => {
  it("flattens topics < threshold cross-class, sorted ascending", () => {
    const overview = [
      { class_id: "a", class_name: "Math", topics_snapshot: [
        { topic: "Fractions", retention_score: 30 },
        { topic: "Decimals", retention_score: 80 },
      ]},
      { class_id: "b", class_name: "Sci", topics_snapshot: [
        { topic: "Cells", retention_score: 20 },
      ]},
    ];
    const out = criticalTopics(overview, 40);
    expect(out.map((t) => t.topic)).toEqual(["Cells", "Fractions"]);
    expect(out[0]).toMatchObject({ classId: "b", className: "Sci", retention: 20 });
  });
});

describe("topRiskStudents", () => {
  it("flattens per-class risk, sorts by score desc, takes top n", () => {
    const perClass = [
      { classId: "a", className: "Math", students: [
        { name: "Ana", risk: { score: 70, level: "high", reasons: ["x"] } },
        { name: "Ben", risk: { score: 10, level: "low", reasons: [] } },
      ]},
      { classId: "b", className: "Sci", students: [
        { name: "Cleo", risk: { score: 50, level: "med", reasons: ["y"] } },
      ]},
    ];
    const out = topRiskStudents(perClass, 2);
    expect(out.map((s) => s.name)).toEqual(["Ana", "Cleo"]);
    expect(out[0]).toMatchObject({ classId: "a", className: "Math", score: 70, level: "high" });
  });
});
