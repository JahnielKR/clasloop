/* @vitest-environment node */
// Pure benchmarking helpers for Analytics Studio F4.

import { describe, it, expect } from "vitest";
import {
  previousPeriod,
  percentileRank,
  pctChangeOrNull,
} from "../benchmark";

describe("previousPeriod", () => {
  it("shifts a 30-day window back by 30 days", () => {
    const from = "2026-05-01T00:00:00.000Z";
    const to = "2026-05-31T00:00:00.000Z";
    const prev = previousPeriod(from, to);
    // May 1 to May 31 = 30 days length. Shift both endpoints back by 30 days.
    // May 1 − 30d = April 1; May 31 − 30d = May 1.
    expect(prev.from).toBe("2026-04-01T00:00:00.000Z");
    expect(prev.to).toBe("2026-05-01T00:00:00.000Z");
  });
  it("returns null for either side when input is null", () => {
    expect(previousPeriod(null, "2026-05-31T00:00:00.000Z")).toEqual({ from: null, to: null });
    expect(previousPeriod("2026-05-01T00:00:00.000Z", null)).toEqual({ from: null, to: null });
    expect(previousPeriod(null, null)).toEqual({ from: null, to: null });
  });
});

describe("percentileRank", () => {
  it("returns the percent of values that are <= the target value", () => {
    // 5 values: [10, 20, 30, 40, 50]. For 30 → 3 values (10,20,30) ≤ 30 → 60%.
    expect(percentileRank([10, 20, 30, 40, 50], 30)).toBe(60);
  });
  it("returns 100 for the max value", () => {
    expect(percentileRank([10, 20, 30], 30)).toBe(100);
  });
  it("returns null on empty array or missing target", () => {
    expect(percentileRank([], 30)).toBeNull();
    expect(percentileRank([10, 20], null)).toBeNull();
    expect(percentileRank([10, 20], undefined)).toBeNull();
  });
  it("treats non-numbers in the array as filtered out", () => {
    expect(percentileRank([10, null, 30], 30)).toBe(100);
  });
});

describe("pctChangeOrNull", () => {
  it("returns signed pct change a -> b", () => {
    expect(pctChangeOrNull(50, 60)).toBe(20);
    expect(pctChangeOrNull(60, 50)).toBeCloseTo(-16.7, 1);
  });
  it("returns null on missing input or division by zero", () => {
    expect(pctChangeOrNull(null, 50)).toBeNull();
    expect(pctChangeOrNull(50, null)).toBeNull();
    expect(pctChangeOrNull(0, 50)).toBeNull();
  });
});
