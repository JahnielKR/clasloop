// ─── Spacing / radius / shadow scale ─────────────────────────────────────
// The structural half of the design language (color lives in ./color.js).
// Before this, every padding/radius/shadow was a hand-tuned magic number, so
// surfaces drifted (radii 6/8/10/12/14/16/18; shadows ad-hoc). These give one
// rhythm so pages "rhyme".
//
// Plain JS constants (not CSS vars): they're identical in light/dark, so they
// don't need to be theme-reactive. Import and spread into inline styles:
//   import { SP, R, SH } from "../components/tokens";
//   style={{ padding: SP.lg, borderRadius: R.md, boxShadow: SH.md }}

// ── Spacing — TWO densities of the SAME system ──────────────────────────
// "comfortable" is the Notion-like default (create/read surfaces).
// "compact" is the TradingView/Sheets-like dense mode (data surfaces).
// Same steps, tighter values — Ola 2 wires a density context that picks one.
export const SPACE = {
  comfortable: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  compact:     { xs: 2, sm: 6, md: 8,  lg: 12, xl: 16, xxl: 24, xxxl: 32 },
};

// Default flat spacing scale = comfortable. Components can use this directly
// today; the density-aware source (Ola 2) will swap in where it matters.
export const SP = SPACE.comfortable;

// ── Radius ──────────────────────────────────────────────────────────────
export const RADIUS = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 };
export const R = RADIUS;

// ── Shadow ────────────────────────────────────────────────────────────────
// sm matches the existing --c-shadow (light). focus is the uniform focus ring
// (theme-aware via accent-soft) used by primitives for keyboard affordance.
export const SHADOW = {
  sm: "0 1px 3px rgba(0,0,0,0.06)",
  md: "0 4px 16px rgba(0,0,0,0.08)",
  lg: "0 12px 32px rgba(0,0,0,0.12)",
  focus: "0 0 0 3px var(--c-accent-soft)",
};
export const SH = SHADOW;

// ── Scrim ─────────────────────────────────────────────────────────────────
// The single overlay tint behind every blocking dialog. One value so modals
// stop drifting — before this the app had 0.4 (bypasses), 0.5 (Modal default),
// and rgba(15,18,25,0.55|0.65)+blur (ClassCode/Students/DeleteAccount) all
// hand-eyeballed per modal. Theme-invariant (black at 50% reads correctly over
// both light and dark content, like the shadows above). The Modal primitive's
// DEFAULT_BACKDROP uses this; any caller passing a custom backdropStyle (for a
// different zIndex/padding) should still reference SCRIM for the background.
// Non-dialog overlays (the analytics StudentDrawer side-peek, the CleoTour
// spotlight) intentionally use their own lighter/cut-out treatments.
export const SCRIM = "rgba(0,0,0,0.5)";
