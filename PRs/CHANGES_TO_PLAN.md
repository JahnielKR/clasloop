# Changes to the original PR plan

Per the policy in `PRs/README.md`:

> If Claude Code (or you) decides to change the scope or skip a PR, document it here with the reason. This prevents the next session from regenerating an inconsistent plan.

Entries are appended chronologically. Most recent at the top.

---

# Post-landing fixes (2026-05-23)

Not part of the sequenced 101→170 plan. Four issues the user hit after the
landing redesign + Phase 2 onboarding: two prod/CI bugs (A, B) merged first,
then two UX efforts (C teacher onboarding, D scroll-driven landing). Plan:
`~/.claude/plans/rosy-tickling-allen.md`.

## 2026-05-23 — Fix A — CI `test` job missing Supabase env

**Status:** ✅ done + merged to main (`cb9f090`).

**Symptom (GitHub CI only):** `Test Files 1 failed | 15 passed (16)` —
`Error: Missing Supabase credentials — see overlay or console`.

**Root cause:** `src/lib/__tests__/spaced-repetition.test.js` imports
`_internal` from `src/lib/spaced-repetition.ts`, which at its top does
`import { supabase } from "./supabase"`. `src/lib/supabase.ts:49` throws at
import time when `VITE_SUPABASE_URL/ANON_KEY` are absent (intentional, PR 55).
The CI `test` job set no env (only the `e2e` job did), so the import threw —
fails only in CI; locally `.env` is present. The tested SM-2 helpers are pure
and never touch the client.

**Fix:** `.github/workflows/ci.yml` `test` job — pass dummy
`VITE_SUPABASE_URL/ANON_KEY` (same fallback pattern as the `e2e` job).

**Verified:** reproduced locally by moving `.env` aside → 1 file fails with the
exact error; re-ran with the dummy vars → 26 tests pass; restored `.env`.

## 2026-05-22 — PR 170 — student pages (MyClasses + Favorites) → React Query. **170 COMPLETE; PR PLAN 101→170 DONE.** 🎉

**Status:** ✅ done + merged to main (`9c56881`). **User-verified LIVE** (student
account). Gates green (typecheck 0 · lint 0 errors / 400 warnings · 164 tests ·
build ✓ · e2e public 2/2).

**What changed.** Two new hooks:
- `src/hooks/useFavorites.js`: `useFavorites(profileId)` (the saved_decks list,
  query data IS the array) + `useFavoritesCache().patchSavedDecks`.
- `src/hooks/useStudentClasses.js`: `useStudentClasses(profileId, membershipTick)`
  (classes enriched with deck count / reviews-due / avg retention + saved decks;
  **`studentMembershipTick` is in the query key** so a join/leave refetches —
  preserving the old effect-dep behavior) + `useStudentClassesCache()`
  (`patchSavedDecks` + `invalidate`); and `useClassDetail(classId, profileId)`
  (the class's decks + the student's progress, read-only).
- `Favorites.jsx` + `MyClasses.jsx` (student view + its `ClassDetail`
  subcomponent): dropped the data `useState` + load fns + the PR-143 onLoad
  effects; read from the queries; the saved-deck toggles `patchSavedDecks`; the
  join handler (was `await loadAll()`) and `ClassDetail`'s `onBack` now
  `invalidate()` to refresh. Behavior-preserving by construction.

### 🎉 PR 170 COMPLETE — and with it the whole sequenced plan (PR 101 → 170).

**React Query migration (M1) — all the query-cacheable pages migrated + verified:**
Decks · MyClassesTeacher · ClassPage · Community · Notifications · TeacherProfile ·
Director · MyClasses (student) · Favorites. Setup (provider) in `main.jsx`. Hooks
in `src/hooks/use{Decks,Classes,Community,TeacherProfile,Director,Favorites,StudentClasses}.js`.

**Intentionally SKIPPED (documented, not react-query-appropriate):**
- **SessionFlow** (live-session page): realtime — `session` is a live state
  machine + 4 Supabase channels (participants/responses kept live by
  subscription), NOT cacheable query data. React Query is the wrong tool;
  forcing it = risk for no benefit. Left as-is.
- **170g `*Tick` removal** (`studentMembershipTick`, `activeSessionTick` in
  App.jsx): these feed App-level realtime state (the active-session probe at
  ~App:641, the membership realtime at ~App:679) + are still consumed (the
  student-classes query key uses `studentMembershipTick`). They're doing real
  work that isn't react-query; left in place.

**Devtools:** never added (deferred each sub-PR; not needed for the migration to
function — a clean follow-up if anyone wants the panel). **Follow-ups still open**
from earlier PRs (unchanged): 143's ~28 realtime exhaustive-deps suppressions,
146's 8 modals, 154's retention axis, 168's CI secrets + branch protection, 169's
L4/L6/L12/L19, the react/jsx-uses-vars lint chip. None block the plan.

---

## 2026-05-22 — PR 170 — Director (school analysis) migrated to React Query

**Status:** ✅ done + merged to main (`e96a54f`). Merged on the user's "dale"
go-ahead. Gates green (typecheck 0 · lint 0 errors / 400 warnings · 164 tests ·
build ✓ · e2e public 2/2). The user clarified "Director" = the **school-analysis**
view that lives INSIDE the teacher account (reached as a sub-page from MyClasses)
→ teacher-verifiable, not a separate role.

New `src/hooks/useDirector.js`: `useDirector()` wraps the old loadData (classes +
per-class retention / student progress / session & unique-student counts) in one
cached read-only query (`['director']`). `Director.jsx`: dropped the 5 data
`useState` + loadData + the load effect; reads from the query; removed the
now-unused `supabase` + `useEffect` imports. No mutations (analytics is read-only).

**Two faithful deviations:** (1) the query builds the full per-class maps then
returns once, vs the old incremental `setState` inside the loop (the page filled
in class-by-class) — now loads all-at-once (fine for analytics). (2) Dropped a
**dead query** — the old loop fetched `session_participants` by
`session_id = class_id` into a `parts` var that was never read (the unique count
comes from `allParts`); one less query per class on an analytics page.

**170 progress (teacher pages done):** setup · Decks · MyClassesTeacher ·
ClassPage · Community · Notifications · TeacherProfile · Director.
**⚠️ LAST + RISKIEST: SessionFlow** — the live-session page (Supabase realtime
channels + timers + quiz loop + the `activeSessionTick`). Realtime state is NOT
classic cacheable query data, so the migration should likely be SCOPED to the
initial loads (session/deck/class) and LEAVE the realtime subscriptions + quiz
state alone. Verification needs a REAL live session (teacher starts + students
join) — much harder than a page-load smoke test. Then **170g** removes the App
`*Tick` (`studentMembershipTick`, `activeSessionTick`). **Student-session-needed:**
MyClasses, Favorites.

---

## 2026-05-22 — PR 170 — TeacherProfile migrated to React Query (user-verified)

**Status:** ✅ done + merged to main (`f5a83fc`). User-verified. Gates green
(typecheck 0 · lint 0 errors · 164 tests · build ✓ · e2e public 2/2).

New `src/hooks/useTeacherProfile.js`: `useTeacherProfile(teacherId, viewerId,
viewerRole)` wraps the old load (the viewed teacher's profile + their public
decks + the viewer's saved set + teacher-viewers' classes), keyed on
`teacherId+viewerId` so navigating between profiles refetches;
`useTeacherProfileCache()` exposes `patchSaved`. `TeacherProfile.jsx`: dropped the
6 data `useState` + the load effect; `notAvailable`/`loading` handle the
no-teacherId case (`enabled: !!teacherId`); the favorite toggle keeps its
optimistic update via `patchSaved`. Standard pattern (clean — the load has no
`t`/`C` coupling, unlike Notifications).

**Also: ClassPage + Community + Notifications now USER-VERIFIED** (the user
confirmed "bien bien" / "nítido" after their post-merge spot-checks). So the whole
teacher-page set so far is verified.

**170 progress (all verified):** setup · Decks · MyClassesTeacher · ClassPage ·
Community · Notifications · TeacherProfile. **Next:** Director (= school analysis,
inside the teacher account → teacher-verifiable). **Last + riskiest:** SessionFlow
(sessions + realtime) → then 170g removes the App `*Tick`. **Student-session:**
MyClasses, Favorites.

---

## 2026-05-22 — PR 170 — Notifications migrated to React Query (user-verified "nítido")

**Status:** ✅ done + merged to main (`9357e08`). User-verified ("nítido"). Gates
green (typecheck 0 · lint 0 errors · 164 tests · build ✓ · e2e public 2/2).

**What changed.** `Notifications.jsx`: `notifications` + `loading` now come from
`useQuery(['notifications', lang])`. **No new hook file** — the queryFn is the
existing `generateNotifications` (changed only its tail: `return notifs` instead
of `setNotifications`+`setLoading`, and `return []` for no-user), kept inline
because it builds the notif objects with the component's `t` (i18n) + `C` (colors);
extracting to a hook would force a `t`→`getStrings` + color-import rewrite for no
gain. Dropped the PR-143 `onGenerate` effect. `dismissed` (localStorage, via
loadDismissed/saveDismissed + its persist effect) stays `useState` — it's client
state, not server data, and filters the list in render.

**Minor behavior improvement:** notifications now re-translate on language change
(queryKey includes `lang`) and refresh on window focus (global default), vs the
old build-once-on-mount. No optimistic mutations to convert (the list is read-only
generated; dismissal is the separate localStorage path).

**170 progress:** ✅ setup · Decks · MyClassesTeacher · ClassPage · Community ·
Notifications. **Next teacher pages:** Profile, Director (= "school analysis",
which the user clarified lives INSIDE the teacher account → teacher-verifiable,
not a separate role). **Last + riskiest:** SessionFlow (sessions + realtime) →
then 170g removes the App `*Tick`. **Student-session-needed:** MyClasses, Favorites.

---

## 2026-05-22 — PR 170c — Community migrated to React Query

