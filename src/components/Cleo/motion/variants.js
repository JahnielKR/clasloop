// ─── Cleo motion — gesture variants ─────────────────────────────────────────
// The per-mood idle limb/face gestures, expressed as `motion` (motion/react)
// keyframe data instead of CSS @keyframes. Each entry is `{ animate, transition }`
// ready to spread onto a motion.* element. The numbers mirror the original CSS
// cadence: each gesture rests for most of its cycle and animates in a short burst,
// so Cleo feels alive without ever fidgeting. Rotations pivot at the shoulder —
// the transform-origin is set per-limb in ../parts/Arms.jsx (view-box units), so
// here we only describe the motion, never the pivot.

const loop = (extra) => ({ repeat: Infinity, ease: "easeInOut", ...extra });

export const GESTURE_VARIANTS = {
  // saluda UNA sola vez al aparecer (no en bucle): sube a la altura de la cabeza
  // (~70°; con un solo segmento rígido un giro mayor se ve "imposible"), ondea un
  // par de veces y baja el brazo. Sin repeat → se reproduce al montar y luego
  // reposa, así Cleo deja de saludar y sólo respira/parpadea/mira a los lados.
  wave: {
    animate: { rotate: [0, 70, 60, 70, 62, 0] },
    transition: { duration: 1.8, times: [0, 0.22, 0.42, 0.6, 0.8, 1], ease: "easeInOut" },
  },
  // celebra — pequeño shake de los brazos arriba
  cheer: {
    animate: { rotate: [-5, 5, -5] },
    transition: loop({ duration: 1.1 }),
  },
  // piensa — se acaricia el mentón de lado a lado
  think: {
    animate: { rotate: [6, -6, 6] },
    transition: loop({ duration: 2.8 }),
  },
  // anima — el pulgar arriba hace un pequeño "pump"
  pump: {
    animate: { rotate: [0, 0, -8, 0, 0] },
    transition: loop({ duration: 2.2, times: [0, 0.52, 0.7, 0.85, 1] }),
  },
  // molesta — tap impaciente sobre la barriga
  tap: {
    animate: { rotate: [0, 0, -3.5, 0, 0] },
    transition: loop({ duration: 1.9, times: [0, 0.8, 0.88, 0.94, 1] }),
  },
  // sorprendida — ambos brazos suben de golpe (susto), aguantan y bajan (espejados)
  gasp: {
    animate: { rotate: [0, 0, 108, 108, 0, 0] },
    transition: loop({ duration: 3.6, times: [0, 0.18, 0.36, 0.72, 0.9, 1] }),
  },
  gaspR: {
    animate: { rotate: [0, 0, -108, -108, 0, 0] },
    transition: loop({ duration: 3.6, times: [0, 0.18, 0.36, 0.72, 0.9, 1] }),
  },
  // sorprendida — la boca se abre (O) en sync con el susto
  mouthGasp: {
    animate: { scaleY: [0.16, 0.16, 1, 1, 0.16, 0.16] },
    transition: loop({ duration: 3.6, times: [0, 0.18, 0.34, 0.72, 0.88, 1] }),
  },
  // piensa — las burbujas flotan y se desvanecen (con delay escalonado por punto)
  dots: {
    animate: { opacity: [0.25, 0.95, 0.25], y: [1.5, -1.5, 1.5] },
    transition: loop({ duration: 1.5 }),
  },
};

export const GESTURE_NAMES = Object.keys(GESTURE_VARIANTS);
