// ─── Haptics ───────────────────────────────────────────────────────────────
// Subtle tactile feedback via the Web Vibration API (Android / Chrome / PWA;
// a graceful no-op on iOS Safari and desktop). Dependency-free on purpose — no
// Capacitor plugin required; a native haptics layer can slot in later behind
// this same API. Gated by a persisted pref (default ON) + prefers-reduced-motion
// so it's never intrusive.
//
//   import { haptics } from "../lib/haptics";
//   haptics.select();   // on answer pick
//   haptics.success();  // correct
//
// One named vocabulary so identical events feel identical everywhere.

import { safeGetJSON, safeSetJSON } from "./safe-storage";

const KEY = "clasloop_haptics";

export function hapticsEnabled() {
  return safeGetJSON(KEY, true) !== false; // default ON
}

export function setHapticsEnabled(on) {
  safeSetJSON(KEY, !!on);
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function buzz(pattern) {
  if (!hapticsEnabled() || reducedMotion()) return;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  tap: () => buzz(8),
  select: () => buzz(12),
  success: () => buzz([14, 40, 22]),
  error: () => buzz([22, 30, 22]),
  celebrate: () => buzz([10, 30, 10, 30, 28]),
};
