// ─── Cleo — Clasloop's official mascot ─────────────────────────────────────
// A friendly, self-contained character: a soft blue body, a gold 3-point crown,
// big eyes, blush cheeks and her signature smile. Flat fills + one outline
// weight, crisp at any size, centered in a 100×100 viewBox so she drops in
// anywhere. Height scales 1:1 with `size`.
//
// She is expression-driven: the body, crown, shadow and highlight are constant;
// the eyes, brows, mouth, cheeks, arms and a small extra change per `expression`
// (recipes in ./expressions.js, drawn by ./parts/*). The default `happy` is the
// original look, so existing callers are unchanged.
//
// Usage:
//   <Cleo />                          // 96px, happy (default)
//   <Cleo size={120} expression="cheer" />
//   <Cleo expression="thinking" />    // reacts to context
//   <Cleo expression="sad" animate={false} />  // static (e.g. rasterized OG)
//
// Motion (opt-in via `animate`, default on): a subtle auto-blink, a soft "pop"
// when the expression changes at runtime (never on first mount, so it won't
// fight a container's entrance animation), and per-mood idle limb gestures — she
// actually waves, taps her chin while thinking, etc. (the ./motion library). All
// disabled under prefers-reduced-motion (the face still changes; only motion stops).
import { useId, useState, useEffect, useRef } from "react";
import { Eyes, Brows, Mouth, Arms, Extras } from "./parts";
import { EXPRESSIONS } from "./expressions";
import { buildCleoCSS, MOOD_GESTURES } from "./motion";

// Eyes that read as "open" — only these blink.
const BLINK_EYES = new Set(["wide", "surprised", "sad", "wink"]);

export default function Cleo({ size = 96, expression = "happy", animate = true, className = "", style = {}, title = "Cleo" }) {
  // Unique ids per instance so multiple Cleos don't share/clip a def.
  const uid = useId().replace(/:/g, "");
  const bodyGrad = `cleo-body-${uid}`;
  const crownGrad = `cleo-crown-${uid}`;

  const spec = EXPRESSIONS[expression] || EXPRESSIONS.happy;
  const canBlink = animate && BLINK_EYES.has(spec.eyes);
  // Idle limb gesture for this mood (undefined → arms stay static, e.g. surprised
  // or any animate={false} instance). See ./motion.
  const gesture = animate ? MOOD_GESTURES[expression] : undefined;

  // A one-shot "pop" when the expression changes — skipped on first mount.
  const mounted = useRef(false);
  const [popping, setPopping] = useState(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (!animate) return;
    setPopping(true);
    const id = setTimeout(() => setPopping(false), 460);
    return () => clearTimeout(id);
  }, [expression, animate]);

  const css = buildCleoCSS(uid);

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
      {animate && <style>{css}</style>}
      <defs>
        <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9AD6F7" />
          <stop offset="1" stopColor="#5BA8DE" />
        </linearGradient>
        <linearGradient id={crownGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD968" />
          <stop offset="1" stopColor="#F4B53C" />
        </linearGradient>
      </defs>

      {/* soft ground shadow (outside the pop group — stays put) */}
      <ellipse cx="50" cy="90" rx="24" ry="4.5" fill="#20425E" opacity="0.12" />

      <g className={popping ? `cleo-pop-${uid}` : ""}>
        {/* arms behind the body */}
        <Arms variant={spec.arms} gesture={gesture?.arms} layer="back" />

        {/* crown (brand signature) */}
        <g>
          <path d="M35 33 L41 23 L50 30 L59 23 L65 33 Z" fill={`url(#${crownGrad})`} stroke="#20425E" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="41" cy="22" r="2.2" fill="#FFE8A3" stroke="#20425E" strokeWidth="1.4" />
          <circle cx="59" cy="22" r="2.2" fill="#FFE8A3" stroke="#20425E" strokeWidth="1.4" />
          <circle cx="50" cy="29" r="2.2" fill="#FFE8A3" stroke="#20425E" strokeWidth="1.4" />
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

        {/* arms in front of the body (folded, hands on face, chin, wiping…) */}
        <Arms variant={spec.arms} gesture={gesture?.arms} layer="front" />

        {/* cheeks (strength varies by mood) */}
        {spec.cheeks > 0 && (
          <>
            <ellipse cx="32" cy="64" rx="6" ry="4" fill="#FF9DBE" opacity={spec.cheeks} />
            <ellipse cx="68" cy="64" rx="6" ry="4" fill="#FF9DBE" opacity={spec.cheeks} />
          </>
        )}

        {/* eyes (blink when open) */}
        <g className={canBlink ? `cleo-eyes-${uid}` : ""}>
          <Eyes variant={spec.eyes} />
        </g>

        <Brows variant={spec.brows} />
        <Mouth variant={spec.mouth} gesture={gesture?.mouth} />
        <Extras variant={spec.extras} gesture={gesture?.extras} />
      </g>
    </svg>
  );
}
