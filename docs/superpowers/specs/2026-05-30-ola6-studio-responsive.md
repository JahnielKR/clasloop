# Ola 6 — Studio responsive (mobile overflow fix)

**Date:** 2026-05-30
**Type:** design-audit Ola 6 (see memory `project_design_audit`)
**Status:** implemented, verified logged-in at 390px + 1280px

## Symptom

On phones, Analytics Studio surfaces pushed a **horizontal scrollbar** and clipped
content. Measured at a 390px viewport, `/school/reports` had a document
`scrollWidth` of **703px** (1.8× the screen).

## Root cause (found via live measurement, deeper than the audit's one-liner)

The audit pointed at the Studio grids/tables, but the *origin* of the overflow
is the **app shell**. `App.jsx`'s main content wrapper is a flex item
(`flex: 1`) with no `min-width: 0`. A flex item defaults to `min-width: auto`,
which refuses to shrink below its content's min-content width — the classic
flexbox overflow trap. So whenever a Studio page's content preferred a width
wider than the phone, the whole column refused to shrink and overflowed.

Confirmed empirically: setting `min-width: 0` on that wrapper collapsed the
Studio column from 703px → 390px instantly (content reflowed to fit).

The named grids/tables made it worse (they *preferred* a wide layout), but the
wrapper is what let the overflow escape.

## Fix

1. **`src/App.jsx`** — add `minWidth: 0` to the `flex: 1` content wrapper. This
   is the canonical flexbox fix; it only *allows* shrinking when content would
   overflow, so it's a no-op at desktop widths and benefits every page (verified
   on `/decks` too). This is the core fix.
2. **`src/pages/analytics/Reports.jsx`** — `320px 1fr` → `repeat(auto-fit,
   minmax(min(100%, 300px), 1fr))`. Two columns when there's room, one on phones.
3. **`src/pages/analytics/TopicMastery.jsx`** — `1fr 1fr` →
   `repeat(auto-fit, minmax(min(100%, 240px), 1fr))`. Desktop stays two equal
   columns; collapses to one on phones.
4. **`RosterTable.jsx` / `SessionHistoryTable.jsx`** — wrap the `<table>` in a
   `overflowX: auto` container with a `minWidth` (520 / 480) so the wide data
   table **scrolls horizontally** inside its card instead of clipping or crushing
   columns on phones.

`min(100%, …)` and `auto-fit minmax` need no media query (Studio styling is
inline). `min()` is well-supported on the app's targets (already relying on
`color-mix` via `withAlpha`).

> JSX gotcha hit while implementing: a `{/* comment */}` cannot be the first
> sibling in a ternary branch (`cond ? x : ( {/*..*/}<div/> )`) — it reads as two
> adjacent expressions. Put the comment **inside** the wrapper element.

## Verification (Playwright, logged in as a teacher, real data)

At **390px** every Studio surface now has `scrollWidth ≤ viewport` (no horizontal
scroll), with the **real** content rendered (not an error boundary):

| Surface | Result |
|---|---|
| `/school/reports` | 390, no overflow, composer+list stack to 1 col |
| `/school/class/:id` (RosterTable) | 375, table scrolls in a 313px `overflowX:auto` wrapper |
| `/school/student/:id/:ref` (SessionHistoryTable) | 375, table scrolls |
| `/school/topics/:id` (+topic) | 375, the panel grid is 1 col (`339px`, 2 children) |

At **1280px**: Reports grid is 2 columns, no overflow; `/decks` (non-Studio)
unaffected at both widths. Build OK, lint 0 errors, 460 tests pass. (No unit test
added — this is layout behavior jsdom can't measure; the live viewport checks are
the verification.)

## Not in this ola

The app shell still shows the desktop sidebar on phones instead of a drawer/
bottom-nav — that's **Ola 3**, tracked separately.
