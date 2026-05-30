// ─── Clasloop Design Tokens — barrel ─────────────────────────────────────
// Single source of truth for the design language, split into focused modules
// so no single file becomes a god file:
//   ./color      — theme-aware color (C, MONO) + THEME_CSS
//   ./theme      — runtime helpers (get/apply/setStoredTheme, ensureThemeCss)
//   ./scale      — spacing (SPACE/SP), radius (RADIUS/R), shadow (SHADOW/SH)
//   ./typography — type scale (TYPE)
//   ./motion     — durations + easings (MOTION)
//
// Existing imports keep working unchanged — `import { C } from
// "../components/tokens"` resolves here (tokens/index.js).

export { THEME_CSS, C, MONO, withAlpha } from "./color";
export { getStoredTheme, applyTheme, setStoredTheme, ensureThemeCss } from "./theme";
export { SPACE, SP, RADIUS, R, SHADOW, SH, SCRIM } from "./scale";
export { TYPE } from "./typography";
export { MOTION } from "./motion";
