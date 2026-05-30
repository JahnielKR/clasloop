# Ola 2 (part 1) — Button semantic `tone` + migrate Review's grade buttons

**Date:** 2026-05-30
**Type:** design-audit Ola 2 (see memory `project_design_audit`)
**Status:** part 1 implemented + verified logged-in; the broader button sweep remains

## Decision (approved by user)

Ola 2 was blocked on how to handle **solid semantic-colored** buttons (Review's
green/partial-orange/red grade buttons) when migrating raw `<button>`s to the
`Button` primitive. Chosen: **extend the primitive with solid `tone` variants**
and migrate Review first as a bounded, verifiable slice.

## What

- **`Button` primitive** (`src/components/ui/Button.jsx`): new optional `tone`
  prop — `success` | `warning` | `danger`. When set (and valid), it applies a
  solid semantic fill (`.ui-btn--tone-*`) that **overrides the variant's color**.
  This is the SOLID semantic fill, deliberately distinct from the existing
  **outline** `variant="danger"` (used for destructive/secondary actions).
- **`src/index.css`**: `.ui-btn--tone-success|warning|danger` — same shape as
  `.ui-btn--primary` but `var(--c-green)` / `var(--c-orange)` / `var(--c-red)`
  fills, white text, brightness hover. They inherit the shared base (hover lift,
  `:focus-visible` ring, reduced-motion, disabled).
- **`src/pages/Review.jsx`**: the three grade buttons (correct/partial/incorrect)
  now render `<Button tone="success|warning|danger" style={{flex:1,minWidth:100}}>`
  instead of hand-rolled solid `background: C.green/orange/red` buttons — so they
  pick up the shared interaction states + haptics for free.

## Verification

- **Unit** (`Button.test.jsx`, +2): `tone` applies `.ui-btn--tone-*` and overrides
  the variant; an unknown tone is ignored and the variant is kept.
- **Live** (Playwright, logged in): the tone classes resolve to the exact tokens
  — success `#0F7B6C`, warning `#D9730D`, danger `#E03E3E`, white text — matching
  the original grade-button colors. (The Review queue was empty, so no grade rows
  rendered live; the tone styling + the primitive + the migration are each
  verified by the CSS check, the unit tests, and the build.)
- Build OK, lint 0 errors, 462 tests.

## Remaining Ola 2 (deferred — the broader sweep)

The audit counted **20+ raw `<button>`s + hand-rolled `linear-gradient` CTAs**
across authed surfaces. Migrating those to `<Button>` (using `tone` for any other
semantic ones) restores accent discipline (gradient ≤ 1/screen) but is large and
needs a logged-in eyeball per surface — a separate focused pass.
