// ─── Sound ───────────────────────────────────────────────────────────────────
// Optional, OPT-IN (off by default) audio cues for the live quiz, synthesized
// with the Web Audio API — no asset files to ship. Mutable + pref-persisted;
// the teacher turns it on so it never disrupts a classroom unexpectedly. The
// cues never play unless soundEnabled() is true.
//
//   import { sound, setSoundEnabled } from "../lib/sound";
//   sound.correct();   // no-ops unless the user enabled sound
//
// Same named vocabulary as haptics so a given event maps to one gesture + cue.

import { safeGetJSON, safeSetJSON } from "./safe-storage";

const KEY = "clasloop_sound";

export function soundEnabled() {
  return safeGetJSON(KEY, false) === true; // default OFF
}

export function setSoundEnabled(on) {
  safeSetJSON(KEY, !!on);
}

let _ctx = null;
function audioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) {
    try { _ctx = new AC(); } catch { return null; }
  }
  return _ctx;
}

function tone(freq, { dur = 0.12, type = "sine", gain = 0.05, when = 0 } = {}) {
  const c = audioCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume();
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {
    return; // audio can fail before a user gesture; ignore
  }
}

export const sound = {
  tick: () => { if (soundEnabled()) tone(420, { dur: 0.05, type: "square", gain: 0.03 }); },
  correct: () => { if (soundEnabled()) { tone(660, { dur: 0.1 }); tone(880, { dur: 0.12, when: 0.09 }); } },
  wrong: () => { if (soundEnabled()) tone(180, { dur: 0.18, type: "sawtooth", gain: 0.045 }); },
  fanfare: () => {
    if (!soundEnabled()) return;
    [523, 659, 784, 1046].forEach((f, i) =>
      tone(f, { dur: 0.16, type: "triangle", gain: 0.05, when: i * 0.11 })
    );
  },
};
