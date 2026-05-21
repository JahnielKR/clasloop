# Changes to the original PR plan

Per the policy in `PRs/README.md`:

> If Claude Code (or you) decides to change the scope or skip a PR, document it here with the reason. This prevents the next session from regenerating an inconsistent plan.

Entries are appended chronologically. Most recent at the top.

---

## 2026-05-21 — PR 134 done conservatively (no Database generic)

**Status:** ✅ migrated, but **without** the `createClient<Database>()` the
README proposed.

**Reason:** there is no generated `Database` schema type in the repo
(`db-types.ts` exports row interfaces but not the `Database` shape the
supabase-js generic expects). Adding `createClient<Database>()` would
type **every** supabase query across all `.ts` files at once. With no
accurate generated type that's a guaranteed cascade of type errors, and
generating one properly (via `supabase gen types typescript`) is its own
task — not a mechanical file migration.

**Done:** `supabase.js` → `supabase.ts`, untyped client preserved. All
consumers (including the already-migrated `.ts` libs) keep working.

**Follow-up:** run `supabase gen types typescript --linked > src/lib/database.types.ts`,
then change `createClient` → `createClient<Database>` and fix the query
sites that surface real mismatches. Worthwhile but should be its own PR.

---

## 2026-05-21 — PR 113 partial — DeckTiles only

**Status:** ⚠️ partial — 1 cohesive extraction done.

**Done:**
- `pages/Decks/DeckTiles.jsx` (~371 LOC): the draggable deck-card family
  `DeckRow` + `SortableDeckTile` + `DeckTile`. They were pure
  presentational components (all data via props, no shared local state
  with Decks.jsx, deps are all imports), so the extraction was safe.
  Only `DeckRow` is consumed by Decks.jsx (ClassDecksView); the other
  two are exported for potential DragOverlay reuse.

Decks.jsx is now ~1423 LOC (was 1775 → −352 LOC).

**Deferred (the PR 113 README's proposed names don't match the real
structure — the file has ClassDecksView / FavoritesGrid / LangBadge,
not DeckCard / DecksGrid / DecksFilters / CommunityDecks):**
- `ClassDecksView` (~300 LOC) — the core "my decks" view. Heavily
  coupled to the parent's state (search params, drag handlers, the
  outer DndContext + DragOverlay). Extracting needs careful prop
  threading + UI smoke test.
- `FavoritesGrid` (~120 LOC) — community-favorites grid. Mostly
  self-contained; a reasonable next extraction but left for a focused
  pass.
- `LangBadge` (~15 LOC) — trivial, but used inline in one spot; not
  worth its own file yet.
- `useDecks()` data hook + the realtime channel — same react-query
  caveat as PR 112's useSessionTick (PR 170 will replace it).
- SaveAsFavorite / Share / Delete / Import modals — they're inline JSX
  blocks inside Decks.jsx, not standalone functions; extracting needs
  reconstruction + smoke test.

**Reason for deferral:** same as PR 112 — the remaining pieces share
state/refs/handlers with the parent and need per-path UI smoke testing
that isn't possible in this iteration. DeckTiles was the one block that
was already fully prop-driven and standalone.

H6 (Decks.jsx god-file) partially addressed.

---

## 2026-05-21 — PR 112 partial — AuthScreen + NotFoundScreen only

**Status:** ⚠️ partial — 2 of 7 extractions done.

**Done:**
- `pages/AuthScreen.jsx` (~400 LOC including the AUTH_I18N constant).
- `pages/NotFoundScreen.jsx` (~40 LOC).

App.jsx is now 1093 LOC (was 1510 → −417 LOC).

**Deferred (left as inline state/effects in App.jsx, file a follow-up
PR when they become a problem):**
- `useProfile()` hook — currently inline as `[profile, setProfile]` +
  `fetchProfile` function + the corresponding useEffect. Not trivial to
  extract because it's woven into the auth listener and the
  `profileLoadedRef` / `fetchProfileInFlightRef` guards.
- `useClassMembership()` hook — currently inline starting around line
  ~860 (the realtime channel that detects "removed from class" + the
  toast trigger). Tightly coupled to `setRemovedToast`,
  `setStudentMembershipTick`, navigation.
- `useLocaleDetection()` hook — currently the `lang` state +
  `setLang` in App. Small but pervasive — almost every page receives
  `lang`/`setLang` as props. Extracting cleanly would touch a lot of
  call sites.
- `useSessionTick()` hook — the `*Tick` counters
  (`studentMembershipTick`, `activeSessionTick`) and their setters.
  The PR 112 README itself notes that the `*Tick` pattern goes away
  with PR 170 (react-query migration), so extracting it just to delete
  it later is low value.
- `RemovedFromClassToast` component — currently inline at ~line 940
  (after the AuthScreen/NotFoundScreen removal). Doable as a
  follow-up if M17 (i18n centralization) is prioritized.

**Reason for deferral:** the 5 deferred items all touch refs/state
shared across multiple effects in App.jsx. Extracting them safely
needs smoke testing each path that uses them — beyond what we can do
in a single iteration without UI access. AuthScreen + NotFoundScreen
were standalone functions already, so extracting them was mechanical
and low-risk.

H5 (the audit finding about App.jsx being a god component) is
partially addressed. The remaining 700 LOC of App.jsx is now mostly
orchestration; the next round can target those hooks individually.

---

## 2026-05-21 — Skip PR 111 (React Router migration)

**Status:** ⏭️ skipped — already effectively done.

**Reason:** the README of `PR_111_react_router_migration` assumes a starting
state where `App.jsx` dispatches by a shadow `page` state and ignores
`<Routes>`. That description does not match the live code:

- `src/main.jsx` already wraps `<App />` in `<BrowserRouter>` (web) or
  `<HashRouter>` (Capacitor), with `<Routes>` defining `/join` for
  `GuestJoin` and a catch-all `/*` for `<App />`.
- `src/App.jsx` already imports `useLocation, useNavigate, useMatch`
  from `react-router-dom`. It still keeps a `[page, setPage]` shadow
  state for legacy prop compatibility, but that state is **synchronized
  to the URL** by a `useEffect` (lines 736-741) that calls
  `pathToPage(location.pathname)` and updates `page` whenever the URL
  changes. Effectively the URL is already the source of truth.
- Role guard (lines 749-756) uses `navigate(..., { replace: true })` to
  bounce unauthorized roles, which is what the README asks to add.
- Practice deck deep-linking (line 1411-1412) already uses
  `buildRoute.practice(deck.id)` + `navigate(...)`.
- All onNavigate callbacks at the page-prop boundary already call
  `navigate(...)` internally.

The only remaining "improvement" the PR 111 README proposes is replacing
the `<P key={...} ... />` single-component render with an explicit
`<Routes><Route path="..." element={<P ... />} /></Routes>` block. This
is cosmetic: it does not change observable behavior (deep links, back
button, F5 reload, role guard all work today). It costs ~150 LOC of
churn in a 1510-LOC file and requires full smoke-test of every page —
high risk, low return.

**Decision:** declare PR 111 closed by the existing implementation.
Audit finding H7 ("App.jsx dispatch ignores routes.js") is functionally
resolved. Move on to PR 112 (split God-file `App.jsx`), which is what
H7 was really blocking.

**Author of decision:** Claude Code (cowork) under the user's "haz lo
mejor para el proyecto" directive.

**If a future PR really wants to remove the shadow `page` state:**
that would be a separate cleanup PR, smaller in scope than what PR 111
originally proposed. Not blocking anything currently planned.
