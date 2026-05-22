import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  safeGet,
  safeSet,
  safeRemove,
  safeGetJSON,
  safeSetJSON,
} from "../safe-storage";

describe("safe-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("safeGet returns the stored value, or the fallback when missing", () => {
    localStorage.setItem("k", "v");
    expect(safeGet("k")).toBe("v");
    expect(safeGet("missing")).toBeNull();
    expect(safeGet("missing", "dflt")).toBe("dflt");
  });

  it("safeSet stores and reports success", () => {
    expect(safeSet("k", "v")).toBe(true);
    expect(localStorage.getItem("k")).toBe("v");
  });

  it("safeRemove deletes the key", () => {
    localStorage.setItem("k", "v");
    expect(safeRemove("k")).toBe(true);
    expect(localStorage.getItem("k")).toBeNull();
  });

  it("never throws and returns the fallback when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(safeGet("k", "fb")).toBe("fb");
    expect(safeSet("k", "v")).toBe(false);
    expect(safeRemove("k")).toBe(false);
    expect(safeGetJSON("k", { ok: true })).toEqual({ ok: true });
    expect(safeSetJSON("k", { a: 1 })).toBe(false);
  });

  it("safeGetJSON round-trips objects and falls back on invalid JSON", () => {
    expect(safeSetJSON("obj", { a: 1, b: [2, 3] })).toBe(true);
    expect(safeGetJSON("obj", null)).toEqual({ a: 1, b: [2, 3] });
    expect(safeGetJSON("missing", { d: true })).toEqual({ d: true });
    localStorage.setItem("bad", "{not json");
    expect(safeGetJSON("bad", "fallback")).toBe("fallback");
  });
});
