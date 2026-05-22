/* @vitest-environment node */
// ─── supabase-errors.test.ts ────────────────────────────────────────────
//
// PR 144 (M21): formatSupabaseError must turn raw errors into friendly,
// localized messages and NEVER echo the technical detail back to the user.

import { describe, it, expect } from "vitest";
import { formatSupabaseError } from "../supabase-errors";

describe("formatSupabaseError — categorization", () => {
  it("maps Postgres codes", () => {
    expect(formatSupabaseError({ code: "42501" }, "en")).toMatch(/permission/i);
    expect(formatSupabaseError({ code: "23505" }, "en")).toMatch(/already exists/i);
    expect(formatSupabaseError({ code: "23503" }, "en")).toMatch(/depends on it/i);
    expect(formatSupabaseError({ code: "PGRST116" }, "en")).toMatch(/couldn't find/i);
  });

  it("maps HTTP status", () => {
    expect(formatSupabaseError({ status: 403 }, "en")).toMatch(/permission/i);
    expect(formatSupabaseError({ status: 404 }, "en")).toMatch(/couldn't find/i);
    expect(formatSupabaseError({ status: 429 }, "en")).toMatch(/too many/i);
    expect(formatSupabaseError({ status: 500 }, "en")).toMatch(/network/i);
  });

  it("maps common message patterns", () => {
    expect(formatSupabaseError({ message: "TypeError: Failed to fetch" }, "en")).toMatch(/network/i);
    expect(
      formatSupabaseError({ message: "new row violates row-level security policy" }, "en"),
    ).toMatch(/permission/i);
  });

  it("falls back to 'unknown' for unrecognized errors", () => {
    expect(formatSupabaseError({ code: "ZZZ999" }, "en")).toMatch(/something went wrong/i);
    expect(formatSupabaseError(null, "en")).toMatch(/something went wrong/i);
    expect(formatSupabaseError("a string", "en")).toMatch(/something went wrong/i);
  });
});

describe("formatSupabaseError — localization", () => {
  it("returns the message in the requested language", () => {
    expect(formatSupabaseError({ code: "23505" }, "es")).toBe("Eso ya existe. Probá con otro nombre.");
    expect(formatSupabaseError({ code: "23505" }, "ko")).toBe("이미 존재합니다. 다른 이름을 사용해보세요.");
  });

  it("defaults to English", () => {
    expect(formatSupabaseError({ status: 404 })).toBe("We couldn't find what you're looking for.");
  });
});

describe("formatSupabaseError — never leaks technical detail (M21)", () => {
  const leaky = {
    code: "23505",
    message: 'duplicate key value violates unique constraint "decks_title_key"',
    details: "Key (title)=(Math) already exists.",
    hint: "permission denied for relation decks",
  };
  for (const lang of ["en", "es", "ko"] as const) {
    it(`(${lang}) output contains no part of the raw error`, () => {
      const out = formatSupabaseError(leaky, lang);
      expect(out).not.toContain("constraint");
      expect(out).not.toContain("decks_title_key");
      expect(out).not.toContain("relation");
      expect(out).not.toContain("Key (title)");
    });
  }
});
