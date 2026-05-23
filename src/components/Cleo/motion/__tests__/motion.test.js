/* @vitest-environment node */
// Pure motion library — no DOM needed. Guards the gesture data integrity and the
// stylesheet contract that ../../index.jsx depends on.

import { describe, it, expect } from "vitest";
import { MOOD_GESTURES } from "../gestures";
import { buildCleoCSS } from "../stylesheet";
import { GESTURE_CLASSES } from "../keyframes";
import { EXPRESSIONS } from "../../expressions";

describe("Cleo motion library", () => {
  it("every mood gesture maps to a real mood with classes that exist", () => {
    for (const [mood, g] of Object.entries(MOOD_GESTURES)) {
      expect(EXPRESSIONS[mood], `unknown mood: ${mood}`).toBeTruthy();
      for (const limb of Object.values(g.arms || {})) {
        expect(GESTURE_CLASSES).toContain(limb.className);
        expect(limb.origin).toHaveLength(2);
        expect(limb.origin.every((n) => typeof n === "number")).toBe(true);
      }
      if (g.mouth) expect(GESTURE_CLASSES).toContain(g.mouth);
      if (g.extras) expect(GESTURE_CLASSES).toContain(g.extras);
    }
  });

  it("gives surprised a mirrored two-armed gasp + an opening mouth", () => {
    expect(MOOD_GESTURES.surprised.arms.left.className).toBe("cleo-arm-gasp");
    expect(MOOD_GESTURES.surprised.arms.right.className).toBe("cleo-arm-gasp-r");
    expect(MOOD_GESTURES.surprised.mouth).toBe("cleo-mouth-gasp");
  });

  it("buildCleoCSS scopes blink/pop per uid, ships shared gestures, and guards reduced-motion", () => {
    const css = buildCleoCSS("xyz");
    expect(css).toContain("cleo-blink-xyz");
    expect(css).toContain("cleo-pop-xyz");
    expect(css).toContain("@keyframes cleo-wave");
    expect(css).toContain(".cleo-arm-wave");
    expect(css).toContain("prefers-reduced-motion");
    for (const cls of GESTURE_CLASSES) expect(css).toContain(`.${cls}`);
  });
});
