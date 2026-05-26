/* @vitest-environment node */
// ─── pdf-math.test.js ────────────────────────────────────────────────────
// Tests the PURE inline layout engine (layoutRichText): word wrapping, inline
// math placement, baseline/advance growth for tall formulas, and the
// raw-LaTeX fallback when a formula failed to rasterise. The rasterisation
// (mathToImage) is a DOM concern, verified in the PDF preview.

import { describe, it, expect } from "vitest";
import { layoutRichText } from "../pdf-math";

// Deterministic metrics: 1 char = 1mm, 1 space = 1mm.
const baseOpts = (mathMetrics) => ({
  measureText: (s) => s.length,
  mathMetrics,
  lineAdvance: 7,
  spaceWidth: 1,
  textAscentMm: 3,
  textDescentMm: 1,
});

describe("layoutRichText", () => {
  it("lays plain text on one line when it fits", () => {
    const { lines, totalHeight } = layoutRichText("ab cd", 100, baseOpts(() => null));
    expect(lines).toHaveLength(1);
    expect(lines[0].items.map((i) => i.str)).toEqual(["ab", "cd"]);
    expect(lines[0].items[0].x).toBe(0);
    expect(lines[0].items[1].x).toBe(3); // "ab"(2) + space(1)
    expect(totalHeight).toBe(7); // standard advance
  });

  it("wraps when a word doesn't fit", () => {
    const { lines } = layoutRichText("aaaa bbbb", 5, baseOpts(() => null));
    expect(lines).toHaveLength(2);
    expect(lines[0].items[0].str).toBe("aaaa");
    expect(lines[1].items[0].str).toBe("bbbb");
    expect(lines[1].items[0].x).toBe(0);
  });

  it("places inline math and grows the line for a tall formula", () => {
    const metrics = () => ({ wMm: 5, hMm: 8, ascentMm: 6, dataUrl: "d" });
    const { lines, totalHeight } = layoutRichText("x $y$ z", 100, baseOpts(metrics));
    expect(lines).toHaveLength(1);
    const items = lines[0].items;
    expect(items[0]).toMatchObject({ kind: "text", str: "x", x: 0 });
    expect(items[1]).toMatchObject({ kind: "math", x: 2, w: 5, ascent: 6 });
    expect(items[2]).toMatchObject({ kind: "text", str: "z", x: 8 });
    // ascent grew to the formula's 6mm, descent to 8-6=2mm → advance = 6+2+1 = 9.
    expect(lines[0].baselineOffset).toBe(6);
    expect(totalHeight).toBe(9);
  });

  it("falls back to raw LaTeX text when a formula has no image", () => {
    const { lines } = layoutRichText("$z$", 100, baseOpts(() => null));
    expect(lines[0].items[0]).toMatchObject({ kind: "text", str: "$z$" });
  });

  it("uses the standard advance when no formula is taller than text", () => {
    const { lines, totalHeight } = layoutRichText("plain words here", 100, baseOpts(() => null));
    expect(lines).toHaveLength(1);
    expect(totalHeight).toBe(7);
  });
});
