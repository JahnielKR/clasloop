// ─── Cleo — expression map ──────────────────────────────────────────────────
// Each emotion is a recipe of which face/limb parts to draw (see ./parts/).
// They all share the same body, crown and signature so Cleo stays recognisably
// herself; only eyes, brows, mouth, cheek strength, arms and a small extra
// change. `happy` reproduces the original static look exactly, so any site that
// doesn't pass an `expression` is visually unchanged.
//
//   <Cleo expression="sad" />

export const EXPRESSIONS = {
  // feliz — the default, identical to the original Cleo
  happy:       { eyes: "wide",      brows: null,        mouth: "w",         cheeks: 0.7,  arms: "down",    extras: null },
  // alegre / celebra — arms up, big grin, sparkles
  cheer:       { eyes: "arc",       brows: null,        mouth: "openSmile", cheeks: 0.8,  arms: "up",      extras: "sparkles" },
  // triste — droopy lids, worried brows, a tear she wipes away
  sad:         { eyes: "sad",       brows: "worried",   mouth: "frown",     cheeks: 0.25, arms: "down",    extras: "tear" },
  // molesta — squint, angry brows, crossed arms, a sweat tick
  annoyed:     { eyes: "narrow",    brows: "angry",     mouth: "flat",      cheeks: 0.25, arms: "crossed", extras: "sweat" },
  // pensando — curious brow, hand to chin, thought dots (for the chat loading state)
  thinking:    { eyes: "wide",      brows: "oneRaised", mouth: "hmm",       cheeks: 0.4,  arms: "chin",    extras: "thoughtDots" },
  // sorprendida — wide round eyes, raised brows, mouth opens, both hands fly up
  surprised:   { eyes: "surprised", brows: "raised",    mouth: "o",         cheeks: 0.5,  arms: "down",    extras: null },
  // animando — a wink + confident grin + thumbs-up
  encouraging: { eyes: "wink",      brows: null,        mouth: "grin",      cheeks: 0.7,  arms: "point",   extras: null },
};

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);