**Status:** ✅ done + merged to main (`5a8f8e7`). Merged on the user's "dale"
go-ahead (same as ClassPage — they'll report any issue; local/revertible). Gates
green (typecheck 0 · lint 0 errors · 164 tests · build ✓ · e2e public 2/2).

**What changed.** New `src/hooks/useCommunity.js`: `useCommunity(isStudent)` wraps
the old loadData (current user + their saved set + — for teachers — their classes
for the "save to my decks" picker + the public deck list) in one cached query
(`['community']`); `useCommunityCache()` exposes `patchSaved`. `Community.jsx`:
dropped the data `useState` + loadData + the PR-143 onLoad effect (and `useEffect`
became unused → removed from the import); reads from the query; the favorite
toggle keeps its optimistic `saved`-map update via `patchSaved`. `decks` memoized.
Community is used by BOTH teachers and students (the `isStudent` branch only
gates the classes fetch) → teacher-verifiable.

**Deferred — `Favorites.jsx`** (the standalone "see all favorites" page) is
reached from the **student** MyClasses, so it pairs with the student-side pages
(needs a student session to verify). Teachers see their favorites in the Decks
page's Favorites tab (already migrated in 170a), so the standalone page is
student-facing.

**170 progress:** ✅ setup · Decks · MyClassesTeacher · ClassPage · Community.
**Remaining (teacher-verifiable):** Notifications, Profile/misc (Director likely
needs a director-role account — check before relying on the teacher login).
**Student-session-needed:** MyClasses, Favorites. **Last + riskiest:** SessionFlow
(sessions + realtime) → then 170g removes the App-level `*Tick` counters.

---

## 2026-05-22 — PR 170b (cont.) — ClassPage migrated to React Query

**Status:** ✅ done + merged to main (`bd734ff`). Merged on the user's "dale"
go-ahead (they authorized merge+continue; flagged it as the complex one — they'll
report any issue since the merge is local/revertible). Gates green (typecheck 0 ·
lint 0 errors · 164 tests · build ✓ · e2e public 2/2).

**What changed.** `src/hooks/useClasses.js` gained `useClassPage(classId, userId)`
— one cached query (`['classPage', classId]`) wrapping the old 4-fetch load
(class + decks + units + used-deck-ids, incl. the not-found / not-owner bounce) —
and `useClassPageCache()` with `patchClassObj`/`patchDecks`/`patchUnits` (value or
updater) + `invalidate()`.

`ClassPage.jsx` (the most complex page so far): dropped the 6 data `useState` +
the **`refreshTick` refetch counter** + the load effect. The **5 `refreshTick`
bumps** (close-unit ×2, PlanView onRefresh/onUnitChanged, reopen-unit) AND the
drag-error manual decks refetch all become **`invalidateClassPage()`**. The
optimistic mutations (color ×2, edit, add-unit, move-deck ×2, reorder) keep their
byte-identical updaters via `patch*`. The **`currentUnitIdx` first-load logic**
(was keyed off `refreshTick === 0` inside the load) moved to a `useEffect` on
`[units, notFound]` with a `firstUnitLoadRef` (+ the same documented
exhaustive-deps disable for reading currentUnitIdx without re-triggering).

**One intended behavior change** (noted to the user): refetches (close-unit, etc.)
no longer flash a full-page loader — React Query updates in the background
(`isPending` is only the first load). The data still updates when the refetch
lands.

**Teacher Classes (170b) is now done** (MyClassesTeacher + ClassPage). `MyClasses`
(student view) still needs a student session — deferred. **Next:** 170c
Community/Favorites.

---

## 2026-05-22 — PR 170b — teacher Classes list migrated to React Query, USER-VERIFIED

**Status:** ✅ done + merged to main (`d84d694`). **User-verified** (~30 min
thorough pass, everything good). Gates green (typecheck 0 · lint 0 errors · 164
tests · build ✓ · e2e public 2/2).

**What changed.** New `src/hooks/useClasses.js`: `useTeacherClasses(userId)` wraps
the old inline load (classes + per-class deck/student counts) in one cached query
(`['teacherClasses', userId]`, `enabled: !!userId`); `useTeacherClassesCache()`
exposes `patchClasses` (accepts a value OR an updater, mirroring `setClasses`).
`MyClassesTeacher.jsx`: dropped the 4 data `useState` + the load effect; reads the
3 datasets from the query (`isPending` → `loading`); the 4 mutation sites
(drag-reorder, create, import, theme-save) keep their byte-identical optimistic
updates via `patchClasses`. Same proven pattern as 170a/Decks; behavior-preserving
by construction.

**Scope note — teacher pages first.** The user's test account is a **teacher**, so
the loop covers teacher-verifiable pages. `MyClasses.jsx` is the **student** view
(join-by-code, saved decks, progress) → needs a student session; deferred. 170b's
remaining teacher page is **ClassPage** (next).

**The recurring user observation, RESOLVED (not a bug, not ours):** the "Worth
reviewing today" deck cards showing a muted bg (vs white "Your plan for today"
cards) is in **`SessionFlow.jsx`** (teacher home, `SuggestedCard` ~:1620) and is
**intentional + documented in the code** — `background: C.bgSoft` "so the card
sits one shade back … marking this as supporting content." Untouched by any
react-query work.

**Next:** ClassPage (teacher class detail). ⚠️ More complex — it has a LOCAL
`refreshTick` counter (App.jsx:458-style) used as a refetch trigger, plus a
`currentUnitIdx` "first load vs refetch" branch keyed off `refreshTick === 0`.
Migration replaces refreshTick bumps with `invalidateQueries` and needs a
first-load ref to preserve the currentUnitIdx behavior. (This local refreshTick is
separate from the App-level `studentMembershipTick`/`activeSessionTick` that 170g
removes.)

---

## 2026-05-22 — PR 170a (cont.) — Decks page migrated to React Query, USER-VERIFIED

**Status:** ✅ done + merged to main (`258dac2`). **Verified by the user logged in**
(test teacher account) — the loop worked: I wrote it on a branch, the user smoke-
tested every flow, all good. Gates green (typecheck 0 · lint 0 errors · 164 tests
· build ✓ · e2e public boot 2/2).

**What changed.** New `src/hooks/useDecks.js`:
- `useDecksPage()` — ONE cached query (`['decksPage']`) whose queryFn is the old
  `loadData` body verbatim (auth.getUser → classes → decks → units → favorites),
  returning `{ userId, userClasses, myDecks, allUnits, favoriteDecks }`.
- `useDecksCache()` — `patchMyDecks`/`patchFavorites` = `setQueryData` helpers.

