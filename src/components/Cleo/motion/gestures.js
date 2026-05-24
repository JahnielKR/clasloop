// ─── Cleo motion — gesture map ──────────────────────────────────────────────
// Which idle gesture (if any) each mood plays, resolved in ../index.jsx and handed
// to the dumb part renderers. Keyed by mood (not arm variant) so a mood can pick
// both a pose (../parts/Arms.jsx) and the motion that animates it.
//
// `arms.left` / `arms.right` target Cleo's own left/right arm (viewer-left has the
// lower x) with { variant, origin:[x,y] } — the limb rotates about the shoulder
// pivot `origin` (100×100 viewBox units); `variant` keys into ./variants.js.
// `mouth` / `extras` are variant keys applied to the matching Mouth / Extras parts.

export const MOOD_GESTURES = {
  // saluda — el brazo izq. sube, saluda y vuelve a bajar; el der. queda quieto
  happy: { arms: { left: { variant: "wave", origin: [28, 62] } } },
  // celebra — pequeño shake en ambos brazos arriba
  cheer: {
    arms: {
      left: { variant: "cheer", origin: [28, 62] },
      right: { variant: "cheer", origin: [72, 62] },
    },
  },
  // piensa — se acaricia el mentón + las burbujas flotan
  thinking: {
    arms: { right: { variant: "think", origin: [74, 64] } },
    extras: "dots",
  },
  // anima — el pulgar arriba hace un pequeño "pump"
  encouraging: { arms: { right: { variant: "pump", origin: [73, 60] } } },
  // molesta — tap impaciente sobre la barriga
  annoyed: { arms: { right: { variant: "tap", origin: [68, 71] } } },
  // triste — sin gesto: los brazos cuelgan quietos, sólo la lágrima
  // sorprendida — ambos brazos suben de golpe (espejados), en sync con la boca
  surprised: {
    arms: {
      left: { variant: "gasp", origin: [28, 62] },
      right: { variant: "gaspR", origin: [72, 62] },
    },
    mouth: "mouthGasp",
  },
};
