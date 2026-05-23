// ─── Cleo — face & limb parts ──────────────────────────────────────────────
// The variable SVG pieces that change per expression. The constant base (body,
// crown, shadow, highlight, gradients) lives in ./index.jsx; here we only draw
// what an emotion swaps: eyes, brows, mouth, arms and small extras (a tear, a
// sweat drop, sparkles, thought dots). One consistent outline weight + the same
// palette as the body so every pose reads as the same character.
//
// All coordinates are in Cleo's 100×100 viewBox. Eyes sit at y≈56, mouth ≈68,
// brows ≈47, so a pose only needs to pick a variant — see ./expressions.js.

const OUTLINE = "#1F3149";   // face features
const EDGE = "#20425E";      // body/limb outline (matches the body stroke)
const ARM = "#4E97CE";
const HAND = "#9AD6F7";

// ── Eyes ──────────────────────────────────────────────────────────────────
export function Eyes({ variant }) {
  switch (variant) {
    case "arc": // happy closed eyes ^^ (cheer)
      return (
        <>
          <path d="M34 57 Q40 50 46 57" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
          <path d="M54 57 Q60 50 66 57" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "narrow": // unamused squint (annoyed)
      return (
        <>
          <line x1="35" y1="54.5" x2="45.5" y2="54.5" stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="54.5" y1="54.5" x2="65" y2="54.5" stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="40" cy="57.5" rx="4.6" ry="2.6" fill={OUTLINE} />
          <ellipse cx="60" cy="57.5" rx="4.6" ry="2.6" fill={OUTLINE} />
        </>
      );
    case "sad": // lower-lidded, glossy (sad)
      return (
        <>
          <ellipse cx="40" cy="58" rx="5" ry="6" fill={OUTLINE} />
          <ellipse cx="60" cy="58" rx="5" ry="6" fill={OUTLINE} />
          <path d="M34.5 54 Q40 52 45 55" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M55 55 Q60 52 65.5 54" fill="none" stroke={OUTLINE} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="42" cy="55.5" r="2.2" fill="#fff" />
          <circle cx="62" cy="55.5" r="2.2" fill="#fff" />
        </>
      );
    case "surprised": // wide round (surprised)
      return (
        <>
          <circle cx="40" cy="56" r="6.2" fill={OUTLINE} />
          <circle cx="60" cy="56" r="6.2" fill={OUTLINE} />
          <circle cx="42.2" cy="53.5" r="2.1" fill="#fff" />
          <circle cx="62.2" cy="53.5" r="2.1" fill="#fff" />
        </>
      );
    case "wink": // one eye winking (encouraging)
      return (
        <>
          <ellipse cx="40" cy="56" rx="5.4" ry="7" fill={OUTLINE} />
          <circle cx="42" cy="53" r="2" fill="#fff" />
          <circle cx="38.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />
          <path d="M54 58 Q60 52 66 58" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "wide": // big bright eyes (happy / thinking) — the original look
    default:
      return (
        <>
          <ellipse cx="40" cy="56" rx="5.4" ry="7" fill={OUTLINE} />
          <ellipse cx="60" cy="56" rx="5.4" ry="7" fill={OUTLINE} />
          <circle cx="42" cy="53" r="2" fill="#fff" />
          <circle cx="62" cy="53" r="2" fill="#fff" />
          <circle cx="38.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />
          <circle cx="58.5" cy="58.5" r="1" fill="#fff" opacity="0.8" />
        </>
      );
  }
}

// ── Brows (none on the default happy face) ──────────────────────────────────
export function Brows({ variant }) {
  if (!variant) return null;
  const s = { fill: "none", stroke: OUTLINE, strokeWidth: 2.4, strokeLinecap: "round" };
  switch (variant) {
    case "worried": // inner ends up (sad)
      return (
        <>
          <path d="M34 48 Q39 45.5 44 47.5" {...s} />
          <path d="M56 47.5 Q61 45.5 66 48" {...s} />
        </>
      );
    case "angry": // inner ends down, a V (annoyed)
      return (
        <>
          <path d="M34 45.5 L44 49" {...s} />
          <path d="M56 49 L66 45.5" {...s} />
        </>
      );
    case "raised": // both high + arched (surprised)
      return (
        <>
          <path d="M35 45 Q40 42.5 45 45" {...s} />
          <path d="M55 45 Q60 42.5 65 45" {...s} />
        </>
      );
    case "oneRaised": // right brow up, curious (thinking)
      return (
        <>
          <path d="M35 48 Q40 47 44 48" {...s} />
          <path d="M55 46 Q60 43.5 66 46.5" {...s} />
        </>
      );
    default:
      return null;
  }
}

// ── Mouth ───────────────────────────────────────────────────────────────────
export function Mouth({ variant }) {
  const s = { fill: "none", stroke: OUTLINE, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (variant) {
    case "openSmile": // big grin + tongue (cheer)
      return (
        <>
          <path d="M43 66 Q50 79 57 66 Z" fill={OUTLINE} />
          <path d="M46.5 72.5 Q50 75 53.5 72.5" fill="#FF8FB3" stroke="none" />
        </>
      );
    case "frown": // gentle downturn (sad)
      return <path d="M44 71.5 Q50 66.5 56 71.5" {...s} />;
    case "flat": // small pursed pout (annoyed)
      return <path d="M45 69 Q50 70.5 55 68.8" {...s} />;
    case "o": // open O (surprised)
      return <ellipse cx="50" cy="70" rx="3.8" ry="4.8" fill={OUTLINE} />;
    case "hmm": // small asymmetric line (thinking)
      return <path d="M46 69.5 Q50 68.2 54 70" {...s} />;
    case "grin": // confident smile (encouraging)
      return <path d="M43 67 Q50 74.5 57 67.5" {...s} strokeWidth="2.6" />;
    case "w": // the signature "w" (happy / default)
    default:
      return <path d="M44 67 Q47 71.5 50 68 Q53 71.5 56 67" {...s} />;
  }
}

// ── Arms ────────────────────────────────────────────────────────────────────
// "crossed" reads as folded in front of the body, so it must render AFTER the
// body — index.jsx uses armsInFront() to place it on the right layer.
export const armsInFront = (v) => v === "crossed";

export function Arms({ variant }) {
  const a = { fill: "none", stroke: ARM, strokeWidth: 6, strokeLinecap: "round" };
  const hand = (cx, cy) => <circle cx={cx} cy={cy} r="5" fill={HAND} stroke={EDGE} strokeWidth="2.5" />;
  switch (variant) {
    case "up": // both arms up (cheer)
      return (
        <>
          <path d="M28 62 Q18 50 14 39" {...a} />{hand(13, 38)}
          <path d="M72 62 Q82 50 86 39" {...a} />{hand(87, 38)}
        </>
      );
    case "down": // arms drooped (sad)
      return (
        <>
          <path d="M30 66 Q23 75 19 82" {...a} />{hand(18, 83)}
          <path d="M70 66 Q77 75 81 82" {...a} />{hand(82, 83)}
        </>
      );
    case "crossed": // folded low on the belly, below the mouth (annoyed)
      return (
        <>
          <path d="M32 71 L57 79" {...a} />{hand(59, 79)}
          <path d="M68 71 L43 79" {...a} />{hand(41, 79)}
        </>
      );
    case "point": // one hand up like a thumbs-up, one resting (encouraging)
      return (
        <>
          <path d="M27 64 Q16 67 13 75" {...a} />{hand(12, 76)}
          <path d="M73 60 Q86 55 89 44" {...a} />{hand(90, 43)}
        </>
      );
    case "chin": // one hand to the chin (thinking)
      return (
        <>
          <path d="M30 66 Q22 73 19 81" {...a} />{hand(18, 82)}
          <path d="M74 64 Q82 72 61 72" {...a} />{hand(58, 73)}
        </>
      );
    case "wave": // left waves, right rests (happy / default)
    default:
      return (
        <>
          <path d="M27 60 Q15 56 12 46" {...a} />{hand(12, 45)}
          <path d="M73 64 Q85 66 88 74" {...a} />{hand(88, 75)}
        </>
      );
  }
}

// ── Extras ────────────────────────────────────────────────────────────────
function Sparkle({ x, y, s = 1 }) {
  return (
    <path
      d={`M${x} ${y - 5 * s} L${x + 1.4 * s} ${y - 1.4 * s} L${x + 5 * s} ${y} L${x + 1.4 * s} ${y + 1.4 * s} L${x} ${y + 5 * s} L${x - 1.4 * s} ${y + 1.4 * s} L${x - 5 * s} ${y} L${x - 1.4 * s} ${y - 1.4 * s} Z`}
      fill="#FFD968"
      stroke="#F4B53C"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
  );
}

export function Extras({ variant }) {
  switch (variant) {
    case "tear":
      return <path d="M63.5 60 Q66.5 64.5 63.5 67 Q60.5 64.5 63.5 60 Z" fill="#8FD0F5" stroke={ARM} strokeWidth="1.4" />;
    case "sweat":
      return <path d="M72 39 Q75 43.5 72 46 Q69 43.5 72 39 Z" fill="#8FD0F5" stroke={ARM} strokeWidth="1.4" />;
    case "sparkles":
      return (
        <>
          <Sparkle x={20} y={34} s={1} />
          <Sparkle x={82} y={40} s={0.8} />
        </>
      );
    case "thoughtDots":
      return (
        <>
          <circle cx="74" cy="42" r="2" fill={OUTLINE} opacity="0.85" />
          <circle cx="80" cy="35" r="2.6" fill={OUTLINE} opacity="0.85" />
          <circle cx="87" cy="29" r="3.2" fill={OUTLINE} opacity="0.85" />
        </>
      );
    default:
      return null;
  }
}
