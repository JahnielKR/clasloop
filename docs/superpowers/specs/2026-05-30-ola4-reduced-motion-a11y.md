# Ola 4 (a11y slice) — app-wide reduced-motion guard

**Date:** 2026-05-30
**Type:** design-audit Ola 4, a11y sub-slice (see memory `project_design_audit`)
**Status:** implemented, verified (Playwright emulateMedia)

## Gap

`prefers-reduced-motion` was honored by most shared components (each had its own
guard) and by the global UI primitives (index.css), but **several high-traffic
surfaces had no guard for their keyframes**:

- `src/styles/themes.css` — the **live-quiz** theming (the most-used *student*
  surface), ~25 `@keyframes` (pulses, slides, pops, twinkles, shakes…).
- `src/components/PlanView.jsx` — slide-in/out + fade keyframes.
- Various inline page keyframes (StudentJoin, Achievements, MyClasses, …).

A user who sets "reduce motion" at the OS level still got all of these.

## Fix

One **global** baseline in `src/index.css`, merged into the existing
`@media (prefers-reduced-motion: reduce)` block:

```css
*, *::before, *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

- The universal selector + `!important` catch every unguarded `animation:` /
  `transition:` declaration app-wide (themes.css, PlanView, onboarding, inline) —
  no need to touch 30 files.
- `0.01ms` (not `0`) so animations still fire `animationend` and settle on their
  end state (the widely-recommended value).
- The existing targeted removals (drop press/hover transforms entirely) are kept
  alongside — they do slightly more than "make it instant".
- **Only** active under `prefers-reduced-motion: reduce`, so the default look is
  unchanged for everyone else.

`:focus-visible` was **already** uniform app-wide (index.css ring on
`button`/`a`/`[role=button]`/`[tabindex]`/`summary`); the quiz text inputs keep
their border-color focus indicator. No change needed there.

## Verification

Playwright `emulateMedia`, measuring a probe element's computed style:

| Preference | animation-duration | iteration | transition-duration |
|---|---|---|---|
| no-preference | `1s` | infinite | `1s` |
| **reduce** | **`0.01ms`** | **1** | **`0.01ms`** |

Build OK, lint 0 errors, 460 tests pass.

## Not in this slice (deferred Ola 4 visual part)

Unicode glyphs → SVG in `Icons.jsx` / `NavIcons.jsx` — that's a *visual* change
and is left for a logged-in-reviewed pass.
