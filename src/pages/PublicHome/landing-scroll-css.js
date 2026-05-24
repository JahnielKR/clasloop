// ─── Landing scroll-redesign CSS ────────────────────────────────────────────
// Kept SEPARATE from landing-css.js (which holds the original extracted styles)
// so neither file becomes a god file. Injected as a second <style> from
// index.jsx. Everything here powers the "guided, fluid" scroll pass:
//   • directional scroll-reveals (varied entrances, not one uniform fade-up)
//   • per-section eyebrow labels
//   • the left journey rail + header progress line
//   • the ONE sticky scrollytelling scene (Print/Scan centerpiece)
//   • soft section seams (connective tissue between scenes)
//
// Accessibility: a prefers-reduced-motion block at the bottom collapses every
// new motion to a static, fully-readable end-state — and crucially turns the
// sticky scene back into a normal stacked section so nothing is ever pinned or
// hidden for users who opt out.
import { C } from "../../components/tokens";

export const landingScrollCss = `
  /* ── Directional scroll-reveals ─────────────────────────────────────────
     Driven by the SAME IntersectionObserver as .ph-reveal (useReveal.js):
     the consumer toggles .is-visible on the element. These only vary the FROM
     transform so each section announces itself differently. */
  .ph-rv { opacity: 0; transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
  .ph-rv-up    { transform: translateY(30px); }
  .ph-rv-left  { transform: translateX(-40px); }
  .ph-rv-right { transform: translateX(40px); }
  .ph-rv-scale { transform: scale(.93); }
  .ph-rv.is-visible { opacity: 1; transform: none; }
  /* Stagger delays for assembling pipelines (used with .ph-rv children). */
  .ph-seq > * { opacity: 0; transform: translateY(22px); transition: opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1); }
  .ph-seq.is-visible > * { opacity: 1; transform: none; }
  .ph-seq.is-visible > *:nth-child(1) { transition-delay: .05s; }
  .ph-seq.is-visible > *:nth-child(2) { transition-delay: .16s; }
  .ph-seq.is-visible > *:nth-child(3) { transition-delay: .27s; }
  .ph-seq.is-visible > *:nth-child(4) { transition-delay: .38s; }
  .ph-seq.is-visible > *:nth-child(5) { transition-delay: .49s; }
  .ph-seq.is-visible > *:nth-child(6) { transition-delay: .60s; }
  .ph-seq.is-visible > *:nth-child(7) { transition-delay: .71s; }

  /* ── Eyebrow (per-section announcement label) ───────────────────────────── */
  .ph-eyebrow { display: inline-flex; align-items: center; gap: 11px; margin-bottom: 18px; }
  .ph-eyebrow-num { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: ${C.accent}; opacity: .6; }
  .ph-eyebrow-line { width: 26px; height: 2px; border-radius: 2px; background: ${C.accent}; opacity: .4; }
  .ph-eyebrow-text { font-size: 13px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: ${C.accent}; }

  /* ── Header scroll-progress line (fills 0→100% as you scroll the page) ──── */
  .ph-headerprog { transform-origin: left center; }

  /* ── Journey rail (left progress spine) ─────────────────────────────────── */
  .ph-rail { position: fixed; left: 30px; top: 50%; transform: translateY(-50%); z-index: 40; display: none; }
  /* ≥1100px only — below that the content goes full width and the rail would crowd it. */
  @media (min-width: 1100px) { .ph-rail { display: block; } }
  .ph-rail-track { position: relative; width: 2px; background: ${C.border}; border-radius: 2px; margin: 0 auto; }
  .ph-rail-fill { position: absolute; left: 0; top: 0; width: 2px; border-radius: 2px; background: ${C.accent}; transform-origin: top center; transform: scaleY(0); }
  .ph-rail-stop { position: relative; display: flex; align-items: center; gap: 11px; background: transparent; border: none; cursor: pointer; padding: 0; font-family: 'Outfit', sans-serif; }
  .ph-rail-dot { width: 11px; height: 11px; border-radius: 50%; background: ${C.bg}; border: 2px solid ${C.border}; flex-shrink: 0; transition: border-color .25s ease, background .25s ease, transform .25s ease; }
  .ph-rail-label { font-size: 13px; font-weight: 600; color: ${C.textMuted}; opacity: 0; transform: translateX(-6px); transition: opacity .25s ease, transform .25s ease, color .25s ease; white-space: nowrap; }
  .ph-rail-stop:hover .ph-rail-label, .ph-rail-stop:focus-visible .ph-rail-label { opacity: 1; transform: none; }
  .ph-rail-stop[data-active="true"] .ph-rail-dot { border-color: ${C.accent}; background: ${C.accent}; transform: scale(1.25); }
  .ph-rail-stop[data-active="true"] .ph-rail-label { opacity: 1; transform: none; color: ${C.accent}; }

  /* ── Sticky scrollytelling scene (Print/Scan centerpiece) ────────────────
     .ph-scene is a tall scroll track; .ph-scene-stick sticks within it as you
     pass through, so the visual holds while the steps advance with scroll.
     Native scroll + momentum are fully preserved (no scroll-jacking). */
  .ph-scene-stick { position: sticky; top: 92px; }
  /* Height-safe: the pinned loop is short (~250px), so it fits fine even on a
     1316×682 tablet in landscape — sticky stays on there (the centerpiece is
     worth it) and only falls back to normal stacked flow on NARROW phones or
     genuinely tiny/embedded viewports. Sticky never traps: native scroll
     continues past the track regardless. */
  @media (max-width: 900px), (max-height: 560px) {
    .ph-scene { min-height: 0 !important; }
    .ph-scene-stick { position: static; }
  }

  /* ── Soft section seams — connective tissue between scenes ───────────────
     A faint accent wash at the TOP of a section (painted as the section's own
     background, behind content — no z-index games) eases the boundary from the
     section before it instead of a hard 1px cut, so the eye flows from one
     scene into the next. Very low alpha — accent discipline. The landing is
     always light, so fading to opaque white is correct. */
  .ph-seam-top { background: linear-gradient(to bottom, rgba(35,131,226,0.05) 0%, rgba(255,255,255,0) 180px); }

  /* ── Micro-delight: springy lift + tactile press on interactive pills/cards ─
     The press uses the independent \`scale\` property so it composes with the
     hover \`transform\` (translateY) instead of clobbering it. */
  .ph-springy { transition: transform .2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .2s ease, scale .12s ease; }
  .ph-springy:hover { transform: translateY(-3px); }
  .ph-springy:active { scale: .97; }
  /* Press feedback for tappable chips that aren't springy (e.g. theme picker).
     Pair with \`scale\` in the element's own transition so the dip animates. */
  .ph-press { transition: scale .12s ease, background .15s ease, border-color .15s ease, color .15s ease; }
  .ph-press:active { scale: .96; }

  /* ── Accessibility: collapse every new motion to a static end-state ─────── */
  @media (prefers-reduced-motion: reduce) {
    .ph-rv, .ph-seq > * { opacity: 1 !important; transform: none !important; transition: none !important; }
    .ph-rail-fill { transform: scaleY(1) !important; }
    .ph-rail-label { opacity: 1 !important; transform: none !important; }
    .ph-scene { min-height: 0 !important; }
    .ph-scene-stick { position: static !important; }
    .ph-springy { transition: none !important; }
    .ph-springy:active { scale: 1 !important; }
    .ph-press { transition: none !important; }
    .ph-press:active { scale: 1 !important; }
  }
`;
