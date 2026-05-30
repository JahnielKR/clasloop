# Ola 3 — mobile bottom-nav + theme toggle in sidebar footer

**Date:** 2026-05-30
**Type:** design-audit Ola 3 (see memory `project_design_audit`). New mobile UI.
**Status:** approved (design + item set) → implementing

## Goal

Two adoption fixes from the audit:
1. On phones, nav is a **drawer** (`mobileDrawerOpen`, hamburger → **2 taps/nav**).
   Add a **bottom-nav** so the common destinations are **1 tap**.
2. The **light/dark toggle** is buried in Settings → Appearance (3 levels deep).
   Surface it in the **sidebar footer** (next to the EN/ES/한 selector).

## Part A — `BottomNav.jsx` (mobile-only)

A fixed bottom bar (`position: fixed; bottom: 0`, full width, ~56px + iOS
`env(safe-area-inset-bottom)`), shown only when `isMobile`. Five equal tabs:
**4 role-aware 1-tap destinations + a "Más" tab** that opens the existing drawer
(`setMobileDrawerOpen(true)`) for the overflow — so everything stays reachable
and we don't rebuild the full nav.

- **Teacher:** Hoy (`sessions`) · Mis Clases (`myClasses`) · Biblioteca (`decks`)
  · Comunidad (`community`) · **Más**.
- **Student:** Mis Clases (`myClasses`) · Unirse (`studentJoin`) · Logros
  (`achievements`) · Comunidad (`community`) · **Más**.
- Overflow in the drawer: To-review / Scanner / Notifications / Settings (+ admin).
- Active tab = accent (`page === item.id`). Icon via the existing `NavGlyph`
  (`today`/`classes`/`library`/`community`/`join`/`achievements`); "Más" uses a
  small inline 3-line glyph.
- **Badge:** a dot on "Más" when `reviewBadgeCount + notifsCount > 0` (those live
  in the overflow). i18n: reuse the sidebar label keys (Hoy/Mis Clases/…).
- **Hidden** during immersive flows (mirrors App.jsx's existing
  `inPractice || page === "studentJoin"` special-case, plus the live session
  surfaces) so it never covers a running quiz.

### Wiring (`App.jsx`)
- Render `<BottomNav>` after the content when `isMobile` and not immersive.
- `onNav(id)` = same as the sidebar's `handleNav` (drives `setPage`); `onMore()`
  = `setMobileDrawerOpen(true)`.
- Add `paddingBottom` (~64px) to the content wrapper on mobile so content clears
  the bar.
- The existing hamburger stays (it also opens the drawer — harmless redundancy;
  removing it from page headers is out of scope for this ola).

## Part B — theme toggle in the sidebar footer (`Sidebar.jsx`)

A sun/moon toggle next to the language selector, using the existing `useTheme()`
hook (`[theme, setTheme]`, persists + syncs app-wide via a window event). Click
flips light↔dark. Rendered in the `showLabels` footer, so it appears in both the
desktop sidebar and the mobile drawer. Collapsed (56px) desktop mode: skip it
(no room) — it's reachable by expanding, same as today's other footer controls.

## Testing & verification

Logged-in (Playwright, pedro) at 390px:
- Bottom nav renders with the 4 teacher tabs + Más; tapping a tab navigates in
  **one** tap (URL changes, active state moves); **Más** opens the drawer.
- Theme toggle flips `document.documentElement[data-theme]` light↔dark and the
  palette changes.
- Desktop (1280px) unaffected: no bottom nav, sidebar gains the toggle.
- Gate: lint · typecheck · `test:run` · build.

## Out of scope (documented)

Removing the now-redundant hamburger from page headers; animating the drawer
differently; reworking the immersive-flow detection beyond the existing flags.
