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
import { BLINK, MICRO, MICRO_GAP } from "./idle";

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

export function useCleoMotion({ expression, animate = true, eyes }) {
  const reduce = useReducedMotion();
  const live = animate && !reduce;
  const canBlink = BLINK_EYES.has(eyes);
  const [scope, run] = useAnimate();

  // One-shot "pop" when the expression changes — skipped on first mount so it
  // never fights a container's entrance animation.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (!live || !scope.current) return;
    run(scope.current, { scale: [1, 1.05, 1] }, { duration: 0.46, ease: POP_EASE });
  }, [expression, live, run, scope]);

  // Natural blink on a randomized delay (only for "open" eyes).
  useEffect(() => {
    if (!live || !canBlink) return undefined;
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
  }, [live, canBlink, run, scope]);

  // Occasional micro-behaviours (glance, lean, double-blink) on a randomized gap.
  useEffect(() => {
    if (!live) return undefined;
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
  }, [live, canBlink, run, scope]);

  return { live, scope };
}
