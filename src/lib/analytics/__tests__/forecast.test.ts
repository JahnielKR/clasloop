/* @vitest-environment node */
// Pure forecast helpers for Analytics Studio F5.

import { describe, it, expect } from "vitest";
import { linearRegression, forecastPoints } from "../forecast";

describe("linearRegression", () => {
  it("recovers slope and intercept of a perfect line", () => {
    // y = 2x + 5
    const pts = [
      { x: 0, y: 5 },
      { x: 1, y: 7 },
      { x: 2, y: 9 },
      { x: 3, y: 11 },
    ];
    const r = linearRegression(pts);
    expect(r).not.toBeNull();
    expect(r!.slope).toBeCloseTo(2, 6);
    expect(r!.intercept).toBeCloseTo(5, 6);
  });
  it("returns null when fewer than 2 points", () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 0, y: 1 }])).toBeNull();
  });
  it("returns null when all x are identical (vertical line)", () => {
    expect(linearRegression([{ x: 1, y: 0 }, { x: 1, y: 5 }])).toBeNull();
  });
  it("filters out non-finite values", () => {
    const pts = [
      { x: 0, y: 10 },
      { x: 1, y: Number.NaN },
      { x: 2, y: 30 },
    ];
    const r = linearRegression(pts);
    expect(r).not.toBeNull();
    expect(r!.slope).toBeCloseTo(10, 6);
    expect(r!.intercept).toBeCloseTo(10, 6);
  });
});

describe("forecastPoints", () => {
  it("extrapolates N points from a data series with linear trend", () => {
    // data: y = 10, 20, 30, 40 (slope=10, intercept=10)
    const data = [
      { bucket: "Mon", value: 10 },
      { bucket: "Tue", value: 20 },
      { bucket: "Wed", value: 30 },
      { bucket: "Thu", value: 40 },
    ];
    const fc = forecastPoints(data, 3);
    expect(fc).toHaveLength(3);
    expect(fc[0].value).toBeCloseTo(50, 4);
    expect(fc[1].value).toBeCloseTo(60, 4);
    expect(fc[2].value).toBeCloseTo(70, 4);
    expect(fc[0].bucket).toBe("+1");
    expect(fc[2].bucket).toBe("+3");
  });
  it("returns [] when data is too short to fit a line", () => {
    expect(forecastPoints([], 3)).toEqual([]);
    expect(forecastPoints([{ bucket: "x", value: 5 }], 3)).toEqual([]);
  });
  it("clamps negative forecasts to 0 (so % can't go below 0)", () => {
    const data = [
      { bucket: "a", value: 30 },
      { bucket: "b", value: 20 },
      { bucket: "c", value: 10 },
    ];
    const fc = forecastPoints(data, 3, { clampMin: 0 });
    expect(fc[0].value).toBe(0);
    expect(fc[2].value).toBe(0);
  });
  it("uses provided horizon count even on a flat series (slope = 0)", () => {
    const data = [
      { bucket: "a", value: 50 },
      { bucket: "b", value: 50 },
      { bucket: "c", value: 50 },
    ];
    const fc = forecastPoints(data, 2);
    expect(fc).toHaveLength(2);
    expect(fc[0].value).toBe(50);
    expect(fc[1].value).toBe(50);
  });
});
