# Changes to the original PR plan

Per the policy in `PRs/README.md`:

> If Claude Code (or you) decides to change the scope or skip a PR, document it here with the reason. This prevents the next session from regenerating an inconsistent plan.

Entries are appended chronologically. Most recent at the top.

---

## 2026-05-22 — PR 137 skipped — already resolved (H3 closed by current code)

**Status:** ⏭️ skipped — no code change. H3 ("AI endpoints log content +
emails + DB details") is already satisfied in the files PR 137 targets.

Audited every server-side log statement, not just the three the README named
("probablemente logea content + teacher email" — that was an unverified guess):

- **`api/close-unit-narrative.js`** — 0 `console.*`. No logging at all.
- **`api/session-insight.js`** — 0 `console.*`. No logging at all.
- **`supabase/functions/generate-insight/index.ts`** — 6 `console.*`, all
  sanitised: webhook-auth failures (static strings), `"Insert failed:" +
  insertErr` (DB error on `session_insights`, whose columns are
  session_id/status/attempts — no student PII), and retry logs that print
  Anthropic HTTP status + attempt count + a fetch (network) error. None print
  request body, email, prompt, or student answers.
- Full universe of server-side `console.*` is just `generate.js` (PR 94's
  scope) + that edge function — nothing else in `api/` or
  `supabase/functions/`.

The README's own verification grep returns a single hit —
`generate.js:426` — which is a **false positive** (the word "question" is in
the log prefix `[validator] dropped question`; the logged values are the
index `${i}` and the validator's `reason`, not question content) and is PR
94's scope anyway.

**Out of scope (NOT H3):** `session-insight.js:110`,
`close-unit-narrative.js:194`, and `index.ts:154` return `*.message`/`detail`
in HTTP **error responses** (to the authenticated owner of the resource), not
in logs. Hardening those would be a separate information-disclosure finding,
not H3.

**Decision:** declare H3 closed by the existing implementation (PR 94 +
endpoints written without PII logging). No branch, no code commit.

---

## 2026-05-22 — PR 136 done; centralised storage-cleanup reporting

**Status:** ✅ done + merged to main. Closes H8 (completes PR 100).

Swept the remaining silent catches. All gates green (typecheck 0 · 101 tests
· build ✓). Classified each per the README (A = expected/log, B = silenced-
but-actionable, C = intentional no-op):

**Deviation — centralised, not inline.** The README suggested converting each
`.catch(() => {})` inline at the call site. The bulk of them (12) were
fire-and-forget storage cleanups: `deleteDeckCover` (9 call sites in
CreateDeckEditor) and `deleteProfileAvatar` (3 in Settings). Instead of 12
inline `captureError` calls, I moved the reporting **into the two helpers**
(`lib/deck-image-upload.js`, `lib/avatar-storage.js`) and **removed the now-
redundant `.catch()`** from every call site. Reasons: DRY, one report point
per operation (less Sentry-spam risk), and the H8 grep
(`.catch(() => {})`) comes back clean. The helpers wrap in try/catch so they
never reject — callers can fire-and-forget safely.

**Bonus correctness:** `supabase.storage.remove()` does **not** reject on API
errors (RLS, etc.) — it resolves with `{ error }`, which the old `.catch()`
never saw. The helpers now report **both** the thrown exception and a returned
`{ error }`.

**Caso B (report, low frequency):** App.jsx sidebar-badge fetches
(countVisibleNotifications, countPendingReviewsForTeacher, activeSessionPoll)
and SessionFlow.jsx `cacheAccessToken` → `captureError(err, { source })`.

**Caso A (report):** tokens.js `localStorage.setItem(theme)` → `captureError(…,
{ kind: "localstorage_write" })`, the README's exact example. This couples the
design-token module to `lib/sentry`, but `@sentry/react` is already in the
entry graph via App.jsx's static `captureError` import, so no new bundle cost
and no import cycle.

**Caso C (comment, do NOT report — spam risk):** chunk prefetch (App.jsx:393,
already commented), obsolete-key `localStorage.removeItem` (App.jsx 274/689),
`sessionStorage.removeItem` and `clearGuestSession` best-effort cleanups
(StudentJoin), and the clipboard `execCommand` fallback-of-fallback
(ClassPage, MyClassesTeacher). Each empty catch now carries an explanatory
comment.

**Process note:** PR 135's CHANGES_TO_PLAN.md entry was left uncommitted (the
file is git-tracked but I only `git add src/i18n` on PR 135). Recovered in a
doc commit alongside this entry.

---

## 2026-05-22 — PR 135 done, with 3 deviations from the README

**Status:** ✅ done + merged to main. Batch G (TS migration) complete.

`en/es/ko.js` → `.ts`, `Locale` type derived from EN, parity test added,
all gates green (typecheck 0 errors · 101 tests incl. 3 new · build ✓).
Three deviations from the README, all because the README's snippets were
illustrative and didn't match the real files:

**1. NO `as const`.** The README proposed
`export const en = {...} as const; type Locale = typeof en`. That is
**wrong** for this use case: `as const` makes every string a *literal*
type, so `Locale` would demand `es.common.save === "Save"` — but es says
`"Guardar"`. Every single translation would be a type error. Fix: plain
`const en = {...}` (no `as const`) so values widen to `string`/`string[]`/
`(n: number) => string`. `Locale = typeof en` still enforces the **key
shape** (missing/extra key = compile error), which is the point of M30.

**2. Kept `export default`.** The README showed named exports
(`export const en`) and said to update the hook's import. The real
locales use `export default {...}` and the only consumer,
`src/i18n/index.js`, does `import en from "./en"`. Keeping the default
export means **index.js needs zero changes**. The `Locale` type is still
exported (`export type Locale = typeof en` alongside `export default en`).
`index.js` was left as `.js` (out of scope; `checkJs:false` anyway).

**3. Real structure preserved.** The README's example shape
(`common/auth/decks`) is not the real one — locales are
namespace-per-component (`avatarOnboarding`, `scanner`, `decks`, …, 33
namespaces). No keys were reorganized; that would break every
`useT("namespace")` call site.

**Bonus — real bug found by tsc (TS1117):** the `decks` namespace had 3
**duplicate keys** (`makePublic`, `delete`, `edit`). JS silently kept the
*last* occurrence; TS strict rejected the literal. Removed the **shadowed
earlier** copies (kept the last/runtime-effective value), so behavior is
unchanged. The earlier `makePublic` strings ("Make public to community" /
"Hacer público en comunidad" / "커뮤니티에 공개") were dead — never rendered,
since `t.makePublic` already resolved to the later "Make public" value.

**Parity test adaptation:** values aren't all strings — 7 are
interpolation functions (e.g. `scanner.resultScore`) and 2 are arrays
(`community.langs`, `lobbyThemeSelector.sampleOptions`). `collectKeys`
recurses into arrays (so array-length drift IS caught at runtime, which
the widened `string[]` type would miss) and treats functions as leaves;
the leaf-type assertion allows `string | function`.

**Follow-up (optional):** components consuming `useT` are still untyped
JS. A future PR could import `Locale`/namespace types at call sites for
end-to-end type safety, but that's a large, separate change.

---

## 2026-05-22 — HOTFIX: PR 107 broke deck creation (found in QA)

**Status:** 🔧 fixed in prod + committed.

**Bug:** PR 107's `CHECK (language in ('en','es','ko'))` on `decks`
rejected `language = ''`, which is exactly what the deck editor
(CreateDeckEditor) sends by default when the teacher doesn't pick a
language. Result: after PR 107 was applied to prod, **no teacher could
create a deck** — the insert failed with `23514`. Caught during
Playwright QA of the create-deck flow (the POST to /rest/v1/decks
returned 400).

**Fix:** migration `20240101000054_decks_language_normalize_trigger.sql`
adds a BEFORE INSERT/UPDATE trigger `normalize_deck_language()` that
coerces null/empty/out-of-range language to 'en'. Runs before the CHECK,
so the CHECK still holds and the table only stores en/es/ko. Chosen over
fixing just the editor because it covers every insert path (editor,
imports, copies, future clients). Applied to prod via `db query --linked`
and verified (a deck saved with empty language now shows "EN").

**Follow-up (optional, low priority):** also fix CreateDeckEditor to send
the selected language (or 'en') instead of '' — cosmetic now that the DB
normalizes, but cleaner.

**Lesson:** a CHECK constraint added to an existing table must be
validated against what the live app actually writes, not just the
intended value set. PR 107's README assumed the app always sent a valid
language; it didn't.

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
