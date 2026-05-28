/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import {
  buildClassNarrativeContext,
  buildStudentNarrativeContext,
} from "../cleo-analytics";

describe("buildClassNarrativeContext", () => {
  it("returns kpis, top critical topics, top dominated topics, most-missed and trend tail", () => {
    const classAnalytics = {
      kpis: {
        pct_correct: 68.5,
        unique_participants: 22,
        responses_total: 412,
        avg_time_ms: 11400,
      },
      topic_mastery: [
        { topic: "Fracciones", retention_score: 25 },
        { topic: "Decimales", retention_score: 35 },
        { topic: "Geometría", retention_score: 38 },
        { topic: "Suma", retention_score: 88 },
        { topic: "Resta", retention_score: 82 },
        { topic: "Multiplicación", retention_score: 80 },
      ],
      most_missed: [
        { question_index: 3, topic: "Fracciones", error_rate: 80 },
        { question_index: 7, topic: "Decimales", error_rate: 65 },
        { question_index: 12, topic: "Fracciones", error_rate: 60 },
      ],
    };
    const trend = [
      { bucket: "Mon", value: 60 },
      { bucket: "Tue", value: 65 },
      { bucket: "Wed", value: 68 },
      { bucket: "Thu", value: 70 },
      { bucket: "Fri", value: 68 },
    ];
    const ctx = buildClassNarrativeContext({
      className: "5to A",
      classAnalytics,
      timeseries: trend,
      lang: "es",
    });
    expect(ctx.scope).toBe("class");
    expect(ctx.className).toBe("5to A");
    expect(ctx.kpis.pct_correct).toBe(68.5);
    expect(ctx.weakTopics).toHaveLength(3);
    expect(ctx.weakTopics[0].topic).toBe("Fracciones");
    expect(ctx.strongTopics).toHaveLength(3);
    expect(ctx.strongTopics[0].topic).toBe("Suma");
    expect(ctx.mostMissed).toHaveLength(3);
    expect(ctx.recentTrend).toHaveLength(4); // tail of 4
  });
  it("tolerates empty inputs (returns valid skeleton)", () => {
    const ctx = buildClassNarrativeContext({
      className: "x",
      classAnalytics: {},
      timeseries: [],
      lang: "es",
    });
    expect(ctx.weakTopics).toEqual([]);
    expect(ctx.strongTopics).toEqual([]);
    expect(ctx.mostMissed).toEqual([]);
    expect(ctx.recentTrend).toEqual([]);
  });
});

describe("buildStudentNarrativeContext", () => {
  it("returns student kpis + weak topics + delta vs class + recent trajectory tail", () => {
    const detail = {
      kpis: { pct_correct: 55, session_count: 8 },
      topic_mastery: [
        { topic: "Fracciones", retention_score: 22 },
        { topic: "Decimales", retention_score: 40 },
      ],
      most_failed: [
        { question_index: 1, topic: "Fracciones", error_rate: 80 },
      ],
      trajectory: [
        { bucket: "wk1", value: 60 },
        { bucket: "wk2", value: 58 },
        { bucket: "wk3", value: 55 },
      ],
      class_avg_retention: 68,
    };
    const ctx = buildStudentNarrativeContext({
      studentName: "Lucía",
      detail,
      lang: "es",
    });
    expect(ctx.scope).toBe("student");
    expect(ctx.studentName).toBe("Lucía");
    expect(ctx.weakTopics[0].topic).toBe("Fracciones");
    expect(ctx.deltaVsClass).toBeLessThan(0);
    expect(ctx.recentTrajectory).toHaveLength(3);
  });
});
