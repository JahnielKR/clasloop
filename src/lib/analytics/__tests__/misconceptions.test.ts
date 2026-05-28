/* @vitest-environment node */
// Pure misconception helpers for Analytics Studio F3.

import { describe, it, expect } from "vitest";
import {
  correctKeyForMcq,
  correctKeyForTf,
  pickTopMisconception,
  decorateDistribution,
} from "../misconceptions";

describe("correctKeyForMcq", () => {
  it("returns the index as a string when correct is a number", () => {
    expect(correctKeyForMcq({ type: "mcq", correct: 2 })).toBe("2");
  });
  it("returns the first correct when multi (array)", () => {
    expect(correctKeyForMcq({ type: "mcq", correct: [1, 3] })).toBe("1");
  });
  it("returns null on non-mcq or missing", () => {
    expect(correctKeyForMcq(null)).toBeNull();
    expect(correctKeyForMcq({ type: "tf", correct: true })).toBeNull();
    expect(correctKeyForMcq({ type: "mcq" })).toBeNull();
  });
});

describe("correctKeyForTf", () => {
  it("returns 'true'/'false' as strings", () => {
    expect(correctKeyForTf({ type: "tf", correct: true })).toBe("true");
    expect(correctKeyForTf({ type: "tf", correct: false })).toBe("false");
  });
  it("returns null on non-tf", () => {
    expect(correctKeyForTf({ type: "mcq", correct: 0 })).toBeNull();
    expect(correctKeyForTf(null)).toBeNull();
  });
});

describe("pickTopMisconception", () => {
  it("returns the key with highest count that ISN'T the correct key", () => {
    const dist = { "0": 3, "1": 8, "2": 5 };
    expect(pickTopMisconception(dist, "1")).toEqual({ key: "2", count: 5 });
  });
  it("returns null when only the correct key has counts", () => {
    const dist = { "0": 10 };
    expect(pickTopMisconception(dist, "0")).toBeNull();
  });
  it("returns null when correctKey is null (we can't tell what's wrong)", () => {
    expect(pickTopMisconception({ "0": 3 }, null)).toBeNull();
  });
  it("handles empty distribution", () => {
    expect(pickTopMisconception({}, "1")).toBeNull();
  });
});

describe("decorateDistribution", () => {
  it("returns sorted entries with `isCorrect` flag", () => {
    const dist = { "0": 3, "1": 8, "2": 5 };
    const decorated = decorateDistribution(dist, "1");
    expect(decorated).toEqual([
      { key: "1", count: 8, isCorrect: true },
      { key: "2", count: 5, isCorrect: false },
      { key: "0", count: 3, isCorrect: false },
    ]);
  });
  it("flags none as correct when correctKey is null", () => {
    const decorated = decorateDistribution({ "0": 3, "1": 8 }, null);
    expect(decorated.every((e) => !e.isCorrect)).toBe(true);
  });
  it("empty input returns empty array", () => {
    expect(decorateDistribution({}, "1")).toEqual([]);
  });
});
