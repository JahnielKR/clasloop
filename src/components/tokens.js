// ─── Clasloop Design Tokens ──────────────────────────────────────────────
// Shared color palette used across all pages. Pages that need additional
// domain-specific colors (e.g. yellow for community decks, pink for rare
// avatars) extend this with `{ ...C, yellow: "..." }` in their own module.
//
// Every key here is currently used by at least one page. Adding new keys
// is fine; removing them requires sweeping the codebase first.

export const C = {
  // Surfaces
  bg: "#FFFFFF",
  bgSoft: "#F7F7F5",

  // Brand
  accent: "#2383E2",
  accentSoft: "#E8F0FE",

  // Status colors (paired soft variants for backgrounds)
  green: "#0F7B6C",
  greenSoft: "#EEFBF5",
  orange: "#D9730D",
  orangeSoft: "#FFF3E0",
  red: "#E03E3E",
  redSoft: "#FDECEC",
  purple: "#6940A5",
  purpleSoft: "#F3EEFB",

  // Text scale
  text: "#191919",
  textSecondary: "#6B6B6B",
  textMuted: "#9B9B9B",

  // Misc
  border: "#E8E8E4",
  shadow: "0 1px 3px rgba(0,0,0,0.04)",
};

// Mono font stack — used for deck PINs, codes, code-like values.
export const MONO = "'JetBrains Mono', monospace";
