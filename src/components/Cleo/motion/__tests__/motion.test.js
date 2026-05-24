/* @vitest-environment node */
// Pure motion library — no DOM needed. Guards the gesture data integrity: every
// mood maps to real expressions and to motion variants that actually exist, and
// every variant is valid motion data (the contract ../../index.jsx + ../../parts
// depend on). The live motion itself is verified by hand in the app.

import { describe, it, expect } from "vitest";
import { MOOD_GESTURES } from "../gestures";
import { GESTURE_VARIANTS } from "../variants";
import { EXPRESSIONS } from "../../expressions";

describe("Cleo motion library", () => {
  it("every mood gesture maps to a real mood with variants that exist", () => {
    for (const [mood, g] of Object.entries(MOOD_GESTURES)) {
      expect(EXPRESSIONS[mood], `unknown mood: ${mood}`).toBeTruthy();
      for (const limb of Object.values(g.arms || {})) {
        expect(GESTURE_VARIANTS[limb.variant], `missing variant: ${limb.variant}`).toBeTruthy();
        expect(limb.origin).toHaveLength(2);
        expect(limb.origin.every((n) => typeof n === "number")).toBe(true);
      }
      if (g.mouth) expect(GESTURE_VARIANTS[g.mouth], `missing mouth variant: ${g.mouth}`).toBeTruthy();
      if (g.extras) expect(GESTURE_VARIANTS[g.extras], `missing extras variant: ${g.extras}`).toBeTruthy();
    }
  });

  it("gives surprised a mirrored two-armed gasp + an opening mouth", () => {
    expect(MOOD_GESTURES.surprised.arms.left.variant).toBe("gasp");
    expect(MOOD_GESTURES.surprised.arms.right.variant).toBe("gaspR");
    expect(MOOD_GESTURES.surprised.mouth).toBe("mouthGasp");
  });

  it("leaves sad without a limb gesture (just the tear)", () => {
    expect(MOOD_GESTURES.sad).toBeUndefined();
  });

  it("every gesture variant is valid motion data; wave is a one-shot, the rest loop", () => {
    for (const [name, v] of Object.entries(GESTURE_VARIANTS)) {
      expect(v.animate, `${name}.animate`).toBeTruthy();
      expect(v.transition, `${name}.transition`).toBeTruthy();
    }
    // The happy wave greets once on appear then rests (no repeat); the contextual
    // mood gestures loop while their mood is on screen.
    expect(GESTURE_VARIANTS.wave.transition.repeat).toBeUndefined();
    expect(GESTURE_VARIANTS.cheer.transition.repeat).toBe(Infinity);
    expect(GESTURE_VARIANTS.think.transition.repeat).toBe(Infinity);
  });
});
