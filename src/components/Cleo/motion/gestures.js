// ─── Cleo motion — gesture map ──────────────────────────────────────────────
// Which idle gesture (if any) each mood plays, resolved in ../index.jsx and
// handed to the dumb part renderers. Keyed by mood (not arm variant) so a mood
// can pick both a pose (../parts/Arms.jsx) and the motion that animates it.
//
// `arms.left` / `arms.right` target Cleo's own left/right arm (viewer-left has
// the lower x) with { className, origin:[x,y] } — the limb rotates about the
// shoulder pivot `origin` (100×100 viewBox units). `mouth` / `extras` are classes
// applied to the matching Mouth / Extras parts (e.g. surprised opens its mouth).

export const MOOD_GESTURES = {
  // saluda: el brazo izq. sube desde abajo, saluda y vuelve a bajar; el der.
  // queda quieto y simétrico, así en reposo las dos manos se ven iguales abajo
  happy: { arms: { left: { className: "cleo-arm-wave", origin: [28, 62] } } },
  // celebra — pequeño shake en ambos brazos arriba
  cheer: {
    arms: {
      left: { className: "cleo-arm-cheer", origin: [28, 62] },
      right: { className: "cleo-arm-cheer", origin: [72, 62] },
    },
  },
  // piensa — se acaricia el mentón de lado a lado + las burbujas flotan
  thinking: {
    arms: { right: { className: "cleo-arm-think", origin: [74, 64] } },
    extras: "cleo-think-dots",
  },
  // anima — el pulgar arriba hace un pequeño "pump"
  encouraging: { arms: { right: { className: "cleo-arm-pump", origin: [73, 60] } } },
  // molesta — tap impaciente sobre la barriga
  annoyed: { arms: { right: { className: "cleo-arm-tap", origin: [68, 71] } } },
  // triste — sin gesto: ambos brazos cuelgan quietos abajo, sólo la lágrima
  // (eyes "sad" siguen parpadeando). Se ve triste, no se mueve ningún brazo.
  // sorprendida — ambos brazos (detrás) suben de golpe (susto), aguantan y bajan;
  // espejados izq./der., en sync con la boca que se abre
  surprised: {
    arms: {
      left: { className: "cleo-arm-gasp", origin: [28, 62] },
      right: { className: "cleo-arm-gasp-r", origin: [72, 62] },
    },
    mouth: "cleo-mouth-gasp",
  },
};
