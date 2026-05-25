// ─── Cleo — Clasloop's official mascot ─────────────────────────────────────
// A friendly, self-contained character: a soft blue body, a gold ribbon (her
// signature, reads as a girl), big eyes, blush cheeks and her signature smile.
// Flat fills + one outline weight, crisp at any size, centered in a 100×100
// viewBox so she drops in anywhere. Height scales 1:1 with `size`.
//
// She is expression-driven: the body, ribbon, shadow and highlight are constant;
// the eyes, brows, mouth, cheeks, arms and a small extra change per `expression`
// (recipes in ./expressions.js, drawn by ./parts/*). The default `happy` keeps the
// original look, so existing callers are unchanged.
//
// Usage:
//   <Cleo />                          // 96px, happy (default)
//   <Cleo size={120} expression="cheer" />
//   <Cleo expression="thinking" />    // reacts to context
//   <Cleo expression="sad" animate={false} />  // static (e.g. rasterized OG)
//
// Motion (opt-in via `animate`, default on; built on motion/react): she breathes,
// blinks on a natural random cadence, plays per-mood idle gestures (waves, taps her
// chin…), and throws in the odd glance or lean so she never looks looped — plus a
// soft "pop" when the expression changes. All of it is owned by ./motion's
// useCleoMotion hook and disabled under prefers-reduced-motion or animate={false},
// where she renders as plain, inert SVG (the contract the rasterized OG relies on).
import { useId } from "react";
import { motion } from "motion/react";
import { Eyes, Brows, Mouth, Arms, Extras, Ribbon, SleepMarks } from "./parts";
import { EXPRESSIONS } from "./expressions";
import { MOOD_GESTURES, useCleoMotion } from "./motion";
import { BREATH, BREATH_TRANSITION, SLEEP_BREATH, SLEEP_BREATH_TRANSITION } from "./motion/idle";

// `idle` opts into the inactivity easter-eggs ("calm" = off, the default, so every
// existing caller is unchanged; "playful" = the persistent chat FAB). `idleStage`
// ("active" | "playful" | "asleep") comes from useUserIdle, owned by the caller.
export default function Cleo({ size = 96, expression = "happy", animate = true, idle = "calm", idleStage = "active", className = "", style = {}, title = "Cleo" }) {
  // Unique ids per instance so multiple Cleos don't share/clip a def.
  const uid = useId().replace(/:/g, "");
  const bodyGrad = `cleo-body-${uid}`;
  const goldGrad = `cleo-gold-${uid}`;

  const spec = EXPRESSIONS[expression] || EXPRESSIONS.happy;
  const { live, scope } = useCleoMotion({ expression, animate, eyes: spec.eyes, idle, idleStage });
  // Idle limb gesture for this mood (only when live; sad has none). The happy wave
  // is one-shot, so it plays once on appear then the arm rests back down.
  const gesture = live ? MOOD_GESTURES[expression] : undefined;

  // Easter-eggs only when the caller opts in (idle="playful") and motion is live.
  const playful = idle === "playful";
  const asleep = live && playful && idleStage === "asleep";

  // The body group breathes when live; otherwise it's a plain, inert <g>. While
  // asleep it swaps to a slower, deeper breath (declarative — no imperative fight).
  const Breath = live ? motion.g : "g";
  const breathProps = live
    ? {
        animate: asleep ? SLEEP_BREATH : BREATH,
        transition: asleep ? SLEEP_BREATH_TRANSITION : BREATH_TRANSITION,
        style: { transformBox: "fill-box", transformOrigin: "center" },
      }
    : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9AD6F7" />
          <stop offset="1" stopColor="#5BA8DE" />
        </linearGradient>
        <linearGradient id={goldGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD968" />
          <stop offset="1" stopColor="#F4B53C" />
        </linearGradient>
      </defs>

      {/* soft ground shadow (outside the pop/breath groups — stays put) */}
      <ellipse cx="50" cy="90" rx="24" ry="4.5" fill="#20425E" opacity="0.12" />

      {/* scope group: useCleoMotion drives the expression-change "pop" here */}
      <g ref={scope} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        {/* lean group: occasional micro-lean pivots about her base */}
        <g data-cleo="lean" style={{ transformBox: "view-box", transformOrigin: "50px 86px" }}>
          <Breath {...breathProps}>
            {/* arms behind the body */}
            <Arms variant={spec.arms} gesture={gesture?.arms} layer="back" live={live} />

            {/* ribbon (brand signature, replaces the old crown). Wrapped in a
                group the "play with her bow" idle act animates imperatively — the
                wrapper rotate/bounce composes with the bow's own declarative
                wobble, so they don't fight (transform-origin string, respected by
                useAnimate's run()). */}
            <g data-cleo="ribbon" style={{ transformBox: "view-box", transformOrigin: "50px 27.5px" }}>
              <Ribbon live={live} gradId={goldGrad} />
            </g>

            {/* body */}
            <path
              d="M50 34 C68 34 80 47 80 62 C80 78 67 86 50 86 C33 86 20 78 20 62 C20 47 32 34 50 34 Z"
              fill={`url(#${bodyGrad})`}
              stroke="#20425E"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <ellipse cx="38" cy="48" rx="12" ry="8" fill="#FFFFFF" opacity="0.35" />

            {/* arms in front of the body (folded, hand on chin…) */}
            <Arms variant={spec.arms} gesture={gesture?.arms} layer="front" live={live} />

            {/* cheeks (strength varies by mood) */}
            {spec.cheeks > 0 && (
              <>
                <ellipse cx="32" cy="64" rx="6" ry="4" fill="#FF9DBE" opacity={spec.cheeks} />
                <ellipse cx="68" cy="64" rx="6" ry="4" fill="#FF9DBE" opacity={spec.cheeks} />
              </>
            )}

            {/* eyes — wrapped so micro-glances (look) and blinks (blink) target them */}
            <g data-cleo="look">
              <g data-cleo="blink" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                <Eyes variant={spec.eyes} />
              </g>
            </g>

            <Brows variant={spec.brows} />
            <Mouth variant={spec.mouth} gesture={gesture?.mouth} live={live} />
            <Extras variant={spec.extras} gesture={gesture?.extras} live={live} />
          </Breath>
        </g>

        {/* floating "Z"s — only mounted while asleep. Outside the lean/breath
            groups so they hover steadily instead of swaying with her; inside
            `scope` so useCleoMotion can drive them. We must NOT set opacity in
            React here: the sleep loop animates opacity imperatively, and a
            React-controlled opacity would get re-applied on any parent re-render,
            pinning it and hiding the Z's. Mounting only when asleep keeps them
            hidden the rest of the time without React owning their opacity. */}
        {asleep && (
          <g data-cleo="zzz" style={{ transformBox: "view-box", transformOrigin: "74px 32px" }}>
            <SleepMarks />
          </g>
        )}
      </g>
    </svg>
  );
}
