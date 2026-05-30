# Ola 5 — unify modal chrome (part 1)

**Date:** 2026-05-30
**Type:** design-audit Ola 5 (see memory `project_design_audit`)
**Status:** part 1 implemented + verified logged-in; broader sweep documented as remaining

## Gap

The shared `Modal` primitive (PR 146) gives the a11y mechanics (focus-trap,
return-focus, `role`+`aria-modal`, Escape, scroll-lock) and a canonical backdrop
(`rgba(0,0,0,0.5)`). But:

1. **TeacherProfile `SaveModal` bypassed it** — a raw `position:fixed` overlay
   (scrim `0.4`, click-to-close) with **none** of the a11y.
2. Modals that *use* the primitive still passed their own `backdropStyle` with a
   **scattered scrim** (`0.4` / `0.45` / `0.5`) — an inconsistent backdrop.

## This PR (part 1 — the concrete, verifiable core)

- **Migrate `SaveModal` → `<Modal>`** (`TeacherProfile.jsx`): a wrapper swap, no
  layout change. It now gets focus-trap, Escape, return-focus, `aria-modal`,
  scroll-lock, and the canonical `0.5` scrim (no `backdropStyle` override).
- **Unify the off scrims to `0.5`** in the five modals that passed `0.4`/`0.45`:
  `CreateClassModal`, `EditClassModal`, `ImportClassModal`, `DayDateModal`,
  `PDFExportModal`. (`AddToSlotModal`, `CloseUnitFlow`, `LobbyThemeSelector` were
  already `0.5`.)

## Verification (Playwright, logged in as a teacher)

- Opened **CreateClass** modal → backdrop computed `rgba(0, 0, 0, 0.5)` (was
  `0.4`), `aria-modal="true"`, renders correctly; **Escape closes it** (primitive
  a11y confirmed live).
- The migrated `SaveModal` rides that same verified primitive. Its trigger
  (viewing *another* teacher's profile + "add to my classes") wasn't reachable
  for a live click in this session; covered by build + the primitive's own test
  suite (`Modal.test.jsx`) + the live-verified primitive behavior.
- Build OK, lint 0 errors, 460 tests.

## Remaining Ola 5 (deferred — needs per-modal handling + a visual eyeball)

- **Heterogeneous backdrops:** `ClassCodeModal`, `DeleteAccountModal`,
  `StudentsModal` set their backdrop with non-`rgba(0,0,0,X)` values — convert
  individually.
- **Other bypasses:** the inline save modal in `Community.jsx` and the overlay in
  `App.jsx` (verify the latter is a modal first).
- **Close treatments:** the audit counted ~5 different close-button styles —
  converge on one. Fuzzier (no single canonical yet), so its own focused pass.
- Optional: extract a shared `SCRIM` constant so the value has one source.
