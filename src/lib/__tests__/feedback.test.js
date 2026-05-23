import { describe, it, expect, beforeEach } from "vitest";
import { hapticsEnabled, setHapticsEnabled } from "../haptics";
import { soundEnabled, setSoundEnabled } from "../sound";

describe("feedback prefs", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  it("haptics default to ON", () => {
    expect(hapticsEnabled()).toBe(true);
  });

  it("haptics can be turned off and persists", () => {
    setHapticsEnabled(false);
    expect(hapticsEnabled()).toBe(false);
    setHapticsEnabled(true);
    expect(hapticsEnabled()).toBe(true);
  });

  it("sound defaults to OFF (opt-in)", () => {
    expect(soundEnabled()).toBe(false);
  });

  it("sound can be enabled and persists", () => {
    setSoundEnabled(true);
    expect(soundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(soundEnabled()).toBe(false);
  });
});
