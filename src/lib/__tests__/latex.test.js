/* @vitest-environment node */
// ─── latex.test.js ───────────────────────────────────────────────────────
// Track A (A1): the pure LaTeX helpers — segment parsing (drives the on-screen
// KaTeX renderer) and the ASCII fallback (drives the PDF, whose fonts lack math
// glyphs). KaTeX rendering itself is a DOM concern, verified in the browser.

import { describe, it, expect } from "vitest";
import { parseMathSegments, latexToAscii, sanitizeQuestionMath, hasMath } from "../latex";

describe("parseMathSegments", () => {
  it("plain text → single text segment", () => {
    expect(parseMathSegments("hello")).toEqual([{ type: "text", value: "hello" }]);
  });

  it("splits inline math from surrounding text", () => {
    expect(parseMathSegments("Solve $x^2$ now")).toEqual([
      { type: "text", value: "Solve " },
      { type: "math", value: "x^2", display: false },
      { type: "text", value: " now" },
    ]);
  });

  it("recognises display math $$…$$", () => {
    expect(parseMathSegments("$$a+b$$")).toEqual([{ type: "math", value: "a+b", display: true }]);
  });

  it("leaves a money word problem as plain text (currency-safe)", () => {
    expect(parseMathSegments("Tienes $5 y gastas $3")).toEqual([
      { type: "text", value: "Tienes $5 y gastas $3" },
    ]);
  });

  it("still renders real math that starts with a number", () => {
    expect(parseMathSegments("$90^\\circ$ turn")).toEqual([
      { type: "math", value: "90^\\circ", display: false },
      { type: "text", value: " turn" },
    ]);
  });
});

describe("hasMath", () => {
  it("detects inline and display, ignores prose and lone $", () => {
    expect(hasMath("a $x$ b")).toBe(true);
    expect(hasMath("$$x$$")).toBe(true);
    expect(hasMath("no math here")).toBe(false);
    expect(hasMath("costs $5")).toBe(false);
  });

  it("does not treat money amounts as math, but keeps number-leading math", () => {
    expect(hasMath("a pen costs $5 and a book $3")).toBe(false);
    expect(hasMath("$5+$3")).toBe(false);
    expect(hasMath("Angle is $90^\\circ$")).toBe(true);
    expect(hasMath("Area $5 \\times 3$ cm")).toBe(true);
  });
});

describe("latexToAscii", () => {
  it("returns non-strings and math-free strings unchanged", () => {
    expect(latexToAscii(undefined)).toBe(undefined);
    expect(latexToAscii(42)).toBe(42);
    expect(latexToAscii("just text")).toBe("just text");
    // a money word problem has "$" but no real math span → returned unchanged
    expect(latexToAscii("Pay $5 and $3 now")).toBe("Pay $5 and $3 now");
  });

  it("renders fractions and roots", () => {
    expect(latexToAscii("$\\frac{1}{2}$")).toBe("(1)/(2)");
    expect(latexToAscii("$\\sqrt{9}$")).toBe("sqrt(9)");
    expect(latexToAscii("$\\sqrt[3]{8}$")).toBe("root[3](8)");
    // Deeply nested fractions fully resolve (the loop repeats until none
    // remain) instead of leaving a stray "frac".
    expect(latexToAscii("$\\frac{\\frac{\\frac{\\frac{1}{2}}{3}}{4}}{5}$")).toBe(
      "((((1)/(2))/(3))/(4))/(5)"
    );
  });

  it("renders super/subscripts", () => {
    expect(latexToAscii("$x^{2}$")).toBe("x^(2)");
    expect(latexToAscii("$x^2$")).toBe("x^2");
    expect(latexToAscii("$a_{1}$")).toBe("a_(1)");
  });

  it("renders symbols and greek", () => {
    expect(latexToAscii("$3 \\times 4$")).toBe("3 * 4");
    expect(latexToAscii("$x \\leq 5$")).toBe("x <= 5");
    expect(latexToAscii("$\\theta$")).toBe("theta");
    expect(latexToAscii("$90^\\circ$")).toBe("90deg");
  });

  it("keeps the surrounding prose", () => {
    expect(latexToAscii("Area is $\\pi r^2$ units")).toBe("Area is pi r^2 units");
  });

  it("degrades an unknown command to its bare name", () => {
    expect(latexToAscii("$a \\heartsuit b$")).toBe("a heartsuit b");
  });
});

describe("sanitizeQuestionMath", () => {
  it("converts every text field and never mutates the input", () => {
    const q = {
      type: "mcq", correct: 0, time_limit: 30,
      q: "What is $\\frac{1}{2}$?",
      options: ["$x^2$", { text: "$\\pi$", image_url: "u" }],
    };
    const out = sanitizeQuestionMath(q);
    expect(out.q).toBe("What is (1)/(2)?");
    expect(out.options[0]).toBe("x^2");
    expect(out.options[1]).toEqual({ text: "pi", image_url: "u" });
    expect(out.correct).toBe(0);
    expect(out.time_limit).toBe(30);
    // original untouched
    expect(q.q).toBe("What is $\\frac{1}{2}$?");
    expect(q.options[0]).toBe("$x^2$");
  });

  it("handles fill answer/alternatives and match pairs", () => {
    const fill = sanitizeQuestionMath({ type: "fill", q: "?", answer: "$x^2$", alternatives: ["$y^2$"] });
    expect(fill.answer).toBe("x^2");
    expect(fill.alternatives).toEqual(["y^2"]);

    const match = sanitizeQuestionMath({ type: "match", q: "?", pairs: [{ left: "$\\pi$", right: "3.14" }] });
    expect(match.pairs[0]).toEqual({ left: "pi", right: "3.14" });
  });
});
