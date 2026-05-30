/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { summarizeCleoUsage, median, prettyModel } from "../cleo-usage";

describe("median", () => {
  it("returns null for empty input", () => {
    expect(median([])).toBe(null);
  });
  it("returns the middle value for odd counts (order-independent)", () => {
    expect(median([30000, 10000, 20000])).toBe(20000);
  });
  it("averages the two middle values for even counts", () => {
    expect(median([10000, 30000])).toBe(20000);
    expect(median([10, 20, 30, 40])).toBe(25);
  });
  it("handles a single value", () => {
    expect(median([42])).toBe(42);
  });
});

describe("prettyModel", () => {
  it("drops a trailing all-digit date segment", () => {
    expect(prettyModel("claude-haiku-4-5-20251001")).toBe("claude-haiku-4-5");
    expect(prettyModel("claude-sonnet-4-5-20250929")).toBe("claude-sonnet-4-5");
  });
  it("leaves models without a trailing date untouched", () => {
    expect(prettyModel("gemini-2.0-flash")).toBe("gemini-2.0-flash");
  });
  it("falls back to 'desconocido' for empty/nullish", () => {
    expect(prettyModel("")).toBe("desconocido");
    expect(prettyModel(null)).toBe("desconocido");
    expect(prettyModel(undefined)).toBe("desconocido");
  });
});

describe("summarizeCleoUsage", () => {
  it("returns an empty summary for no rows", () => {
    const s = summarizeCleoUsage([]);
    expect(s.totalGenerations).toBe(0);
    expect(s.goldCount).toBe(0);
    expect(s.acceptanceRate).toBe(null);
    expect(s.editRate).toBe(null);
    expect(s.medianTimeToPublishMs).toBe(null);
    expect(s.byType).toEqual([]);
    expect(s.byModel).toEqual([]);
    expect(s.byInput).toEqual([]);
  });

  it("computes acceptance/edit rates over gold rows only", () => {
    const s = summarizeCleoUsage([
      { activity_type: "mcq", model_used: "claude-haiku-4-5-20251001", input_type: "text", num_questions: 5, accepted_count: 4, edited_count: 1, regenerated_count: 0, time_to_publish_ms: 10000 },
      { activity_type: "mcq", model_used: "claude-haiku-4-5-20251001", input_type: "pdf", num_questions: 3, accepted_count: 1, edited_count: 2, regenerated_count: 1, time_to_publish_ms: 30000 },
      // no-gold row: counted in volume + distributions, excluded from rates/median
      { activity_type: "tf", model_used: "gemini-2.0-flash", input_type: "text", num_questions: 4, accepted_count: null, edited_count: null, regenerated_count: null, time_to_publish_ms: null },
    ]);
    expect(s.totalGenerations).toBe(3);
    expect(s.goldCount).toBe(2);
    expect(s.acceptedTotal).toBe(5);
    expect(s.editedTotal).toBe(3);
    expect(s.acceptanceRate).toBeCloseTo(5 / 8, 10);
    expect(s.editRate).toBeCloseTo(3 / 8, 10);
    expect(s.medianTimeToPublishMs).toBe(20000);
  });

  it("returns null rates when gold rows kept nothing (no divide-by-zero)", () => {
    const s = summarizeCleoUsage([
      { activity_type: "mcq", model_used: "x", accepted_count: 0, edited_count: 0, time_to_publish_ms: null },
    ]);
    expect(s.goldCount).toBe(1);
    expect(s.acceptanceRate).toBe(null);
    expect(s.editRate).toBe(null);
    expect(s.medianTimeToPublishMs).toBe(null);
  });

  it("builds distributions sorted by count desc, prettifying models", () => {
    const s = summarizeCleoUsage([
      { activity_type: "mcq", model_used: "claude-haiku-4-5-20251001", input_type: "text" },
      { activity_type: "mcq", model_used: "claude-haiku-4-5-20251001", input_type: "pdf" },
      { activity_type: "tf", model_used: "gemini-2.0-flash", input_type: "text" },
    ]);
    expect(s.byType).toEqual([["mcq", 2], ["tf", 1]]);
    expect(s.byModel).toEqual([["claude-haiku-4-5", 2], ["gemini-2.0-flash", 1]]);
    expect(s.byInput).toEqual([["text", 2], ["pdf", 1]]);
  });

  it("buckets missing dimensions under 'desconocido'", () => {
    const s = summarizeCleoUsage([{ num_questions: 2 }]);
    expect(s.byType).toEqual([["desconocido", 1]]);
    expect(s.byModel).toEqual([["desconocido", 1]]);
    expect(s.byInput).toEqual([["desconocido", 1]]);
  });
});
