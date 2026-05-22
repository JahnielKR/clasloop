/* @vitest-environment node */
// PR 149 (M19): the navigator.language fallback can't be exercised in the
// preview browser (no locale control), so the detection chain is verified here.
import { describe, it, expect } from "vitest";
import { resolveInitialLang } from "../locale";

describe("resolveInitialLang", () => {
  it("prefers a valid saved choice over the browser language", () => {
    expect(resolveInitialLang({ saved: "es", navigatorLang: "ko-KR" })).toBe("es");
  });

  it("falls back to the browser language when nothing is saved", () => {
    expect(resolveInitialLang({ saved: null, navigatorLang: "ko-KR" })).toBe("ko");
    expect(resolveInitialLang({ saved: null, navigatorLang: "es-ES" })).toBe("es");
  });

  it("strips the region subtag and lowercases", () => {
    expect(resolveInitialLang({ navigatorLang: "EN-GB" })).toBe("en");
  });

  it("ignores unsupported saved and browser values", () => {
    expect(resolveInitialLang({ saved: "fr", navigatorLang: "de-DE" })).toBe("en");
  });

  it("defaults to en with no inputs", () => {
    expect(resolveInitialLang()).toBe("en");
    expect(resolveInitialLang({})).toBe("en");
  });
});
