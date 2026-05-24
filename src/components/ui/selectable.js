// ─── Uniform "selected" recipe ───────────────────────────────────────────
// ONE way to say "this is the chosen one of N". Option cards (theme/type
// pickers), segmented chips, and underline tabs all draw their selected state
// from these helpers, so "selected" reads identically across the app — the
// design direction asks for hover/focus/active/selected to behave the same
// everywhere (Sheets/TradingView predictability).
//
// MOTION + reduced-motion: pair every selectable element with
// `className="cl-selectable"` (defined in index.css). The color change is
// returned here (inline), but the *transition* lives in CSS on purpose — an
// inline `transition` would override, and therefore defeat, the global
// `prefers-reduced-motion` switch. Most selectables are <button>s, which
// already inherit the GPU-safe button transition; the class makes div-based
// selectables behave identically and stay reduced-motion-safe.
//
// ACCENT: defaults to the brand accent + its theme-aware soft tint
// (C.accentSoft). For a custom accent (e.g. a class color, which has no
// theme-aware soft token) pass a matching tint built with hex alpha:
//   selectableCard(isSel, { accent: cls.color, accentSoft: cls.color + "1A" })

import { C } from "../tokens";

// Option card / tile — rich inner content, so the *frame* signals selection
// and the inner text keeps its own colors. A constant 1.5px border means
// selecting changes color only, never width, so the layout never reflows by a
// pixel as the choice moves.
export function selectableCard(selected, { accent = C.accent, accentSoft = C.accentSoft } = {}) {
  return {
    background: selected ? accentSoft : C.bg,
    border: `1.5px solid ${selected ? accent : C.border}`,
  };
}

// Segmented chip / filter pill — the whole control tints (bg + border + label).
export function selectableChip(selected, { accent = C.accent, accentSoft = C.accentSoft } = {}) {
  return {
    background: selected ? accentSoft : "transparent",
    border: `1px solid ${selected ? accent : C.border}`,
    color: selected ? accent : C.textSecondary,
  };
}

// Underline tab — transparent surface; a 2px accent rule + an accent label
// mark the active tab. The border is always 2px (transparent when idle) so the
// tab row never shifts as selection moves.
export function selectableTab(selected, { accent = C.accent } = {}) {
  return {
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${selected ? accent : "transparent"}`,
    color: selected ? accent : C.textSecondary,
  };
}

// The small ✓ badge some pickers float in the corner of the selected card.
// Returns the badge frame; the caller sets size/position and renders "✓".
export function selectedCheckStyle({ accent = C.accent } = {}) {
  return {
    display: "grid",
    placeItems: "center",
    background: accent,
    color: "#fff",
    borderRadius: "50%",
  };
}
