// ─── Cleo motion — gesture keyframes ────────────────────────────────────────
// Static, instance-independent CSS for Cleo's idle limb gestures: the @keyframes
// plus the class→animation bindings that ./parts/Arms.jsx and ./parts/Extras.jsx
// attach to. Names are stable (the definitions are identical for every Cleo, so
// sharing them across instances is safe). The per-instance blink/pop and the
// prefers-reduced-motion guard are assembled in ./stylesheet.js.
//
// Cadence is deliberately "blink-like": each gesture spends most of its cycle at
// rest and animates in a short burst, so Cleo feels alive without ever fidgeting.
// Rotations pivot at the shoulder — the transform-origin is set per-limb in
// Arms.jsx (transform-box:view-box, in 100×100 viewBox units), so here we only
// describe the motion, never the pivot.

export const GESTURE_CSS = `
  @keyframes cleo-wave{0%,14%{transform:rotate(0deg)}22%{transform:rotate(105deg)}28%{transform:rotate(95deg)}34%{transform:rotate(113deg)}40%{transform:rotate(98deg)}46%{transform:rotate(108deg)}54%{transform:rotate(102deg)}62%,100%{transform:rotate(0deg)}}
  @keyframes cleo-cheer{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
  @keyframes cleo-think{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-6deg)}}
  @keyframes cleo-pump{0%,52%,100%{transform:rotate(0)}70%{transform:rotate(-8deg)}85%{transform:rotate(0)}}
  @keyframes cleo-tap{0%,80%,100%{transform:rotate(0)}88%{transform:rotate(-3.5deg)}94%{transform:rotate(0)}}
  /* surprised — both arms fly up (shock), hold, and drop; mirrored left/right */
  @keyframes cleo-gasp{0%,18%{transform:rotate(0deg)}36%,72%{transform:rotate(108deg)}90%,100%{transform:rotate(0deg)}}
  @keyframes cleo-gasp-r{0%,18%{transform:rotate(0deg)}36%,72%{transform:rotate(-108deg)}90%,100%{transform:rotate(0deg)}}
  /* surprised — the mouth opens (O) in sync with the gasp, closed line at rest */
  @keyframes cleo-mouth-gasp{0%,18%{transform:scaleY(.16)}34%,72%{transform:scaleY(1)}88%,100%{transform:scaleY(.16)}}
  @keyframes cleo-dots{0%,100%{opacity:.25;transform:translateY(1.5px)}50%{opacity:.95;transform:translateY(-1.5px)}}
  .cleo-arm-wave{animation:cleo-wave 7s ease-in-out infinite}
  .cleo-arm-cheer{animation:cleo-cheer 1.1s ease-in-out infinite}
  .cleo-arm-think{animation:cleo-think 2.8s ease-in-out infinite}
  .cleo-arm-pump{animation:cleo-pump 2.2s ease-in-out infinite}
  .cleo-arm-tap{animation:cleo-tap 1.9s ease-in-out infinite}
  .cleo-arm-gasp{animation:cleo-gasp 3.6s ease-in-out infinite}
  .cleo-arm-gasp-r{animation:cleo-gasp-r 3.6s ease-in-out infinite}
  .cleo-mouth-gasp{transform-box:view-box;transform-origin:50px 70px;animation:cleo-mouth-gasp 3.6s ease-in-out infinite}
  .cleo-think-dots{transform-box:fill-box;animation:cleo-dots 1.5s ease-in-out infinite}
`;

// Class names the reduced-motion guard must silence (kept here so the list lives
// next to the definitions it mirrors).
export const GESTURE_CLASSES = [
  "cleo-arm-wave",
  "cleo-arm-cheer",
  "cleo-arm-think",
  "cleo-arm-pump",
  "cleo-arm-tap",
  "cleo-arm-gasp",
  "cleo-arm-gasp-r",
  "cleo-mouth-gasp",
  "cleo-think-dots",
];