`Decks.jsx`: dropped the 6 data `useState` + `loadData` + the PR-143 `onLoad`
effect; the 4 datasets (memoized — see below) + `userId` now come from the query;
the **7 mutation sites** (remove-favorite, customize, delete, publish ×2, reorder,
and the editor's `onCreated`) kept their **byte-identical optimistic updaters**,
just renamed `setMyDecks`/`setFavoriteDecks` → `patchMyDecks`/`patchFavorites`
(so they patch the cache instead of local state). `activeClassTab` auto-select
moved from inside loadData to a `useEffect` on the classes data.

**Decisions / deviations:**
- **Single page-level query, NOT the README's granular `['decks', filters]`.**
  Lowest-risk faithful migration — the fetch logic is unchanged, so behavior is
  preserved by construction. Granular per-entity queries can come in 170b-g.
- **Memoized the 4 datasets** (`useMemo(() => pageData?.x ?? [], [pageData])`):
  required — `exhaustive-deps` (now `error`, PR 143) flagged that the `?? []`
  fallback hands a fresh array each render, which would thrash the activeClassTab
  effect's deps; also avoids needless child re-renders.
- **Devtools still deferred** (will add lazy/dev-only in 170b).

**User feedback — two NON-issues (both unrelated to this migration):**
1. **"generar con AI → API error 404"** — expected under `npm run dev`: the AI
   endpoint is a Vercel serverless fn in `api/` which Vite does NOT serve (needs
   `vercel dev` + secrets). This migration didn't touch `api/` or the editor's AI
   call. Not a regression.
2. **"worth review today" decks show the bg color, not white** — that section is
   in **`StudentJoin.jsx`** (the student practice view: "your plan for today" /
   "worth reviewing"), a DIFFERENT page the Decks migration never touched. Pre-
   existing styling; the user confirmed it reads fine (differentiates the two
   groups). Confirmed by grep — those strings are not in `Decks.jsx`.

**Next:** 170b (Classes — MyClasses/ClassPage) via the same loop (branch → user
verifies logged in → merge). Internal order after: c/e/f parallelizable, d
(sessions/realtime) highest-risk, g (`*Tick` removal) after b+d.

---

## 2026-05-22 — PR 170a done (SETUP ONLY); React Query provider. Page migrations deferred

**Status:** ✅ done + merged to main (`3853d43`). **Scoped to the setup step** —
the per-page data migrations (Decks + 170b-g) are deferred (reason below). Gates
green (typecheck 0 · 164 tests · build ✓ · lint 0 errors · e2e 2 passed/5 skipped
— the e2e public boot is the real proof the new provider mounts cleanly).

**Done — setup.** Installed `@tanstack/react-query` (v5) and mounted
`QueryClientProvider` around `Root` in `main.jsx` (real tree:
`StrictMode > SentryErrorBoundary > ToastProvider > QueryClientProvider > Root`).
QueryClient defaults: `staleTime 30s`, `gcTime 5min`, `refetchOnWindowFocus`.
**Deviation:** did NOT install `@tanstack/react-query-devtools` yet — with zero
queries it shows nothing; add it in 170b alongside the first real query (and
lazy/dev-only so it stays out of the prod bundle).

**Deferred — the Decks migration (170a's "POC") + all of 170b-g.** Per the
user-facing fork I raised (login / blind / skip / setup-first) the answer came
back empty, so I took the recommended safe default: **setup now, migrate when
verifiable.** Why defer the migration:
- `Decks.jsx` is **authed and not smoke-testable here** (no login; safety rule
  forbids entering passwords). Its data layer is **not "~8 simple calls"** — it's
  a `loadData` that hydrates **4 state slices** (`myDecks`, `favoriteDecks`,
  `allUnits`, `userClasses`) consumed across ~1000 LOC of tabs/filters/grouping/
  drag, plus **7 mutations** (insert/delete/update `is_public`/`position`/
  `uses_count`, `saved_decks` delete). Rewiring all of that to `useQuery`/
  `useMutation` blind — getting every queryKey, `enabled` guard and
  `invalidateQueries` exactly right with **no runtime verification** — is the
  high-blast-radius change the master README itself flags as ⚠️ alto.
- The README's verification (list loads, mutation auto-refetches, devtools cache)
  **requires a running authed session.** Build/typecheck/read can't confirm the
  runtime data flow.
- So `useDecks.ts` was **not created** either — an exported hook with no verifiable
  consumer is half-a-feature; defer the hook + consumer together. The mounted
  provider is inert (zero behavior change) and is the genuine prerequisite that
  unblocks 170b-g whenever a test login/staging exists.

**To finish 170 (170a-Decks + 170b-g):** needs a **TEST teacher login or staging**
(never prod — PR 107). With that, each page migrates + smoke-tests in one focused
sub-PR. Internal order: 170a-Decks → b/c/e/f (parallelizable) → d (sessions/realtime,
highest risk) → g (`*Tick` removal: `studentMembershipTick`, `activeSessionTick`),
after b+d.

**Lint follow-up noticed (out of scope, flagged separately):** the PR-168 ESLint
config lacks `react/jsx-uses-vars`, so components used **only in JSX** get false
`no-unused-vars` warnings (e.g. `Root`/`Router` in main.jsx). Adding the rule (from
eslint-plugin-react's recommended) would clear a chunk of the ~400-warning baseline.
A small lint-config PR, not data-layer work.

---

## 2026-05-22 — PR 169 done (L14 only); safe-storage. L4/L6/L12/L13/L19 deferred

**Status:** ✅ done + merged to main (`8c89eb7`). **Scoped to L14** — the other 5
items in this 6-in-1 grab-bag were audited and deferred/dropped (reasons below).
Gates green (typecheck 0 · **164** tests incl. 5 new · build ✓ · lint 0 errors ·
e2e 2 passed/5 skipped).

**L14 — DONE.** New `src/lib/safe-storage.ts` (`safeGet`/`safeSet`/`safeRemove`/
`safeGetJSON`/`safeSetJSON` — never throw on private-mode/quota/SSR) + 5 unit
tests (incl. the throw path). Migrated the **10 silent-swallow** localStorage
sites across 4 files: `App.jsx` (lang init `?.`→safeGet + setLang + 2 residual-key
`removeItem`), `guest-session.js` (save/load/clear ×3), `notifications.ts`
(load/saveDismissed ×2), `ErrorFallback.jsx` (detectLang read). **Left
`tokens.js` untouched** — its write catch intentionally `captureError`s (PR 136);
per the REALITY CHECK, don't silently swallow those. Bonus robustness: App's lang
init/setLang used `window.localStorage?.` (guards undefined, NOT SecurityError) —
safeGet/safeSet now catch the throw too. Verified on the **public path** (e2e):
App lang-init runs on every load, and `/join` exercises `guest-session.loadGuestSession`.

**Deferred / dropped (the REALITY CHECK itself proposed splitting 169a/b/c):**
- **L13 — DROP (audited).** Not "create shared.js" (it exists since PR 29 with the
  primitives `PAGE_A4`/`drawWrappedText`/`fetchImageAsDataURL`/…). The audit shows
  classic/editorial/framed/modern each define their OWN `drawQuestion`/`drawMCQOptions`
  /`drawSectionHeader`/etc. — but these are **intentionally style-specific** (that's
  the point of the 4 visual styles; e.g. modern's take a `sectionCfg` param). Not
  accidental duplication. Lifting more would risk changing printed exam-PDF layouts
  and is **not verifiable here** (PDF output needs a teacher login + deck data).
- **L4 — DEFER.** Replace `qrcode.react`'s `QRCodeSVG` (SessionFlow:3,486,710,743)
  with an inline `<QRSvg>` off the `qrcode` lib (~20KB). The QR is the **student
  join mechanism on a live session lobby** — not smoke-testable here, and the
  README's QRSvg renders **async** (useEffect→setSvg) vs qrcode.react's sync, a UX
  regression risk on the critical path. ~20KB isn't worth a blind swap (bundle's
  real weight is the 3MB font). Revisit with a live session to verify.
- **L19 — DEFER (own sub-PR, per REALITY CHECK).** `CreateDeckEditor.jsx:1282/2833`
  drag-ghost via `outerHTML`/`dangerouslySetInnerHTML` → `@dnd-kit` `DragOverlay`.
  Highest risk: refactors **interactive DnD in the live deck editor** (authed, not
  smoke-testable).
- **L12 — DEFER.** ~30 `key={i}` across 10 files; per the REALITY CHECK **most are
  static lists (safe to leave** — React sanctions index keys there). The only
  valuable changes are lists with local state / reorder, which are the **interactive
  deck-editor/quiz surfaces** — pair them with the L19 sub-PR (same surface, needs
  interactive verification). Changing keys blind where the "stable id" isn't truly
  unique would introduce remount bugs on authed pages.
- **L6 — DROP/DEFER.** Trimming `// PR NN.M:` comments is **subjective + huge-churn +
  removes load-bearing archaeology** (the codebase leans on these for context). Git
  history is the real changelog; a generated `CHANGELOG.md` from commits is a better
  future approach than hand-trimming inline comments.

---

## 2026-05-22 — PR 143 done (PARTIAL M9); useEffectEvent + exhaustive-deps=error

**Status:** ✅ done + merged to main (`537a0f9`). **PARTIAL M9** — enforcement +
the clean conversions are done; the realtime/quiz-core suppressions keep
documented disables (conversion deferred). Gates green (typecheck 0 · **159**
tests incl. 3 new · build ✓ · **`npm run lint` 0 errors / 405 warnings** with
the rule now at error · e2e 2 passed/5 skipped).

**Real landscape (bigger than the README's "31 disables"):** the new ESLint
(PR 168) surfaced **~43** exhaustive-deps sites — **28** active suppressions
(comment + real violation; mostly StudentJoin/SessionFlow realtime), **15**
*unsuppressed* missing-dep warnings (the classic `useEffect(() => loadX(), […])`
fetch pattern), and **3** dead directives.

**What this PR did:**
1. **Polyfill `src/hooks/useEffectEvent.js`** (React 18.2 — the native hook is
   experimental/unexported in 18.2) + **3 unit tests** (stable identity, latest
   closure, arg forwarding). Built on `useInsertionEffect` so the ref is current
   before any effect calls the event. **Important gotcha:** eslint-plugin-react-
   hooks v5.2 does **NOT** recognize a *userland* `useEffectEvent`, so the stable
   event MUST be listed in the dep array (e.g. `[profile?.id, onLoad]`) — harmless
   because its identity never changes, and the lint then passes.
2. **Deleted the 3 dead directives** (StudentJoin 889/1124/1186 — ESLint confirmed
   they suppressed nothing; all deps already present).
3. **Converted the 6 CLEAN fetch effects** (Decks:140, Community:73, Favorites:47,
   MyClasses:95+709, Notifications:57) to useEffectEvent. **Behavior-preserving by
   construction:** the effect fires on the same triggers as before and calls the
   latest `loadX` closure (identical to the prior behavior where the effect ran
   after the triggering render).
4. **Added explicit, reasoned `eslint-disable` to the 9 non-clean unsuppressed
   effects** (App:330 auth-subscription + :676 membership, CloseUnitFlow:195+213,
   ClassPage:584, CreateDeckEditor:116, Review:515, StudentJoin:1003 realtime-
   channel + :1224 unlocks) — **zero behavior change**; these are inline async /
   subscription effects with intentional partial deps whose useEffectEvent
   conversion needs runtime verification.
5. **Flipped `react-hooks/exhaustive-deps` to `error`** in eslint.config.js. Every
   violation is now either fixed or explicitly suppressed, so any NEW unsuppressed
   one fails CI (the actual M9 enforcement win) — achieved WITHOUT touching
   realtime behavior (existing suppressions stay green as reviewed choices).

**Deferred (documented follow-up):** the **28 pre-existing active suppressions'**
useEffectEvent conversion — overwhelmingly **SessionFlow + StudentJoin realtime
channels / quiz loop** (plus App:493/533, AdminAIStats:144, PDFExportModal:439,
PlanView:1262, SessionInsightBar:86, CreateDeckEditor:660, GuestJoin:70 mount-only,
Decks:174 focus-class). Each is an individual semantic judgment in code that needs
a **live session + teacher/student login to smoke-test** (realtime re-subscribe
timing, StrictMode double-mount) — exactly the constraint that deferred 143
originally. The error-flip already gives the enforcement; the conversions are
cosmetic cleanup, best done with a staging env.

**Verification (per the can't-log-in / can't-run-realtime constraint):** the 6
conversions + 9 suppressions are all on **authed/realtime surfaces not browser-
smoke-testable here**. Relied on: behavior-preserving-by-construction for the
conversions; the **lint-at-error net** (a botched conversion that still missed a
dep would now FAIL lint, not pass silently); typecheck; **159 unit tests** (incl.
the polyfill's 3); build; and e2e public (confirms the shell/public flow didn't
regress — the converted pages are lazy authed routes, not reachable login-free).
The polyfill itself is directly unit-tested.

---

## 2026-05-22 — PR 168 done; GitHub Actions CI + ESLint (H22 pt 3) — UNBLOCKS PR 143

**Status:** ✅ done + merged to main (`5e9fd2a`). Closes H22 part 3. Gates green
(typecheck 0 · 156 unit tests · build ✓ · e2e 2 passed/5 skipped · `npm run
lint` 0 errors). **This is the ESLint prerequisite PR 143 (M9) was deferred on —
143 is now unblocked and is next in Batch K.**

**Two GitHub Actions workflows (`.github/workflows/`):**
- `ci.yml` — 5 jobs (typecheck, lint, test, build, e2e) on node 22, `npm ci` +
  `cache: npm`. build uploads `dist/`. **e2e is `continue-on-error: true`** for
  v1: the public specs run against the dev server with **throwaway Supabase env**
  (`${{ secrets.E2E_* || 'dummy…' }}` — needed because `supabase.ts:16` throws +
  paints an overlay if `VITE_SUPABASE_URL/ANON_KEY` are empty, and PublicHome/
  GuestJoin don't call Supabase on load so dummies are safe), while the authed
  specs stay `test.skip`. Per the REALITY CHECK: dropped the fictional
  `MOCK_ANTHROPIC`; secrets + branch protection are manual GitHub-UI steps left
  as follow-ups (see below).
- `pr-validation.yml` — conventional-commit PR-title check
  (`amannn/action-semantic-pull-request@v5`); `types` mirror CONTRIBUTING.md +
  `ci`/`revert`. Confirmed `CONTRIBUTING.md` exists (documents the convention).
  Only fires on real GitHub PRs (project also merges locally) — dormant but ready.

**ESLint (the load-bearing part — unblocks 143):** flat config `eslint.config.js`
(repo is `"type":"module"`), devDeps `eslint`+`@eslint/js`+`eslint-plugin-react`+
`eslint-plugin-react-hooks`+`globals`. **Pinned to the ESLint 9 line** — ESLint 10
just shipped but `eslint-plugin-react@7.37` peer-caps at eslint `^9.7`, so a bare
`*` install conflicts (`@eslint/js@10` vs `eslint@9`); installed `eslint@^9` etc.
explicitly. `lint` script = `eslint .`.
- **`react-hooks/exhaustive-deps` = `warn`** (NOT error — ~30 live suppressions
  in realtime/quiz core; error would red CI before 143 triages them). 143 will
  convert them to `useEffectEvent` and flip this to `error`.
- **`react-hooks/rules-of-hooks` = `error`** — and it caught a **real bug**:
  `Avatar()` in `src/components/Avatars.jsx` called `useMemo` (gradId) *after* the
  `if (photoUrl) return …` early return → a conditionally-called hook. If an
  Avatar instance toggled `photoUrl` across renders (e.g. add/remove profile
  photo while mounted), React would throw "rendered fewer/more hooks". Fixed by
  hoisting the `avatar`/`renderer`/`gradId` derivations above the early return
  (behavior-preserving; verified by the PR-166 `Avatars.test.jsx` + build).

**Lint scope decisions (keep CI green on a never-linted ~30k-LOC repo):**
- Lint **`src/` `.js`/`.jsx` only**. `.ts/.tsx` are NOT linted (no
  typescript-eslint parser installed — matches the documented dep list; `tsc
  --noEmit`/typecheck already covers TS, and all exhaustive-deps suppressions
  live in `.jsx`). Full type-aware linting is a follow-up.
- `js.configs.recommended` is on, but `no-unused-vars` and `no-empty`
  (`allowEmptyCatch`) downgraded to **`warn`** so the never-linted baseline
  (**423 warnings, 0 errors**) doesn't block CI. The exhaustive-deps warnings in
  that baseline are exactly the M9 targets for 143.

**Manual GitHub-UI follow-ups (cannot be done from a local worktree):** (1) add
repo **secrets** `E2E_SUPABASE_URL/ANON_KEY/TEACHER_EMAIL/PASSWORD` pointing at a
**dedicated TEST Supabase project — NEVER prod** (PR 107 lesson); enabling them
also lets the 5 authed `e2e/authed.spec.ts` scaffolds be un-skipped. (2) **Branch
protection** on `main`: require `typecheck`/`lint`/`test`/`build`; add `e2e` +
flip its `continue-on-error` off once the secrets exist.

---

## 2026-05-22 — PR 167 done (foundation); Playwright e2e + public flows (H22 pt 2)

**Status:** ✅ done + merged to main (`132bb3d`). **Foundation + public flows**
(the user picked this option); authed flows scaffolded `.skip`. Gates green
(typecheck 0 · 156 unit tests · build ✓) + **e2e: 2 passed / 5 skipped**.

Set up `@playwright/test` + `playwright.config.ts` (chromium; `webServer = npm
run dev` :3000) + `test:e2e`/`test:e2e:ui` scripts + `e2e/` + `.gitignore`
artifacts. **`vite.config.js`: scoped Vitest `include` to `src/`** — Vitest's
default include also matches `*.spec`, so without this it would try to run
Playwright's `e2e/*.spec.ts` (which import `@playwright/test`) and fail.

- **`e2e/public.spec.ts` — RUN + passing (2/2):** PublicHome landing +
  `/join` guest screen. No auth, no data writes → safe in CI without a backend.
  Selectors verified against the real components (PublicHome/GuestJoin i18n).
- **`e2e/authed.spec.ts` — 5 `test.skip` scaffolds** (sign-up, login,
  deck-create, session+join, student question types). They WRITE data, so they
  need a dedicated **TEST Supabase project + teacher creds — never prod** (PR 107
  lesson). I have neither (and can't enter passwords), so they're skipped with
  TODOs; `e2e/README.md` documents enabling them.

**Per the REALITY CHECK:** `MOCK_ANTHROPIC` is fictional + the `api/` serverless
path doesn't run under `npm run dev`, so **insight-generation is NOT e2e-scaffolded**
(noted for a stubbed-webhook integration test later). The Playwright **MCP
browser** (used for QA in earlier PRs) ≠ this committed `@playwright/test` suite —
this PR delivers the latter. Chromium-only for now (firefox/webkit later).

**Follow-up:** enabling the authed e2e (and having PR 168 CI run them) needs a
user-provided TEST Supabase project + `E2E_TEACHER_EMAIL/PASSWORD` as CI secrets.

---

## 2026-05-22 — PR 165; L15 done, L11 no-op, L17 deferred — Batch J COMPLETE

**Status:** ✅ merged to main (`a67a182`). Gates green (typecheck 0 · 156 tests
· build ✓). This was a 3-item grab-bag; outcomes differ per item.

**L15 (allowMixedContent) — DONE.** `capacitor.config.ts`:
`android.allowMixedContent` is now `process.env.NODE_ENV !== "production"`
(HTTP-in-WebView only for local livereload; release disables it for the Play
Store). Per the REALITY CHECK: it's under `android:`, NOT a `server:` block
(there is no server block) — edited in place. **Caveat:** `process.env.NODE_ENV`
resolves when the **Capacitor CLI** compiles the config at `cap sync` time, so
release builds must run `cap sync` with `NODE_ENV=production`. **Safe default:**
NODE_ENV unset → `true` = current dev behavior (no regression). Not
web-smoke-testable (native config); verified the expression typechecks.

**L11 (`ios/App/Pods/` in .gitignore) — NO-OP.** Already documented correctly
(`.gitignore:8-16`: android/ committed, iOS Pods/build ignored for a future iOS
target). The finding's premise (an unmanaged ignore) is already handled — no
change.

**L17 (un-dismiss a dismissed insight) — DEFERRED.** Low severity, and the fix
spans two unverifiable layers + a UX decision: (1) `api/session-insight.js`
PATCH only dismisses — `:81` 400s if `dismiss` is falsy, `:87` hardcodes
`dismissed_at = now()`; it needs to accept `dismiss:false → dismissed_at = null`
(api/ isn't smoke-testable here, and exercising it writes prod data). (2) the
**UI**: `SessionInsightBar.jsx` `return null`s when dismissed (`:110`), so a
"restore" affordance can't live in the bar — it needs a new "show dismissed"
entry point in `SessionRecap.jsx`, which is a product/UX decision + an authed
surface I can't verify. Documented path for a focused follow-up (ideally with a
teacher login + the api/ change applied/verified server-side).

**Batch J COMPLETE:** 157 ✅ · 158 ✅ · 162 ✅ · 164 ✅ · 165 (L15 ✅, L11 no-op,
L17 deferred). 156 deferred · 159/160/161/163 skipped.

---

## 2026-05-22 — PR 164 done; repaired UTF-8 mojibake in 4 components (L10)

**Status:** ✅ done + merged to main (`67d053a`). Closes L10. Gates green
(typecheck 0 · 156 tests · build ✓ — the build parsing all four files is the
key proof the byte-level edits didn't break syntax).

Four files were double-encoded (Latin-1/cp1252 → re-read as UTF-8) + had a UTF-8
BOM: `RoleOnboarding`, `ClassCodeModal`, `LobbyThemeSelector`, `AddToSlotModal`.
Repaired to clean UTF-8, BOM stripped.

**The "comment-only, no UX" note (cleanup + REALITY CHECK) was WRONG** — there
were real user-facing bugs:
- `LobbyThemeSelector` rendered a broken `âœ“` and `MarÃ­a R.` (now `✓` /
  `María R.`).
- **`AddToSlotModal`'s inline `lang === 'ko'` strings were corrupted Korean**
  (`:484/:487/:500`) — KO users saw garbage in the add-to-slot modal. Now valid
  한글 (verified the recovered codepoints are real Hangul, e.g. `새 워밍업 만들기`).
- The rest (Spanish dev comments + box-drawing dividers) is cosmetic — comments
  are stripped in the prod build.

**Approach (per the REALITY CHECK — no blind iconv):** the corruption is lossy-
looking (cp1252-undefined bytes stored as C1 controls) and mixed with **genuine
non-ASCII** (`∈` at `RoleOnboarding:74`, valid Korean). A blanket recode would
destroy those. Used a **byte-level cp1252 reverse** (`cp≤0xFF → byte`, else
`cp1252 → byte`, then decode UTF-8) for the 3 all-mojibake files, and a
**surgical mojibake-sequence map** for RoleOnboarding (it has genuine Latin-1 +
`∈`, so the byte-reverse breaks on it) — preserving `∈`. Verified via
throwaway Python probes (dry-run → confirm clean decode → apply); git grep finds
zero mojibake markers afterward.

**`.gitattributes`:** exists with `* text=auto eol=lf` + explicit `*.jsx … eol=lf`
(its comment even names these 4 as the former CRLF offenders). Did **NOT** add
`working-tree-encoding=UTF-8` — that's for *non-UTF-8* working trees; these files
are UTF-8, so it'd be wrong. eol=lf already covers line endings.

---

## 2026-05-22 — PR 162 done; Sidebar "active session" label → centralized i18n (L5)

**Status:** ✅ done + merged to main (`a91a110`). Closes L5. Gates green
(typecheck 0 · 156 tests · build ✓).

`Sidebar.jsx` had a hardcoded `lang===` ternary for the active-session label
(`"Active session"` / `"Sesión activa"` / `"진행 중인 세션"`). Added a new
**`sidebar`** i18n namespace (en/es/ko) and **wired `useT` into Sidebar for the
first time** — `activeSessionLabel = t.activeSession` (same strings, relocated).

**Per the REALITY CHECK:** the README's "other Sidebar strings already use i18n"
was false — Sidebar used **no `useT`** (only a `lang` prop). Only one
translatable string existed (`:390`); the other `lang === code` expressions
(`:628-630`) are language-picker selection-state checks, not strings — left
untouched. Verified by typecheck (the `Locale` type + locale-parity test enforce
the new namespace's parity); the label itself is authed + only shows with an
active session, so not browser-smoke-tested (relocation of identical strings via
the already-proven `useT`).

---

## 2026-05-22 — PR 160 (M28) ⏭️ SKIPPED — `persistence: "memory"` is intentional

**Status:** ⏭️ skipped — no code change (user decision). M28 stays open by
design.

M28 frames PostHog's `persistence: "memory"` as a defect ("breaks pre-login
funnels"), but it's a **deliberate privacy/compliance choice** documented right
in the code (`analytics.ts:74`): *"No cookies — usa solo memory storage. Esto
evita el banner GDPR y mantiene compliance simple."* The lost pre-login funnel
continuity is a **known, accepted tradeoff** (the code notes `identify()` at
login restores post-auth continuity).

Switching to `localStorage+cookie` would set a 365-day persistent tracking ID
**without a consent banner**, on a product used by **students (potential minors
→ COPPA / GDPR-K)**, reversing that decision and contradicting the team's
privacy-first posture (cf. sentry.js: no email/name/student data). Per the
user's call, **keep `memory`**. If pre-login funnels are ever wanted, the
correct path is `localStorage+cookie` **+ an opt-in consent flow**
(`opt_out_capturing_by_default: true` then `opt_in_capturing()`), not flipping
the flag bare. (Same "intentional choice misframed as a bug" pattern as the
159/161/163 skips.)

---

## 2026-05-22 — PR 158 done; stop dropping network errors in Sentry (M15)

**Status:** ✅ done + merged to main (`cb50a1d`). Closes M15. Gates green
(typecheck 0 · 156 tests incl. 5 new · build ✓). **Unit-test verified.**

`beforeSend` was dropping `NetworkError` / `"Failed to fetch"` events — exactly
what we want to see (CORS, Vercel down, offline). Now those are **kept and
tagged `kind:network`** (so the dashboard can still filter them if noisy).

**Per the REALITY CHECK (README's replacement was wrong):** kept **all three**
filters and only changed filter 1. The README's "Reemplazar" block would have
silently dropped filter 2 (Capacitor `cancelled`/`user_cancelled`) and narrowed
filter 3 (ResizeObserver) — left both untouched.

**Verification approach:** Sentry is a no-op in dev / without a DSN, so
`beforeSend` can't be exercised live. Extracted it to a pure
**`lib/sentry-filters.js`** (`beforeSendFilter(event, hint)`) and wired
`beforeSend: beforeSendFilter` into `Sentry.init`; **5 unit tests** pin all
three filters + the M15 tag (incl. both the `NetworkError` name and
`Failed to fetch` message checks) + existing-tag preservation + null-safety.
Same extract-for-testability pattern as PR 149's `resolveInitialLang`.

---

## 2026-05-22 — PR 157 done; class code entropy 1→3 letters (L21). PR 156 deferred.

**PR 157 status:** ✅ done + merged to main (`7377f05`). Closes L21. Gates green
(typecheck 0 · 151 tests · build ✓). **The user ran the SQL in prod via the
Supabase SQL editor** (got ahead of the queue); this PR verifies it's safe and
records it in the repo.

`generate_class_code` now appends **3 random letters** (26³ = 17,576 per
subject+grade) instead of 1 (26), closing the enumeration vector. Format goes
`MATH-8B` → `MATH-8-ABC`.

**Verified safe before blessing it:** same signature `(p_subject, p_grade)` →
the frontend `rpc("generate_class_code")` (CreateClassModal + class-import) is
unchanged; `CREATE OR REPLACE` preserves the existing grants/owner; existing
class codes (old format) are untouched; and nothing validates the code format —
grepped the whole frontend (no `CLASS_CODE_REGEX`, codes are only generated,
displayed, copied, and passed verbatim to `join_class_by_code`, which matches by
exact case-insensitive value with only a non-empty check). Edge case
(non-numeric grade → empty digit segment → `MATH--ABC`) is **pre-existing** (the
old fn stripped the same way), not a regression.

Tracked as **migration `20240101000061`** + **schema.sql synced** + i18n example
placeholder updated (`MATH-8B` → `MATH-8-ABC`, en/es/ko). The function is a
read-only generator (no writes), and class creation exercises it constantly, so
it's effectively live-verified; offered the user a read-only CLI confirmation.

## PR 156 (L20, session PIN) — ⏸️ DEFERRED (not done)

**No robust server-side throttle is feasible**, so deferred. The REALITY CHECK
wanted a throttle inside `join_session`, but the only identity keys SQL can see
are `guest_token` / `student_id`, and the **guest token is client-generated**
(`lib/guest-session.js` `crypto.randomUUID()`) → an attacker rotates it per
attempt and bypasses any per-identity rate-limit. Supabase SQL functions don't
reliably get the **client IP** either (`inet_client_addr()` = the pooler), so
there's no good key. L20 is also low-severity (a session is only joinable while
in lobby/active — minutes — and joining just makes you a random student), and
rewriting the core `join_session` SECURITY DEFINER RPC blind (can't apply or
test prod from here) is high blast-radius for marginal gain. **Recommended fix
is infra-level:** Supabase platform rate limiting, or move the join behind an
edge function that can throttle by IP/header. Keep the PIN at 6 digits (frontend
input is hardcoded to 6 + `?pin=` deep-links). Revisit at the infra layer.

---

## 2026-05-22 — PR 155 done; SHA256 integrity check for font download (M27) — Batch I complete

**Status:** ✅ done + merged to main (`f0c0d9a`). Closes M27. **Batch I complete**
(146–155 + 166 out of order). Gates green (typecheck 0 · 151 tests · build ✓).

`scripts/prepare-fonts.cjs` now SHA256-checks the raw upstream NotoSansKR
download against a pinned hash (right after the TTF magic-byte check, before
subsetting), so a compromised GitHub release / proxy can't ship a trojaned font.

**Per the REALITY CHECK (README written against a non-existent script):**
- Pinned the **upstream `sourceBuf`** (`9e1d729e…b86f76`), NOT the committed
  output — local `pyftsubset` is non-deterministic across tool versions.
- Reused the script's own `https` **`download()`** (the README's `node-fetch`
  snippet isn't a dependency).
- Added the `EXPECTED_SHA256_OVERRIDE` env handling the README's test referenced
  but the code never read (test-only; changes the *expected* value, can't skip
  the check).

**Verification:** got the real SHA + verified the check via a **throwaway probe**
that downloads the live font and runs the exact compare — happy path matches the
pinned value, a bogus expected throws. Did **NOT** run `npm run prepare-fonts` to
completion: it overwrites the committed `src/lib/noto-sans-kr-data.js`, and
without pyftsubset installed it would write the un-subset ~10 MB font. The script
isn't part of `npm run build` (output is committed), so the check is non-blocking
for normal builds.

---

## 2026-05-22 — PR 154 done (PARTIAL); canonical scoring-thresholds.ts + SCORE consolidation (M33)

**Status:** ✅ done + merged to main (`c455735`). **PARTIAL** M33 — the SCORE
axis is consolidated; the retention axis is a documented follow-up. Gates green
(typecheck 0 · 151 tests incl. 4 new · build ✓).

New **`src/lib/scoring-thresholds.ts`** = single source of truth for the **two**
tier axes: `SCORE_TIERS` 80/50 (`scoreTier`, `pctColor(pct, palette)`) and
`RETENTION_TIERS` 70/40 (`retentionTier`). Consolidated the **two byte-identical
SCORE `pctColor` copies** (`class-insights.js`, `deck-stats.ts`) — both now
`export { pctColor } from "./scoring-thresholds"`, so the importing pages
(ClassInsights, DeckResults) are untouched and behavior is identical. Removed the
now-unused `StatsPalette` interface. Boundary values for both axes unit-tested
(39/40/49/50/69/70/79/80/85 + pctColor null).

**The README was HEAVILY drifted — followed the REALITY CHECK, not the body:**
- Kept **TWO axes**. Did **NOT** flip StudentJoin 70/40→80/50 (the README's
  step 3 + commit msg) — 70/40 is the retention *majority*, not an outlier.
- **EXCLUDED `PctCircle.jsx`** — it colors the *miss/wrong* rate (high = red,
  `pct>=50→red`), the inverse of these scales; the README's `isDanger` would
  invert its colors. (Its PR-166 test guards this.)
- Left spaced-repetition's 0–5 SR quality alone (different output, not a tier).

**Deferred follow-up — retention-axis consolidation (NOT done):** these still
inline 70/40 and should move to `retentionTier`: `CloseUnitFlow.jsx:462-463`,
`Director.jsx:18`, `SessionFlow.jsx:1218,1623`, `StudentJoin.jsx:21` (`retCol`),
`spaced-repetition.ts:597,675,950-952`, `unlock-checker.js:61,67`; plus the real
outlier **`MyClasses.jsx:59,964` (80/60 → 70/40)**, a deliberate visual change.
Why deferred: every consumer is an **authed** surface (not browser-verifiable
here), the README itself flags "medium risk, visual," and migrating ~8 files
blind while preserving each one's exact palette mapping would violate the
smoke-test discipline. `RETENTION_TIERS`/`retentionTier` are defined and tested,
so the follow-up is a careful per-file swap (ideally with a teacher login or
staging to eyeball boundary values).

---

## 2026-05-22 — PR 153 done; localized aria-label for MobileMenuButton (M32)

**Status:** ✅ done + merged to main (`b4876c6`). Closes M32. Gates green
(typecheck 0 · 147 tests incl. 1 new · build ✓). **Unit-test verified.**

The hamburger's `aria-label` was hardcoded `"Open menu"`. Now
`useT("mobileMenu", lang).openMenu`. New `mobileMenu.openMenu` in en/es/ko —
**open-only key** (the button has no `isOpen`, so the README's `closeMenu` is
unused, omitted).

**Threading (per the REALITY CHECK):** the component had **no `lang` prop**, so
without threading it the label would silently stay English. Added `lang` to
`MobileMenuButton` (called `useT` *before* the `!isMobile`/`!onOpen` early return
to keep hook order stable) and passed it from both renderers — **PageHeader**
(it already *received* `lang` from every caller but had stopped using it, so
zero caller churn) and **SessionFlow** (`lang` prop in scope at :2403).

**Verification:** extended `MobileMenuButton.test.jsx` — `lang="es"` →
`aria-label="Abrir menú"` (and NOT "Open menu"). The existing "Open menu" test
still passes because EN keeps that string. Real verification without a browser
(RTL covers the actual component + i18n).

---

## 2026-05-22 — PR 152 done; real alt text for informative question images (M31)

**Status:** ✅ done + merged to main (`e0fe570`). Closes M31. Gates green
(typecheck 0 · 146 tests · build ✓).

The 3 **question** images (`CreateDeckEditor:2147`, `StudentJoin:2438` themed +
`:2994` legacy) had `alt=""`. Now `alt = image_alt || q.q || generic` — the
question text is the meaningful description. Added an **`image_alt` text input**
to CreateDeckEditor (wired via the existing `updateQ`; persists alongside
`image_url`, no migration) so teachers can write a precise alt; new
`imageAltPlaceholder` key in the editor i18n namespace (en/es/ko).

**Per the REALITY CHECK:**
- Reused the existing **`questionImageHint`** as the editor's rare generic
  fallback — did NOT invent a `common.*` key.
- **Split the option-image case** (`StudentJoin:2526`, `optImg`) from the
  question images: it stays **decorative `alt=""`** (with a comment), because the
  option is already labelled by its tile-letter (A/B/C) + adjacent `optText` — an
  alt would either duplicate that or wrongly inject the *question* text. Did NOT
  add a StudentJoin generic key (q.q is the alt; `|| ""` guards the rare
  image-only-question edge instead of a missing attribute).
- Fixed all the drifted line refs; left the decorative editor bg-image alone.

**Verification:** typecheck (Locale parity) + locale-parity test + build (the new
editor fragment compiles cleanly). **No browser smoke test** — CreateDeckEditor
(~2800 LOC) and StudentJoin are authed and too prop-heavy to harness
practically; the alt expressions use fields confirmed by reading the render
(`q.q` / `displayedQ.q`), and the input uses the already-proven `updateQ` path.
A future deck-edit smoke test (with a teacher login) could confirm the input +
that a saved image_alt round-trips to StudentJoin.

---

## 2026-05-22 — PR 151 done; align launchAutoHide comment with config (M22)

**Status:** ✅ done + merged to main (`b55bdf7`). Closes M22. Gates green
(typecheck 0 · 146 tests · build ✓). Comment-only change.

M22 was a doc/config contradiction: `capacitor-boot.js` said *"el config tiene
launchAutoHide: false, así que cerramos manual"*, but `capacitor.config.ts:38`
has **`launchAutoHide: true`** (and its own comment confirms the OS hides the
splash). Per Option A (the recommended one), kept `autoHide: true` and corrected
the boot comment: Android auto-hides the splash (~`launchShowDuration` = 500ms);
the manual `SplashScreen.hide()` stays as a **defensive fallback** for devices
where the native auto-hide misfires (the short delay lets React paint first so
the fallback never reveals a blank WebView).

**No config or logic change** — only the misleading comment. Did NOT touch
`launchShowDuration` (README floated 1500; current 500 is intended) nor swap the
catch to `captureError` (the file consistently uses `console.warn` for
non-critical native-plugin failures — kept that convention).

**Verification:** typecheck + build + tests (capacitor-boot is a no-op off-native
via the `isNativePlatform()` guard, so the web dev server can't exercise it). The
actual splash timing would need `cap sync android` + an APK on a device — out of
reach here; flagged.

---

## 2026-05-22 — PR 150 done; avatar onboarding "skip for now" (M20)

**Status:** ✅ done + merged to main (`88009ec`). Closes M20. Gates green
(typecheck 0 · 146 tests · build ✓) + browser-verified (render).

Added a **"Skip for now"** button to `AvatarOnboarding.jsx` so the chooser isn't
a hard gate. It assigns a **random starter** via the `update_my_profile` RPC
(same path as the Continue handler) then calls `onDone`. New `skipForNow` key in
the `avatarOnboarding` i18n namespace (en/es/ko).

**Fixed the README snippet's 3 real bugs (per its REALITY CHECK):**
- Direct `profiles` UPDATE is **RLS-blocked** (PR 92) → used
  `supabase.rpc("update_my_profile", { p_updates: { avatar_id } })`.
- **`'fox'` is not a valid avatar id** → pick a random id from the live
  `startAvatars` list (`AVATARS.filter(a => a.starter)`), which guarantees a
  valid starter without hardcoding and gives skippers variety.
- **`user` not in scope** → the component has `profile`; the RPC needs no id.

**Verification:** rendered AvatarOnboarding on a temporary public route with
stub props — "Skip for now" shows below Continue, the 10-starter grid renders
(so the random pool is valid), 0 console errors. The RPC **success** path
(persist + `onDone`) needs an authenticated session (not reachable in the
harness), but it's a verbatim mirror of the already-working Continue handler.

---

## 2026-05-22 — PR 149 done; navigator.language detection for the App shell (M19)

**Status:** ✅ done + merged to main (`a6f1c9b`). Closes M19. Gates green
(typecheck 0 · 146 tests incl. 5 new · build ✓) + browser-verified.

**Narrow, per the REALITY CHECK.** `navigator.language` was already used by
`PublicHome` + `GuestJoin`; the only gap was the **authed App shell's `lang`
initializer** (defaulted to `"en"` without consulting the browser). Now the
chain is **saved localStorage → navigator.language → "en"**; `profile.language`
still overrides on login (App.jsx ~743/778).

**Deviation — extracted a pure helper, NOT the README's `useLocaleDetection`
hook.** The REALITY CHECK explicitly warned the hook/`useMemo` would regress
Settings' `setLang` + localStorage persistence, and said "keep `lang` a
`useState`." So I kept the `useState`, but pulled the detection chain into a
**pure function** `resolveInitialLang({saved, navigatorLang})` in
**`src/lib/locale.ts`** (not a hook — fully respects the constraint). Why
extract at all instead of inlining: the preview browser can't emulate a
non-English locale, so the `navigator → es/ko` branch isn't browser-testable —
a pure helper makes it **unit-testable** (5 tests: precedence, ko/es fallback,
region-strip + lowercase, unsupported→en, defaults). Added `.toLowerCase()` for
robustness (PublicHome's inline copy omits it; harmless, stricter).

**Verification:** 5 unit tests for the chain + browser integration on the dev
server — `clasloop_lang=ko` → `<html lang="ko">` (saved wins); cleared
localStorage + `navigator.language="en-US"` → `<html lang="en">` (navigator
branch ran). 0 console errors.

**Closes the PR 145 gap:** 145 owns the `documentElement.lang` write effect, 149
owns the initial-value detection (split on purpose). An unauthenticated
browser-Spanish visitor with no saved pref now gets `<html lang="es">`. (Did NOT
dedupe PublicHome's own inline chain — it has an extra `?lang=` URL step and
M19 doesn't ask for it; left as-is.)

---

## 2026-05-22 — PR 148 done; modal backdrop keyboard-accessibility verified (M18)

**Status:** ✅ done + merged to main (`4e9bffd`). Gates green (typecheck 0 ·
141 tests incl. 1 new · build ✓). As the REALITY CHECK predicted, this is a
**verification PR** — M18's fix already shipped in the PR 146 primitive.

**No primitive change.** M18 ("backdrop is a clickable `<div>`, not
keyboard-accessible / not announced") is satisfied by Modal.jsx: **Escape**
closes (the WCAG SC 2.1.1 keyboard path), the dialog carries `role` +
`aria-modal`, and the backdrop is a **roleless `<div>` with no `tabindex`** so it
never enters the tab order. Added one explicit Modal test
(`Modal.test.jsx`, +15 lines) locking the "backdrop is not a tab stop" guarantee
— **non-redundant**: the existing focus-trap test would NOT catch a regression
that made the backdrop focusable, because the trap only cycles focusables
*inside* the dialog, never the backdrop.

**Option B declined** (README floated converting the backdrop to an invisible
`<button aria-label="Close">`). Escape already satisfies the keyboard
requirement; a roleless full-screen button adds complexity (must `tabIndex={-1}`
it out of the trap, and screen readers announce a "Close" button that's visually
just the dim overlay) for no real accessibility gain. The README itself
recommended against it.

**Scope:** M18 is closed for modals using the primitive (CreateClassModal). The
8 modals PR 146 deferred still have the raw `<div onClick>` backdrop — closing
M18 for them is the **same migration follow-up as PR 146**, not separate work.

---

## 2026-05-22 — PR 147 done; MobileBlockedScreen + removedToast → centralized i18n (M17)

**Status:** ✅ done + merged to main (`1bfb741`). Closes M17. Gates green
(typecheck 0 · 140 tests · build ✓) + browser-verified.

Added namespaces **`mobileBlocked`** `{title,body,cta}` and
**`removedFromClass`** `{withClass,withoutClass}` to `en/es/ko.ts` — the exact
strings relocated from the inline objects, **no translation change**.
`MobileBlockedScreen.jsx` now uses `useT('mobileBlocked', lang)`; the
`removedToast` block in `App.jsx` uses **`getStrings('removedFromClass', lang)`**.

**Two small calls:**
- **`getStrings`, not the `useT` hook, for the toast** — it renders inside an
  IIFE (`{removedToast && (() => {…})()}`), not at the component top level, so a
  hook would violate the rules-of-hooks. `getStrings` is the non-hook accessor
  the i18n module exposes for exactly this. `role="status"`/`aria-live="polite"`
  preserved.
- **Did NOT extract `RemovedFromClassToast.jsx`** (the README floated it, citing
  PR 112's plan). PR 112 deliberately deferred that extraction; M17 only asks to
  de-duplicate the i18n, which the in-place `getStrings` does. Extraction stays
  an optional follow-up.

**Verification:** MobileBlockedScreen renders on the **public `/join`** route at
mobile width (no auth needed) — confirmed en/es/ko (title + CTA) in the browser,
0 console errors. The `removedToast` is a pure string relocation but isn't
runtime-triggerable without auth + a second teacher removing a student; it's
covered by typecheck (the `Locale` type) + the locale-parity test (key parity)
+ the unchanged `.replace("{class}", …)` / role / aria.

---

## 2026-05-22 — PR 146 done; Modal a11y primitive + CreateClassModal adoption (H23, PARTIAL)

**Status:** ✅ done + merged to main (`fdaa555`). H23 **partially** addressed
(primitive + 1 of 9 modals). Gates green (typecheck 0 · 140 tests incl. 9 new
Modal tests · build ✓) + browser-verified live. First PR of Batch I.

New **`src/components/Modal.jsx`**: focus trap, return focus, initial focus,
`role` prop (default `"dialog"`), `aria-modal`, `aria-labelledby/describedby`,
Escape + backdrop close gated by **`canClose`**, body scroll-lock, portal.
**CreateClassModal** adopts it (gained dialog role + aria + trap + return-focus
+ Escape — it had none).

**Deviation — style-flexible primitive, NOT the README's white box.** The
README's primitive hardcodes `background:'white'`, `maxWidth:480`, `padding:24`,
`zIndex:1000`. Forcing the real modals into that would (a) break theming (they
use `C.bg`/custom borders), (b) drop the `!deleting`/`!saving` guards
(DeleteAccountModal/DayDateModal close-suppression → could close mid-op), and
(c) change zIndex. Instead the primitive is visually neutral: callers pass their
own `backdropStyle`/`dialogStyle` (applied as-is) + `dialogClassName` (preserves
`ns-fade`), and **`canClose`** replaces the per-modal guards. So adoption is a
wrapper swap with **zero visual change**. Also: README's "PDFExportModal already
has focus traps" was false (Escape handler only); and **no** modal in the repo
had a focus trap or return-focus (the accurate, stronger framing of H23).

**Scope — 1 of 9 migrated, 8 deferred (decision, not omission).** Migrated only
CreateClassModal (simplest, 134 LOC, lacked role/aria). Deferred: DeleteAccount,
EditClass, ClassCode, DayDate, AddToSlot, ImportClass, **StudentsModal** (has a
*nested* alertdialog — stacked-modal focus interaction needs runtime checking),
**PDFExportModal** (832 LOC). Why defer: **all 9 modals are behind the teacher/
student login, and I can't authenticate to smoke-test them** (the safety rule
forbids me entering passwords). Bulk-migrating ~3700 LOC of large modals I can't
runtime-verify would violate the "don't skip real smoke tests" discipline. The
*primitive itself* — what PR 148 depends on — is done and fully verified.

**Verification (login-free, real):** built a throwaway harness on a temporary
public route (`/__modal_test`, since deleted) + drove it with the preview
browser: role/aria set, initial focus enters dialog, Tab/Shift+Tab trap both
directions, Escape closes + returns focus to opener, `canClose=false` suppresses
Escape AND backdrop close. Rendered the **real CreateClassModal** in that harness
too (autofocus + `ns-fade` preserved, trap works). After PR 166 landed RTL/jsdom,
added a permanent **`Modal.test.jsx`** (9 tests, commit `64837da`) covering the
same mechanics. (Screenshot tool timed out on the open fixed overlay — non-fatal;
visual fidelity is guaranteed by passing identical style objects.)

**Concurrency note:** PR 166 (RTL setup) was being built **in the same working
tree at the same time**. Isolated PR 146 by committing only its 2 files via
explicit pathspec; paused the merge per the user; landed it after PR 166 merged
(`5966210`) — clean, no file overlap. (Aside: `.claude/launch.json`, untracked,
gained a `dev` config for future preview verification.)

**Follow-ups:** (1) migrate the remaining 8 modals to `Modal` — now lower-risk
(primitive verified + a Modal test exists); ideally with a teacher login or
staging to smoke-test, and extra care for StudentsModal's nested dialog. (2)
**PR 148** (modal backdrop keyboard a11y) is now unblocked.

---

## 2026-05-22 — PR 166 done (out of sequence); RTL component-test setup + first wave (H22 pt 1)

**Status:** ✅ done. Gates green (typecheck 0 · 131 tests incl. 21 new · build ✓).
Pulled **forward out of order** — the user asked to "install React Testing
Library" while the plan's NEXT was 146/Batch I. PRs 167 (e2e) + 168 (CI) still
cover the rest of H22.

**Setup:** added `@testing-library/react` + `jest-dom` + `user-event` + `jsdom`
(devDeps); flipped Vitest to `environment: 'jsdom'` + `setupFiles:
['./src/test-setup.js']` (jest-dom matchers, RTL `cleanup`, and a
`window.matchMedia` polyfill — jsdom omits it and `useIsMobile` needs it). The 5
existing lib/i18n suites got a `/* @vitest-environment node */` pragma so the
pure-logic tests stay on node (fast; also dodges the `supabase.ts`-under-jsdom
risk the README flagged).

**First wave (21 tests):** `PctCircle`, `Toast`, `ErrorFallback`,
`MobileMenuButton`, `Avatars`.

**Deviations per the README REALITY CHECK:**
- Dropped the **Modal** flagship example — it didn't exist when I started. It
  DOES now (the user landed PR 146 mid-session — see the branch note below), so
  a Modal test is a clean follow-up.
- Dropped the **"forms primitives"** target — PR 139 made style *objects*, not
  renderable components.
- `Sidebar` (router-mocked) deferred to a second wave.

**Test gotcha worth keeping:** the `Toast` close→`onDismiss` test was flaky —
the entering `requestAnimationFrame` (phase `entering`→`visible`) fires *after*
the click, reverting the `leaving` state and cancelling the dismiss timer. Fixed
by waiting for the toast to reach the visible phase (opacity 1) before clicking.

**Branch tangle (concurrency):** the user committed **PR 146** (`d6eaf8d`, Modal
primitive) into the shared working tree mid-session, moving HEAD to
`pr/146-modal-primitive`, so my PR 166 commit first landed there on top of 146.
Untangled per the user's call: cherry-picked PR 166 onto its own branch
`test/pr166-component-tests-setup` (clean base) and moved `pr/146-modal-primitive`
back to `d6eaf8d` via `git branch -f`. Each PR is now its own clean branch off main.

---

## 2026-05-22 — PR 145 done; single `<html lang>` write effect in App.jsx (H21)

**Status:** ✅ done + merged to main. Closes H21. Batch H complete. Gates green
(typecheck 0 · 110 tests · build ✓) + browser-verified on the preview build.

Added one `useEffect(() => document.documentElement.setAttribute("lang", lang), [lang])`
in `App.jsx`, right after the `lang` state / `setLang` (≈line 178). `index.html`
still ships `lang="en"`; the effect updates it post-mount. App is the
always-mounted root (renders both the authed shell and PublicHome), so it is the
**single writer** of `<html lang>`.

**Scoped tight per the REALITY CHECK:**
- **Did NOT add the `index.html` pre-React navigator.language script** (README's
  "part 2") — that's initial-value detection = **PR 149**'s scope (M19). Keeping
  the write in one place avoids duplicating the effect across 145/149.
- **Did NOT add a second effect in `PublicHome.jsx`** despite its separate `lang`
  state (~218). Both states persist to the same `clasloop_lang` key, and a child
  effect would race the parent's write. App owns the single write.

**Verification (login-free, exercises the real mechanism):** `npm run preview`
(:4173); set `localStorage.clasloop_lang` + reload — `<html lang>` followed:
`en` (default) → `ko` → `es`. Since index.html ships `en`, only the effect could
change it. 0 console errors. The authed path uses the *same* `lang` state (App
sets it from `profile.language` on login at App.jsx:743 and from Settings via
`setLang`), so the same effect covers it; couldn't log in without creds, but the
state path is identical.

**Interaction with PR 149 (by design):** on the *unauthenticated* PublicHome,
App's `lang` has no navigator.language detection yet (localStorage only, default
`en`), so a browser-Spanish visitor with no saved pref still gets
`<html lang="en">` until PR 149 adds navigator detection to App's initial value.

---

## 2026-05-22 — Pre-PR-145 cleanup pass (docs + PR-spec accuracy)

**Status:** ✅ done. A read-only deep audit (project state + every pending PR spec
145-170) found the docs and several PR READMEs had drifted from the real code. This pass
realigned them. **No `src/` code changed** — only docs and `PRs/` specs. Resuming point
unchanged: **PR 145**.

**Project docs fixed (git-tracked):**
- `SETUP.md`: dev port `5173` → **`3000`** (vite.config.js:27 — was breaking setup);
  ErrorBoundary nesting (`<App/>` → `ToastProvider > Root`); webhook name →
  `generate-insight-on-session-complete`.
- `README.md`: `routes.js` → `routes.ts` (migrated in PR 133).
- `supabase/functions/generate-insight/README.md`: migration step pointed at a
  non-existent `phase13_session_insights.sql` → real `migrations/20240101000015_*` /
  `schema.sql`; "clasloop-phase1" dir → "clasloop".
- Left historical snapshots untouched on purpose (`ANALYSIS.md`, `ANALYSIS_vs_HANDOFF.md`,
  `docs/*HANDOFF*`, completed-PR specs) — they record past state, not current reality.

**PRs marked ⏭️ SKIP** (banner prepended to each README, NOT deleted — `PRs/` is
git-untracked, so a banner is reversible and keeps the audit trail):
- **159** (`class_members` UNIQUE, M16) — misdiagnosed and dangerous. Joins go only via
  the idempotent `join_class_by_code` RPC (`student_id` never null; returns the existing
  row on rejoin; direct inserts blocked at schema.sql:4234), so the "re-link → UNIQUE
  violation por residue" scenario can't occur, and dropping the `UNIQUE(class_id,
  student_name)` guard would help nothing. Only real (rare) edge: two different auth users
  with the same display name — re-scope to a `student_id` UNIQUE if product wants it.
- **161** (font-weights audit, L3) — already done by PR 71/80. `index.html:33` already
  loads 4 families / ~10 weights; the README's "Noto Sans KR + 22 weights" before-state is
  fictional.
- **163** (`decks.is_public` default, L9) — false premise. Migration `20240101000027` adds
  `profiles.default_deck_visibility`, never touches `decks.is_public`; default already
  `false` (schema.sql:2750).

**PR specs rewritten** — each got a "⚠️ REALITY CHECK (2026-05-22)" block at the top with
corrected files/lines/approach (original body kept for intent):
- High-impact: **154** (two axes 80/50 + 70/40; EXCLUDE PctCircle — folding it in inverts
  its colors; the "StudentJoin outlier" claim is backwards), **150** (direct `profiles`
  UPDATE is RLS-blocked → use `update_my_profile` RPC; `'fox'` is not a valid avatar id),
  **156/157** (don't reinvent `join_session`/`join_class_by_code`; throttle goes inside the
  existing RPC; no frontend `CLASS_CODE_REGEX` exists; format is `MATH-3A`), **158** (keep
  all 3 Sentry filters; only retag the network one), **165** (`allowMixedContent` is under
  `android:`, not a `server:` block; un-dismiss needs `api/session-insight.js` extended),
  **168** (add ESLint here → unblocks 143), **169** (L13 already done — shared.js exists;
  L12 ~30 sites; split L19).
- Line-ref / path / count drift: 145, 147, 149, 152, 155, 160 (`.js`→`.ts`), 162, 164
  (comment-only, no UX), 166 (110 not 98 tests; Modal example targets a component that
  doesn't exist yet), 167 (`MOCK_ANTHROPIC` fictional). Kept-with-note: 146, 148, 151, 153.

**Sequencing:** **143 re-sequenced to run AFTER 168** — PR 168's rewrite now adds ESLint
(`react-hooks/exhaustive-deps` = `warn`), the missing prerequisite for M9.

**PR 170 split** into real folders **170a-g** (`PRs/PR_170a_* … PR_170g_*`): 170a
setup+Decks, 170b Classes, 170c Community/Favorites, 170d Sessions+realtime (highest risk),
170e Notifications/Director, 170f Profile/Settings/misc, 170g remove the two real `*Tick`
counters (`studentMembershipTick`, `activeSessionTick` — there is no `decksTick`), after
170b+170d. The master 170 README is now an overview with corrected facts.

**Index:** `INDICE_PENDIENTES.md` got an "⚡ ESTADO (2026-05-22) — EMPEZAR AQUÍ" section
(real start = PR 145; what's done; the SKIPs; 143-after-168; the 170a-g split) plus inline
SKIP/DEFERRED/SPLIT markers on rows 143/159/161/163/170.

**Tracked vs untracked:** the project-doc fixes + this entry are git-tracked and committed;
the `PRs/PR_*` folders (banners, reality-check notes, 170a-g) stay untracked per the
existing convention.

---

## 2026-05-22 — PR 142b done; extracted _lib/auth.js (M8 now complete)

**Status:** ✅ done + merged to main. Completes M8 (PR 142 did envelopes only;
this does the shared-auth extraction the user re-enabled by installing
`vercel dev`).

New `api/_lib/auth.js`: `requireAuth` (SERVICE_KEY client + getUser),
`requireTeacher` (+ profile.role), `requireDailyRateLimit` (ai_generations DB
count, fail-open). The three endpoints now use them; ~150 LOC of duplicated
boilerplate gone. Kept the **real** pattern (SERVICE_KEY + DB rate limit), not
the README's dangerous ANON+RLS+in-memory sketch.

**One intentional behavior change:** `session-insight` invalid-token code
`invalid_session` → `invalid_auth` (and its config-500 `supabase_not_configured`
→ `server_misconfigured`), unifying with the other two. Clients map by status /
use the error as a flag, not by code text, so it's safe.

**Verifying serverless locally was a saga — notes for next time:**
- `vercel dev` does NOT load local `.env`/`.env.local` for the functions when
  the project is linked; it uses the cloud **development** environment, which
  lacks the secrets → endpoints 500'd no matter what.
- `vercel env pull` returns **blank** values for secrets marked *sensitive* in
  Vercel (SERVICE_KEY, ANTHROPIC_API_KEY, even VITE_SUPABASE_ANON_KEY). Only
  non-sensitive ones (SUPABASE_URL) come through. So you can't get the real
  secret values via pull — the user has to paste them (what the prior chat did).
- **What worked:** a throwaway Node runner that loads `.env.local` into
  `process.env`, sets *dummy* values for the blank-sensitive vars (the
  auth-FAIL cases don't need real ones — a missing/invalid token is rejected
  before any authed query), and invokes the real handlers with mock req/res
  against Supabase prod (read-only). Diffed pre/post: identical except the one
  intentional code change above.
- **Gotcha:** a leftover `.env.local` (from `vercel env pull`) shadows `.env`
  in Vite/Vitest with a blank `VITE_SUPABASE_ANON_KEY`, which made
  `supabase.ts` throw and broke the spaced-repetition test suite. Deleting the
  temp `.env.local` restored 110/110. Always clean up pulled `.env.local`.

Cleanup: temp `.env.local` + runner deleted, `.env` reverted to VITE-only,
vercel dev stopped. `.gitignore` gained `.vercel` + `.env*`.

---

## 2026-05-22 — PR 144 done; helper + targeted application (M21)

**Status:** ✅ done + merged to main. Closes the user-facing leaks of M21;
helper is reusable for the rest. Gates green (typecheck 0 · 110 tests incl. 9
new · build ✓).

New `src/lib/supabase-errors.ts` — `formatSupabaseError(err, lang)` categorizes
Postgres codes / HTTP status / message patterns into a friendly localized
(en/es/ko) message and never echoes the raw error. Messages live inline (not in
i18n/) since they're low-level generic fallbacks tied 1:1 to the category.

**Reality vs README:**
- The README's flagship leak — `Scanner.jsx:211` `alert("…" + insertErr.message)`
  — was **already fixed by PR 99/100** (now `toast.error("Error saving scan.
  Try again.", { reportError })` → friendly text + raw error to Sentry).
- So most `.message` usages are NOT M21: **AuthScreen** auth errors are
  intentionally user-facing ("Invalid login credentials"); **CreateDeckEditor**
  maps `AIError` codes to specific i18n already; **AdminAIStats** is admin-only
  (technical detail is fine).
- Applied `formatSupabaseError` to the genuine DB-error leaks that have `lang`:
  **ClassPage** unit-create (was raw `error.message` / English prose) and
  **Review** fetch error (dropped the appended `err.message`).

**Verification:** UI smoke test of error messages isn't feasible (can't force
RLS/unique errors as a normal teacher without breaking data), so instead added
a unit test (9 cases) covering categorization, localization, defaults, and the
M21 invariant — output never contains the raw error text. Stronger than a
single forced-error click.

**Follow-up:** `EditClassModal` / `CreateClassModal` also surface DB errors but
receive `t`, not `lang`; threading `lang` to them (+ their callers) is a small
follow-up to finish M21 everywhere.

**Aside:** `.gitignore` gained `.vercel` (not from this PR — environment/tool
added it; it's correct, left uncommitted).

---

## 2026-05-22 — PR 143 deferred — no ESLint in the repo (M9 prerequisite missing)

**Status:** ⏸️ deferred (NOT done, NOT closed). M9 stays open.

The repo has **no ESLint** — no `.eslintrc*`, no `eslint` dependency, no `lint`
script. So the 31 `// eslint-disable-next-line react-hooks/exhaustive-deps`
comments (13 StudentJoin, 8 SessionFlow, rest scattered across 11 files) are
**decorative** — nothing processes them (likely leftovers from a dev's IDE).

**Why defer rather than do it:**
- M9's actual goal — step 5 of the README, "re-enable exhaustive-deps as
  `error` so future suppressions fail CI" — is **impossible without ESLint**.
  Converting to `useEffectEvent` prevents nothing when there's no lint.
- The cost is high and risky: `useEffectEvent` isn't native in React 18.2 (this
  repo), so it needs the experimental polyfill; and the 31 sites are
  **realtime/quiz core** (SessionFlow live-session channels, StudentJoin quiz
  loop, timers). Each conversion is an individual semantic judgment (some
  suppressions are intentional, some may hide real bugs), not mechanical.
- It's **not smoke-testable locally**: realtime needs a live session + joined
  students; StudentJoin is the student flow (not reachable from a teacher
  session). High blast radius, weak verification.

Net: high risk, ~zero benefit until ESLint exists. **Correct order:** add
ESLint + `react-hooks/exhaustive-deps` in the CI PR (PR 168), THEN convert with
the lint as both the justification and the safety net (and ideally with a
staging env to exercise realtime). Revisit M9 then.

---

## 2026-05-22 — PR 142 partial; envelopes only, NOT the README's _lib/auth.js

**Status:** ✅ done + merged to main. Partially addresses M8. (User chose
"envelopes only, minimum risk" from a 3-way prompt.)

Unified the error envelopes of `generate.js` and `close-unit-narrative.js` from
prose (`'Missing Authorization header'`, `'Only teachers can…'`) to snake_case
codes, matching `session-insight.js` which was already snake. The 429 keeps its
human `message`; config 500s collapse to `server_misconfigured` (also stops
leaking which env var is missing).

**Two reasons the README's `_lib/auth.js` extraction was NOT done:**

1. **The README's auth pattern is wrong/dangerous here.** It sketches
   `createClient(url, ANON, { headers: { Authorization } })` + RLS, and an
   **in-memory** rate limiter. Reality: all 3 endpoints use **SERVICE_KEY**
   (`supabaseAdmin`, bypass RLS — their ownership queries depend on it) and a
   **DB-based** rate limit (`ai_generations` count, 50/day, persists across
   cold starts). Following the README would break RLS and downgrade the limit
   to per-cold-start (≈ineffective on serverless).
2. **`api/` can't be verified the way `src/` can.** `tsconfig` only includes
   `src/`, so `typecheck` skips `api/`; Vite's build skips it too (these are
   Vercel serverless functions); and they don't run under `npm run dev`, so
   there's no local smoke test without `vercel dev`/deploy. Refactoring the
   auth *flow* of 3 security endpoints without runtime verification is too
   risky right now.

**Why envelopes-only is safe:** clients map by **HTTP status** (ai.js: 401/
403/429) or use the error **only as a truthy flag** with a generic i18n
message (CloseUnitFlow shows `t.aiError`), never by the code text. Verified
with `node --check` on both files + a grep confirming no multi-word codes
remain.

**Follow-up:** extract shared `requireAuth`/`requireTeacher`/
`requireDailyRateLimit` (preserving SERVICE_KEY + DB rate limit) once the
endpoints can be exercised in a test/staging environment.

---

## 2026-05-22 — PR 141 partial; extracted getTypeRules, not the .md redesign

**Status:** ✅ done + merged to main. Partially addresses M7. Gates green
(typecheck 0 · 101 tests · build ✓) + the constructed prompt is **byte-
identical** before/after (verified with a throwaway script over 5 inputs).

`ai-prompt.js` (677 LOC) mixed prompt strings with composition logic. Moved the
biggest block — `getTypeRules` (~390 LOC of per-type rules in en/es/ko) — to
`src/lib/prompts/type-rules.js`. ai-prompt.js drops to 283 LOC.

**Deviation — the README's `.md` + `{placeholder}` + `interpolate` approach is
inviable here.** The real prompts are **JS functions with `${}` interpolation**,
in **three languages** (en/es/ko — the prompts themselves are translated, not
just the output), and the system prompt **composes `getTypeRules()` dynamically
inside its own template literal** (`${getTypeRules("en", activityType)}`). A
flat `.md` can't call functions or branch by language/type. Converting `${}` →
`{x}` + a hand-rolled interpolator would rewrite every prompt string — high risk
of silently changing what Claude sees. So instead I moved the strings as-is
into a module, preserving native JS interpolation.

**Scope: extracted only `getTypeRules`** (offered the user A=getTypeRules-only,
B=full split, C=skip; user said "do what's best, I trust you"). Chose A: it's
the largest self-contained block (~60% of the file, called only by
SYSTEM_PROMPTS), so the win is big and the blast radius small. SYSTEM_PROMPTS /
USER_TEMPLATES / labelType / buildSourceBlock stayed in ai-prompt.js — they're
smaller and more entangled with buildPromptParts; a full split (B) is a
reasonable follow-up but moves ~620 LOC for less marginal benefit.

**Verification note:** rather than spend Anthropic API quota generating a deck,
I diffed the output of `buildPromptParts` for 5 representative inputs
(en/es/ko × mcq/mix/slider/tf/sentence) pre/post — identical. That's a stronger
guarantee than one smoke generation: it proves the model input is unchanged.

---

## 2026-05-22 — PR 140 done; migrated to TS with the real return shape

**Status:** ✅ done + merged to main. Closes M5. Gates green (typecheck 0 ·
101 tests · build ✓) + app loads clean after the rename (Playwright, 0 console
errors on a fresh dev server).

`src/hooks/useClass.js` → `src/lib/classes.ts`. Dropped the three dead exports
(`createClass`, `getTeacherClasses`, `deleteClass` — grep confirmed zero
consumers; the only importer, ClassCodeModal, uses just `joinClass`). Took the
README's optional TS migration.

**Minor deviation:** the README's sketched `JoinClassResult { success,
classId, error }` doesn't match what `joinClass` actually returns — it resolves
to `{ class, member }` (the RPC's jsonb) or `{ error }`, and ClassCodeModal
destructures `{ class, error }`. Typed it with the real shape
(`{ class?: unknown; member?: unknown; error?: string }`) rather than inventing
a `success`/`classId` shape that would have broken the consumer. Left `class`/
`member` as `unknown` (no generated DB types — same stance as PR 134).

**Smoke test note:** `joinClass` is the student "join a class by code" path,
not reachable from the logged-in teacher session without creating data, so it
wasn't exercised end-to-end. The change is structural (rename + dead-code
removal + one import) and is covered by build + typecheck + a clean reload.

(Aside: had to restart the dev server — renaming a file under a live Vite
server left a stale HMR reference to the old path; a fresh server is clean.)

---

## 2026-05-22 — PR 139 done; centralized style objects, not React components

**Status:** ✅ done + merged to main. Closes M3. Gates green (typecheck 0 ·
101 tests · build ✓) + Playwright smoke test (CreateClassModal + Settings
render correctly, 0 console errors).

The `inp`/`sel` style objects were copy-pasted across ~10 files with a padding
drift (`10px 14px` vs `11px 14px`). Now there's one
`src/components/forms/field-styles.js` exporting `inputStyle` + `selectStyle`.

**Deviation — style objects, NOT components.** The README proposed React
`<Input>/<Select>/<Textarea>` primitives with label/error/hint. Reality: these
are **style objects** consumed as `style={inp}`, not components. Converting
every call site to `<Input>` + refactoring each form's existing labels into the
primitive is a broad visual rewrite (the README itself flags PR 139
"medium-risk, wide visual change"). Instead I centralized the style objects and
imported them with an alias (`import { inputStyle as inp } from …`) so **call
sites stay byte-for-byte unchanged** — minimal diff, minimal visual risk.
After running the smoke test (per the user enabling Playwright), the unified
inputs look correct.

**Padding drift unified:** the `11px 14px` copies (MyClasses, StudentJoin,
AuthScreen) now use the `10px` standard — a deliberate 1px change to kill the
drift M3 names.

**Deliberate variants left alone:** GuestJoin (larger mobile-entry inputs:
`12px 14px`, radius 10, fontSize 15) and TeacherProfile (compact filter select:
`6px 26px`, fontSize 12, width auto) are intentional, not drift — they keep
their own local styles.

**Decision point:** asked the user A (README components) vs B (centralize
styles); proceeded with B (recommended, low-risk).

---

## 2026-05-22 — PR 138 done; kept string array, dropped README's redesign

**Status:** ✅ done + merged to main. Closes M2. Gates green (typecheck 0 ·
101 tests · build ✓). No UI smoke test possible here (no browser) — change is
mechanical (same list, same option value/label).

`SUBJECTS` was duplicated identically in 6 files. Now it lives once in
`src/lib/constants.ts`.

**Deviation — kept the plain string array, NOT the README's id/icon/i18n
redesign.** The README sketched `SUBJECTS: [{ id: 'math', icon: 'calculator' }
…]` with labels in i18n and a `getSubjectLabel()`. The real array is just
`["Math","Science","History","Language","Geography","Art","Music","Other"]`,
and those English strings are **the values persisted to the DB**
(`classes.subject`, `decks.subject`) — `<option>` uses each string as both
value and label. Switching to `'math'` ids or i18n labels would change stored
values and break every existing class/deck and its subject filter — a data
migration, not a 1h dedup. M2 only asks to remove the duplication, so
constants.ts exports the same strings (`as const`) plus a derived `Subject`
union type for future TS call sites. (Note: the README's own list also
differed from reality — it had no "Language"/"Geography" and invented
"spanish/korean/pe"; reality is the 8 strings above.)

**Bonus — removed dead code:** of the 6 copies, only 4 are actually used
(Community, CreateClassModal, EditClassModal, CreateDeckEditor — all in
`<select>` dropdowns). `Decks.jsx` and `SessionFlow.jsx` *defined* `SUBJECTS`
but never referenced it (their subject filters derive the list dynamically
from existing decks). Those two defs were deleted, not re-pointed at the
import.

**Out of scope (left as-is):** `SUBJ_ICON` (subject→icon map) is also
duplicated — defined locally in Community.jsx and Decks.jsx but already
exported from `lib/deck-cover` and imported by CreateDeckEditor. Same
drift smell as SUBJECTS, but not part of M2. Candidate for a follow-up.

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
