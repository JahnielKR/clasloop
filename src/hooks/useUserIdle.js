// ─── useUserIdle ────────────────────────────────────────────────────────────
// Tracks how long the user has been inactive and exposes a DISCRETE stage:
//   "active"  → there's recent activity
//   "playful" → idle past t1 (the mascot may do small idle easter-eggs)
//   "asleep"  → idle past t2 (the mascot can fall asleep)
//
// It returns a stage string, not raw ms, on purpose: the stage only changes at
// the two thresholds, so a consumer (e.g. Cleo) re-renders a handful of times
// per idle cycle instead of on every mousemove. Activity is detected on cheap
// passive listeners; re-arming the countdown is throttled, and the "wake" path
// is a no-op render while already active (setStage only fires on a real change).
//
//   const stage = useUserIdle({ enabled: !chatOpen });   // 20s / 60s defaults
//
// Pass `enabled: false` to fully opt out (registers nothing, returns "active").

import { useEffect, useState } from "react";

// Cheap, high-signal activity events. All passive — we never preventDefault.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "mousemove", "wheel", "scroll", "touchstart"];
// Re-arm the countdown at most this often (ms). The wake transition is instant
// regardless; this only rate-limits the (very cheap) timer reset.
const THROTTLE_MS = 200;

export function useUserIdle({ enabled = true, t1 = 20000, t2 = 60000 } = {}) {
  const [stage, setStage] = useState("active");

  useEffect(() => {
    if (!enabled) {
      setStage("active");
      return undefined;
    }

    let timer;
    let lastArm = 0;
    let current = "active";

    const go = (next) => {
      if (current === next) return; // no churn, no re-render
      current = next;
      setStage(next);
    };

    const toPlayful = () => {
      go("playful");
      timer = setTimeout(() => go("asleep"), Math.max(0, t2 - t1));
    };

    // (Re)start the countdown to the next threshold from "now".
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(toPlayful, t1);
    };

    const onActivity = () => {
      go("active"); // wake instantly (no-op render if already active)
      const now = Date.now();
      if (now - lastArm < THROTTLE_MS) return;
      lastArm = now;
      arm();
    };

    const onVisibility = () => {
      // Don't let her "fall asleep" while the tab is backgrounded (timers keep
      // running but rAF is paused, so the animation wouldn't be seen anyway).
      if (document.hidden) {
        clearTimeout(timer);
      } else {
        go("active");
        lastArm = Date.now();
        arm();
      }
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    arm();

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, t1, t2]);

  return stage;
}
