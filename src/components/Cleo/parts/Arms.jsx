// ─── Cleo — arms ────────────────────────────────────────────────────────────
// Each pose is a list of limbs. A limb declares its `side` (so the motion library
// can target it) and `layer` (`back` = behind the body, `front` = over the
// body/face). index.jsx renders Arms once per layer, so one pose can tuck an arm
// behind the body and rest another on the face (e.g. thinking's chin hand).
//
// Every limb is a single segment (a stroked path + a round hand) that animates by
// rotating around a shoulder pivot (gesture: {className, origin}). Gestures that
// reach "up to the face" (sad's wipe, surprised's gasp) are simple arcs from a
// limb that hangs down BEHIND the body — they sweep past the face and back, they
// don't fold onto it.

import { ARM, HAND, EDGE } from "./constants";

const SEG = { fill: "none", stroke: ARM, strokeWidth: 6, strokeLinecap: "round" };

const POSES = {
  // arms hanging down at the sides, behind the body — happy waves one, sad arcs
  // one up to wipe, surprised arcs both up in shock (all via ../motion gestures).
  down: [
    { side: "left", layer: "back", d: "M28 62 Q19 71 17 81", hand: [17, 81] },
    { side: "right", layer: "back", d: "M72 62 Q81 71 83 81", hand: [83, 81] },
  ],
  // cheer — both arms up
  up: [
    { side: "left", layer: "back", d: "M28 62 Q18 50 14 39", hand: [13, 38] },
    { side: "right", layer: "back", d: "M72 62 Q82 50 86 39", hand: [87, 38] },
  ],
  // encouraging — left rests low, right is a thumbs-up
  point: [
    { side: "left", layer: "back", d: "M27 64 Q16 67 13 75", hand: [12, 76] },
    { side: "right", layer: "back", d: "M73 60 Q86 55 89 44", hand: [90, 43] },
  ],
  // annoyed — folded low on the belly, in front
  crossed: [
    { side: "left", layer: "front", d: "M32 71 L57 79", hand: [59, 79] },
    { side: "right", layer: "front", d: "M68 71 L43 79", hand: [41, 79] },
  ],
  // thinking — left arm tucked behind the body, right hand resting on the chin
  chin: [
    { side: "left", layer: "back", d: "M30 66 Q22 73 19 81", hand: [18, 82] },
    { side: "right", layer: "front", d: "M74 64 Q82 72 61 72", hand: [58, 73] },
  ],
};

function Limb({ limb, gesture }) {
  const [hx, hy] = limb.hand;
  const wrap = gesture
    ? { className: gesture.className, style: { transformBox: "view-box", transformOrigin: `${gesture.origin[0]}px ${gesture.origin[1]}px` } }
    : null;
  return (
    <g {...wrap}>
      <path d={limb.d} {...SEG} />
      <circle cx={hx} cy={hy} r="5" fill={HAND} stroke={EDGE} strokeWidth="2.5" />
    </g>
  );
}

export function Arms({ variant, gesture, layer }) {
  const limbs = POSES[variant] || POSES.down;
  return (
    <>
      {limbs
        .filter((l) => l.layer === layer)
        .map((l) => (
          <Limb key={l.side} limb={l} gesture={gesture?.[l.side]} />
        ))}
    </>
  );
}
