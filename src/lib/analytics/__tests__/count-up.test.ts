/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { easeOutCubic, sampleCountUp } from "../count-up";

describe("easeOutCubic", () => {
  it("is 0 at t=0 and 1 at t=1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });
  it("clamps out-of-range t", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
  it("is past the midpoint at t=0.5 (ease-out front-loads)", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("sampleCountUp", () => {
  it("returns `from` at elapsed 0 and `to` at/after duration", () => {
    expect(sampleCountUp(0, 100, 0, 1000)).toBe(0);
    expect(sampleCountUp(0, 100, 1000, 1000)).toBe(100);
    expect(sampleCountUp(0, 100, 2000, 1000)).toBe(100);
  });
  it("interpolates with easing partway through", () => {
    const mid = sampleCountUp(0, 100, 500, 1000);
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(100);
  });
  it("handles a non-zero `from`", () => {
    expect(sampleCountUp(40, 80, 0, 1000)).toBe(40);
    expect(sampleCountUp(40, 80, 1000, 1000)).toBe(80);
  });
  it("returns `to` immediately when duration is 0", () => {
    expect(sampleCountUp(0, 100, 0, 0)).toBe(100);
  });
});
