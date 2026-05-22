/* @vitest-environment node */
// PR 154 (M33): the consumers are authed pages (not browser-testable here), so
// the tier boundaries are pinned in this unit test instead.
import { describe, it, expect } from "vitest";
import { scoreTier, retentionTier, pctColor } from "../scoring-thresholds";

const PALETTE = { textMuted: "muted", green: "green", orange: "orange", red: "red" };

describe("scoreTier (80 / 50)", () => {
  it("maps boundary values", () => {
    expect(scoreTier(100)).toBe("green");
    expect(scoreTier(80)).toBe("green");
    expect(scoreTier(79)).toBe("orange");
    expect(scoreTier(50)).toBe("orange");
    expect(scoreTier(49)).toBe("red");
    expect(scoreTier(0)).toBe("red");
  });
});

describe("retentionTier (70 / 40)", () => {
  it("maps boundary values", () => {
    expect(retentionTier(70)).toBe("green");
    expect(retentionTier(69)).toBe("orange");
    expect(retentionTier(40)).toBe("orange");
    expect(retentionTier(39)).toBe("red");
  });
});

describe("pctColor", () => {
  it("returns the muted color when pct is null", () => {
    expect(pctColor(null, PALETTE)).toBe("muted");
  });
  it("maps the SCORE tiers (80 / 50) onto the palette", () => {
    expect(pctColor(85, PALETTE)).toBe("green");
    expect(pctColor(80, PALETTE)).toBe("green");
    expect(pctColor(79, PALETTE)).toBe("orange");
    expect(pctColor(50, PALETTE)).toBe("orange");
    expect(pctColor(49, PALETTE)).toBe("red");
  });
});
