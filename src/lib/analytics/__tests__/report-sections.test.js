/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { REPORT_SECTIONS, moveSection } from "../report-sections";

describe("report-sections", () => {
  it("exposes the 3 section ids with label + desc keys", () => {
    expect(REPORT_SECTIONS.map((s) => s.id)).toEqual(["kpis", "topics", "most_missed"]);
    for (const s of REPORT_SECTIONS) {
      expect(typeof s.labelKey).toBe("string");
      expect(typeof s.descKey).toBe("string");
    }
  });

  it("moveSection up swaps with the previous id", () => {
    expect(moveSection(["kpis", "topics", "most_missed"], "topics", "up"))
      .toEqual(["topics", "kpis", "most_missed"]);
  });

  it("moveSection down swaps with the next id", () => {
    expect(moveSection(["kpis", "topics", "most_missed"], "topics", "down"))
      .toEqual(["kpis", "most_missed", "topics"]);
  });

  it("moveSection is a no-op at the boundaries", () => {
    expect(moveSection(["kpis", "topics"], "kpis", "up")).toEqual(["kpis", "topics"]);
    expect(moveSection(["kpis", "topics"], "topics", "down")).toEqual(["kpis", "topics"]);
  });

  it("moveSection is a no-op when id is absent", () => {
    expect(moveSection(["kpis"], "topics", "up")).toEqual(["kpis"]);
  });

  it("returns a NEW array (does not mutate input)", () => {
    const input = ["kpis", "topics"];
    const out = moveSection(input, "topics", "up");
    expect(out).not.toBe(input);
    expect(input).toEqual(["kpis", "topics"]);
  });
});
