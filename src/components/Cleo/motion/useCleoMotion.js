// ─── Cleo motion — controller hook ──────────────────────────────────────────
// The one stateful piece of Cleo's motion. Everything imperative + randomized
// lives here so ../index.jsx stays a pure assembler and the part renderers stay
// dumb. Returns `{ live, scope }`:
//   • live  — animate && !prefers-reduced-motion. When false, the caller renders
//             plain SVG (no motion.*), so the rasterized OG path is inert.
//   • scope — a ref for the outer body group; useAnimate scopes its selectors to
//             descendants, so we drive blink/micro by data-cleo="…" group.
// It owns three things, all no-ops when !live: the expression-change "pop", a
// randomized blink, and occasional weighted micro-behaviours (see ./idle.js).

import { useEffect, useRef } from "react";
import { useAnimate, useReducedMotion } from "motion/react";
import { BLINK, MICRO, MICRO_GAP, IDLE_ACTS, IDLE_GAP, SLEEP_LIDS, SLEEP_ZZZ, SLEEP_ZZZ_TRANSITION } from "./idle";

// Eyes that read as "open" — only these blink (and may double-blink).
const BLINK_EYES = new Set(["wide", "surprised", "sad", "wink"]);

// MOTION.spring as an ease array (playful overshoot) for the pop.
const POP_EASE = [0.34, 1.56, 0.64, 1];

const rand = (min, max) => min + Math.random() * (max - min);

function pickWeighted(items) {
  const total = items.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const m of items) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return items[items.length - 1];
}

export function useCleoMotion({ expression, animate = true, eyes, idle = "calm", idleStage = "active" }) {
  const reduce = useReducedMotion();
  const live = animate && !reduce;
  const canBlink = BLINK_EYES.has(eyes);
  const [scope, run] = useAnimate();
  // Opt-in inactivity escalation — only the persistent FAB passes idle="playful".
  const playful = idle === "playful";
  const asleep = playful && idleStage === "asleep";

  // One-shot "pop" when the expression changes — skipped on first mount so it
  // never fights a container's entrance animation.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (!live || !scope.current) return;
    run(scope.current, { scale: [1, 1.05, 1] }, { duration: 0.46, ease: POP_EASE });
  }, [expression, live, run, scope]);

  // Natural blink on a randomized delay (only for "open" eyes; paused while
  // asleep, when the lids are held shut).
  useEffect(() => {
    if (!live || !canBlink || asleep) return undefined;
    let timer;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(async () => {
        if (cancelled || !scope.current) return;
        const lids = scope.current.querySelector('[data-cleo="blink"]');
        if (lids) await run(lids, { scaleY: [1, 0.12, 1] }, { duration: BLINK.duration, ease: "easeInOut" });
        if (!cancelled) schedule();
      }, rand(BLINK.min, BLINK.max));
    };
    schedule();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [live, canBlink, asleep, run, scope]);

  // Occasional micro-behaviours (glance, lean, double-blink) on a randomized gap.
  // Paused once the opt-in idle escalates past "active" — the easter-egg/sleep
  // loops below take over so they never overlap.
  useEffect(() => {
    if (!live || (playful && idleStage !== "active")) return undefined;
    const pool = canBlink ? MICRO : MICRO.filter((m) => m.target !== "blink");
    let timer;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled || !scope.current) return;
        const m = pickWeighted(pool);
        const el = scope.current.querySelector(`[data-cleo="${m.target}"]`);
        if (el) run(el, m.keyframes, m.transition);
        if (!cancelled) schedule();
      }, rand(MICRO_GAP.min, MICRO_GAP.max));
    };
    schedule();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [live, canBlink, playful, idleStage, run, scope]);

  // Easter-egg acts while "playful" — e.g. she plays with her bow. One-shot acts
  // on a long randomized gap; each act can drive several groups at once (tracks).
  useEffect(() => {
    if (!live || !playful || idleStage !== "playful") return undefined;
    let timer;
    let cancelled = false;
    // Play once soon after she turns playful (so the easter-egg actually reads),
    // then on a long random gap so it stays a rare treat.
    const schedule = (first = false) => {
      timer = setTimeout(() => {
        if (cancelled || !scope.current) return;
        const act = pickWeighted(IDLE_ACTS);
        for (const track of act.tracks) {
          const el = scope.current.querySelector(`[data-cleo="${track.target}"]`);
          if (el) run(el, track.keyframes, track.transition);
        }
        if (!cancelled) schedule();
      }, first ? 700 : rand(IDLE_GAP.min, IDLE_GAP.max));
    };
    schedule(true);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [live, playful, idleStage, run, scope]);

  // Asleep (held state): keep the lids shut and float the Z's. On wake — when
  // activity flips the stage back — restore the lids, hide the Z's and give a
  // small surprised pop.
  useEffect(() => {
    if (!live || !asleep) return undefined;
    const root = scope.current; // stable for this mount; copied for the cleanup
    if (!root) return undefined;
    const lids = root.querySelector('[data-cleo="blink"]');
    const zzz = root.querySelector('[data-cleo="zzz"]');
    if (lids) run(lids, { scaleY: SLEEP_LIDS }, { duration: 0.5, ease: "easeInOut" });
    if (zzz) run(zzz, SLEEP_ZZZ, SLEEP_ZZZ_TRANSITION);
    return () => {
      const l = root.querySelector('[data-cleo="blink"]');
      const z = root.querySelector('[data-cleo="zzz"]');
      if (l) run(l, { scaleY: 1 }, { duration: 0.34, ease: POP_EASE });
      if (z) run(z, { opacity: 0 }, { duration: 0.3 });
      run(root, { scale: [1, 1.06, 1] }, { duration: 0.5, ease: POP_EASE });
    };
  }, [live, asleep, run, scope]);

  return { live, scope };
}
