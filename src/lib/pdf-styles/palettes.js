// ─── pdf-styles/palettes ────────────────────────────────────────────────
//
// PR 32: Color palette system for PDF styles.
//
// Each palette is a pair of colors: `question` (the accent for selection
// section, banners, badges) and `answer` (the accent for answer key,
// secondary accents). Both are stored as [R, G, B] tuples in 0-255 range.
//
// Why two colors instead of one:
//   - Teachers can visually distinguish exam from answer key at a glance.
//   - Some styles (modern, framed) use one color for "Selection" and
//     another for "Written response" / answer key — a single accent
//     would collapse that distinction.
//   - More variety per palette without giving teachers a free color
//     picker (which produces bad combos).
//
// Styles consume these via opts.palette in renderExam/renderAnswerKey.
// Each style maps the palette into its specific COLOR fields:
//
//   Classic    → question = double rule + circles; answer = ans key eyebrow
//   Modern     → question = teal slot; answer = coral slot
//   Editorial  → question = thick rule + bullets; answer = ans key accent
//   Framed     → question = frame + accents; answer = ans key badges
//
// Default palette ("default") preserves the original look of each style.
// All other palettes deliberately deviate.

export const PALETTES = [
  {
    id: "default",
    nameEn: "Default",
    nameEs: "Original",
    nameKo: "기본",
    question: null,   // null = use the style's built-in defaults
    answer: null,
    // preview swatch for the modal — gray to match "no color override"
    previewQuestion: [120, 120, 120],
    previewAnswer: [180, 180, 180],
  },
  {
    id: "ocean",
    nameEn: "Ocean",
    nameEs: "Océano",
    nameKo: "오션",
    question: [15, 123, 108],     // teal (matches modern's current default)
    answer: [70, 110, 160],       // slate blue
    previewQuestion: [15, 123, 108],
    previewAnswer: [70, 110, 160],
  },
  {
    id: "forest",
    nameEn: "Forest",
    nameEs: "Bosque",
    nameKo: "포레스트",
    question: [40, 120, 70],      // emerald
    answer: [120, 130, 60],       // olive
    previewQuestion: [40, 120, 70],
    previewAnswer: [120, 130, 60],
  },
  {
    id: "sunset",
    nameEn: "Sunset",
    nameEs: "Atardecer",
    nameKo: "선셋",
    question: [220, 100, 80],     // coral
    answer: [150, 100, 80],       // warm brown-gray
    previewQuestion: [220, 100, 80],
    previewAnswer: [150, 100, 80],
  },
  {
    id: "berry",
    nameEn: "Berry",
    nameEs: "Frutos",
    nameKo: "베리",
    question: [180, 50, 110],     // magenta
    answer: [100, 60, 110],       // plum
    previewQuestion: [180, 50, 110],
    previewAnswer: [100, 60, 110],
  },
  {
    id: "sky",
    nameEn: "Sky",
    nameEs: "Cielo",
    nameKo: "스카이",
    question: [60, 130, 200],     // sky blue
    answer: [40, 60, 110],        // navy
    previewQuestion: [60, 130, 200],
    previewAnswer: [40, 60, 110],
  },
  {
    id: "earth",
    nameEn: "Earth",
    nameEs: "Tierra",
    nameKo: "어스",
    question: [180, 100, 70],     // terracotta
    answer: [110, 80, 60],        // brown
    previewQuestion: [180, 100, 70],
    previewAnswer: [110, 80, 60],
  },
  {
    id: "lavender",
    nameEn: "Lavender",
    nameEs: "Lavanda",
    nameKo: "라벤더",
    question: [130, 90, 180],     // purple
    answer: [170, 150, 200],      // light lavender
    previewQuestion: [130, 90, 180],
    previewAnswer: [170, 150, 200],
  },
];

export const DEFAULT_PALETTE_ID = "default";

export function getPalette(id) {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

// ─── Color manipulation helpers ─────────────────────────────────────────
// Several styles need lighter "soft" variants of a base color (e.g.
// modern's pill backgrounds are a faded version of the accent). These
// helpers derive variants from the palette base colors so styles don't
// have to ship a full color manifest.

// Mix toward white. amount=0 = original color, amount=1 = pure white.
export function lighten(rgb, amount) {
  if (!rgb) return [240, 240, 240];
  const a = Math.max(0, Math.min(1, amount));
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * a),
    Math.round(rgb[1] + (255 - rgb[1]) * a),
    Math.round(rgb[2] + (255 - rgb[2]) * a),
  ];
}

// Mix toward black. amount=0 = original, amount=1 = pure black.
export function darken(rgb, amount) {
  if (!rgb) return [40, 40, 40];
  const a = Math.max(0, Math.min(1, amount));
  return [
    Math.round(rgb[0] * (1 - a)),
    Math.round(rgb[1] * (1 - a)),
    Math.round(rgb[2] * (1 - a)),
  ];
}

// Resolve a palette into the full color set a style needs. The style
// passes in its OWN defaults; any field where the palette has a value
// overrides. Result has the same shape as the style's COLOR constant.
//
// This is the only function a style needs to call to integrate palette
// support. Example in modern.js:
//
//   import { resolvePaletteToModern } from "./palettes";
//   const COLOR = resolvePaletteToModern(palette, MODERN_DEFAULTS);
//   // then use COLOR.teal, COLOR.coral, etc. as before.
//
// Each style gets its own resolver fn below so the mapping is explicit.

export function resolvePaletteToClassic(palette, defaults) {
  if (!palette || palette.id === "default" || !palette.question) {
    return defaults;
  }
  return {
    ...defaults,
    // Question color drives the double rule + question number circle.
    // Use the palette question color directly. Defaults are black/gray so
    // there's no need to mix.
    accent: palette.question,
    accentSoft: lighten(palette.question, 0.85),
    // Answer color used in answer key eyebrow.
    answerAccent: palette.answer || palette.question,
  };
}

export function resolvePaletteToModern(palette, defaults) {
  if (!palette || palette.id === "default" || !palette.question) {
    return defaults;
  }
  return {
    ...defaults,
    // Modern's signature is teal+coral. Map question→teal slot,
    // answer→coral slot. The "soft" variants for pill backgrounds
    // get derived by mixing toward white.
    teal: palette.question,
    tealSoft: lighten(palette.question, 0.86),
    coral: palette.answer || palette.question,
    coralSoft: lighten(palette.answer || palette.question, 0.86),
    coralLight: lighten(palette.answer || palette.question, 0.7),
  };
}

export function resolvePaletteToEditorial(palette, defaults) {
  if (!palette || palette.id === "default" || !palette.question) {
    return defaults;
  }
  return {
    ...defaults,
    // Editorial is mostly grayscale + thick black rule. Apply color
    // SUBTLY: only on the thick rule, the square bullet, and the
    // answer-key eyebrow. Keep monospace numbers black.
    accent: palette.question,
    answerAccent: palette.answer || palette.question,
  };
}

export function resolvePaletteToFramed(palette, defaults) {
  if (!palette || palette.id === "default" || !palette.question) {
    return defaults;
  }
  return {
    ...defaults,
    // Framed is grayscale by default. Apply palette color to: frame
    // lines, accent rule, header diamond, section rules, number badge
    // borders, MCQ bracket letters, TF square borders.
    frame: palette.question,
    ornament: palette.question,
    accent: palette.question,
    answerAccent: palette.answer || palette.question,
  };
}
