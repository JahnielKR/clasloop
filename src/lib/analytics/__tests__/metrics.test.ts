/* @vitest-environment node */
// Pure math helpers for analytics widgets. No React, no Supabase.
// Same convention as src/lib/__tests__/scoring-thresholds.test.ts.

import { describe, it, expect } from "vitest";
import {
  mean,
  delta,
  pctChange,
  trendSlope,
  participationRate,
} from "../metrics";

describe("mean", () => {
  it("returns the arithmetic mean", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([4, 4, 4])).toBe(4);
  });
  it("returns null for empty input", () => {
    expect(mean([])).toBeNull();
  });
});

describe("delta", () => {
  it("returns b - a", () => {
    expect(delta(50, 60)).toBe(10);
    expect(delta(70, 50)).toBe(-20);
  });
  it("returns null if either side is missing", () => {
    expect(delta(null, 60)).toBeNull();
    expect(delta(50, null)).toBeNull();
    expect(delta(undefined, 60)).toBeNull();
  });
});

describe("pctChange", () => {
  it("returns percent change a -> b", () => {
    expect(pctChange(50, 60)).toBe(20);
    expect(pctChange(100, 75)).toBe(-25);
  });
  it("returns null when a is 0 (undefined division)", () => {
    expect(pctChange(0, 60)).toBeNull();
  });
  it("returns null on missing input", () => {
    expect(pctChange(null, 60)).toBeNull();
    expect(pctChange(50, null)).toBeNull();
  });
});

describe("trendSlope", () => {
  it("returns positive slope for a rising line", () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(trendSlope(points)).toBe(1);
  });
  it("returns 0 for a flat line", () => {
    const points = [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }];
    expect(trendSlope(points)).toBe(0);
  });
  it("returns null with fewer than 2 points", () => {
    expect(trendSlope([])).toBeNull();
    expect(trendSlope([{ x: 0, y: 0 }])).toBeNull();
  });
});

describe("participationRate", () => {
  it("returns participants/members * 100", () => {
    expect(participationRate(27, 30)).toBe(90);
    expect(participationRate(15, 30)).toBe(50);
  });
  it("returns null when members is 0 (undefined division)", () => {
    expect(participationRate(0, 0)).toBeNull();
  });
  it("returns 0 when participants is 0 and members > 0", () => {
    expect(participationRate(0, 30)).toBe(0);
  });
});
