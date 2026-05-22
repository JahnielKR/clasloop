/* @vitest-environment node */
// PR 158 (M15): Sentry is a no-op in dev / without a DSN, so the beforeSend
// filter can't be exercised live — it's pinned here instead.
import { describe, it, expect } from "vitest";
import { beforeSendFilter } from "../sentry-filters";

const ev = () => ({ tags: { existing: "x" } });

describe("beforeSendFilter", () => {
  it("M15: keeps network errors and tags them kind:network", () => {
    const byMessage = ev();
    expect(beforeSendFilter(byMessage, { originalException: { message: "Failed to fetch" } })).toBe(byMessage);
    expect(byMessage.tags.kind).toBe("network");
    expect(byMessage.tags.existing).toBe("x"); // preserves existing tags

    const byName = ev();
    expect(beforeSendFilter(byName, { originalException: { name: "NetworkError" } })).toBe(byName);
    expect(byName.tags.kind).toBe("network");
  });

  it("drops Capacitor cancelled dialogs (filter 2)", () => {
    expect(beforeSendFilter(ev(), { originalException: { message: "user_cancelled" } })).toBeNull();
    expect(beforeSendFilter(ev(), { originalException: { message: "operation cancelled" } })).toBeNull();
  });

  it("drops ResizeObserver noise (filter 3)", () => {
    expect(
      beforeSendFilter(ev(), { originalException: { message: "ResizeObserver loop limit exceeded" } })
    ).toBeNull();
  });

  it("sends unrelated errors through untouched", () => {
    const e = ev();
    expect(beforeSendFilter(e, { originalException: { message: "TypeError: x is undefined" } })).toBe(e);
    expect(e.tags.kind).toBeUndefined();
  });

  it("is null-safe when hint / exception is missing", () => {
    const e = ev();
    expect(beforeSendFilter(e, {})).toBe(e);
    expect(beforeSendFilter(e, undefined)).toBe(e);
  });
});
