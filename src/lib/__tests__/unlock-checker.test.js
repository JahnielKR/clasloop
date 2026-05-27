// Tests for the streak helpers in unlock-checker.js. computeStreakDays had no
// coverage; these lock the consecutive-day algorithm (gaps, dedup, leniency)
// and the localDayKey contract that fixes the UTC-vs-local bucketing bug.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { localDayKey, computeStreakDays } from "../unlock-checker";

describe("localDayKey", () => {
  it("returns the LOCAL calendar day as YYYY-MM-DD", () => {
    // Built and read in local time → same date in every timezone (the point:
    // a late-evening session must not roll to the next UTC day).
    expect(localDayKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(localDayKey(new Date(2026, 11, 31, 9, 0))).toBe("2026-12-31");
    // Zero-pads single-digit month and day.
    expect(localDayKey(new Date(2026, 2, 7, 0, 0))).toBe("2026-03-07");
  });
});

describe("computeStreakDays", () => {
  // Pin "now" to Sat Jan 10 2026, 9am local so the assertions are deterministic.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 10, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  // Build a session whose joined_at is an ISO string for a given LOCAL time.
  const at = (y, m, d, h = 12) => ({ joined_at: new Date(y, m, d, h).toISOString() });

  it("counts consecutive local days ending today (incl. a late-evening session)", () => {
    expect(
      computeStreakDays([at(2026, 0, 10, 23), at(2026, 0, 9, 20), at(2026, 0, 8, 7)])
    ).toBe(3);
  });

  it("is lenient: a streak ending yesterday still counts", () => {
    expect(computeStreakDays([at(2026, 0, 9), at(2026, 0, 8)])).toBe(2);
  });

  it("returns 0 when the latest session is older than yesterday", () => {
    expect(computeStreakDays([at(2026, 0, 7)])).toBe(0);
  });

  it("dedupes multiple sessions on the same day", () => {
    expect(computeStreakDays([at(2026, 0, 10, 8), at(2026, 0, 10, 20)])).toBe(1);
  });

  it("stops at the first gap", () => {
    expect(computeStreakDays([at(2026, 0, 10), at(2026, 0, 9), at(2026, 0, 7)])).toBe(2);
  });

  it("returns 0 for empty or missing input", () => {
    expect(computeStreakDays([])).toBe(0);
    expect(computeStreakDays(null)).toBe(0);
  });
});
