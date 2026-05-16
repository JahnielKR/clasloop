# Clasloop — Session Handoff (PRs 23–29, May 2026)

**Purpose:** Onboard a new Claude chat to continue this project without losing context. Everything Jota (the user) cares about, the working style we've developed, and the technical state.

**For full project context** (what Clasloop is, business model, architecture): see `docs/PROJECT_HANDOFF.md` in the repo. This document covers **how we work** and **what happened in the recent session**.

---

## 1. Who is the user

- **Jota** — sole maintainer of Clasloop. Spanish-speaking, casual tone.
- He teaches (English to Spanish-speaking kids, K-pop fan judging from prior chats), and Clasloop is HIS app. He uses it in real classrooms.
- Production users exist. He cares deeply about not breaking things.
- He works on a Galaxy Tab S9 (Android tablet, landscape), Chrome desktop, and an iPhone. **Test on tablet whenever UI changes for "mobile"**.

### Communication style

- **Spanish casual, no formalities.** "che", "dale", "buena", "perfecto", "lol", "xD" are normal.
- **No sycophancy.** Don't open with "Great question!" or close with "Hope that helps!". Just answer.
- **Short messages** from him — often 1-2 sentences describing a bug. Resist the urge to ask 5 clarifying questions; ask 1-2 max and only when truly necessary.
- "**decidi tu**" or "**decidí tú**" = "you decide, trust your judgment". When he says this, pick the option you think is best and explain briefly why. He's delegating.
- "**confio**" = "approved, go". Equivalent to a thumbs-up.
- He WILL tell you when you're wrong. Not aggressively, but directly. Example: *"no, los test son rapidos"* corrected a wrong assumption I made about session duration. Internalize the correction, don't re-litigate.
- **He sometimes describes bugs imprecisely.** "ABCD" meant "the 4 image options" not "the literal letter badges". I implemented the wrong thing once (PR 23.8 — REVERTED). Always confirm interpretation if a bug description could mean two different things.

### Hard constraints (from earlier chats, do NOT violate)

These have come up over many sessions. Stick to them:

- **DON'T touch** achievements, community moderation, gamification — these are working and complete
- **NO batch AI generation** — Jota explicitly rejected this approach for content creation
- **Quality > speed.** Never accept data loss
- **Confirm with Jota BEFORE making changes** when the path forward is ambiguous. Use `ask_user_input_v0` tool.
- **Don't reinterpret feedback.** If he says "port the design from X", port THAT design. Don't add "improvements".
- **Supabase GRANT convention** for new tables. Migrations that only ALTER existing tables don't need GRANTs.
- **All hooks (useState/useEffect) MUST be above conditional returns** (React rules — Jota had a hotfix PR 26.1 for exactly this)

---

## 2. How we work — the workflow

This pattern emerged organically over many sessions. Stick to it.

### 2.1 The basic loop

1. Jota reports a bug or asks for a feature in 1-2 sentences
2. I investigate (read code, schema, git log) before proposing
3. If approach is non-obvious, I ask 1-3 questions via `ask_user_input_v0` with sensible options. **I also share my own vote** with reasoning.
4. He answers (often with "decidí tú" if he agrees)
5. I implement, validate (JSX parse check, CSS brace count), commit, zip, share
6. He pushes, tests, reports back

### 2.2 PR structure & file delivery

**Every PR follows this template:**

1. Make the changes in `/home/claude/clasloop-fresh/clasloop-phase1/`
2. Validate JSX with babel parser:
   ```js
   const parser = require('@babel/parser');
   parser.parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
   ```
3. Validate CSS brace count if CSS was touched
4. `git commit` with detailed heredoc message (see §2.3)
5. Zip the project (excluding node_modules, dist, .DS_Store)
6. Copy zip to `/mnt/user-data/outputs/clasloop-prXX.X-short-name.zip`
7. Use `present_files` to share it
8. Reply with: how to deploy, what changed, how to test, and any deploy order requirements

**Working directory:** `/home/claude/clasloop-fresh/clasloop-phase1/` — repo is at `/home/claude/clasloop-fresh/` but the project lives in the `clasloop-phase1` subfolder.

**Git config:** Already set in the working dir as `claude@anthropic.com` — don't touch.

**Deploy:** Jota pushes via `git push origin main`. He does this on his local machine after unzipping.

### 2.3 Commit message template

We use detailed multi-section messages. The PR description goes IN the commit. Format (use a heredoc):

```
git commit -m "$(cat <<'EOF'
PR XX.X: <succinct title — under 60 chars>

Jota: "<verbatim quote of his bug report>"

<Background — what was the bug, where, since when>

Diagnosis
─────────

<technical cause, often with code snippets or numbers>

Fix
───

<what changed, briefly>

═══════════════════════════════════════════════════════════════════════
FILES
═══════════════════════════════════════════════════════════════════════

<list of touched files with one-line descriptions>

═══════════════════════════════════════════════════════════════════════
DEPLOY
═══════════════════════════════════════════════════════════════════════

<migration order if any, then git push>

═══════════════════════════════════════════════════════════════════════
HOW TO TEST
═══════════════════════════════════════════════════════════════════════

<concrete steps to verify>

═══════════════════════════════════════════════════════════════════════
REVERT
═══════════════════════════════════════════════════════════════════════

<how to undo if needed — often "git revert HEAD" but DB migrations
need explicit rollback SQL>
EOF
)"
```

This commit text is the documentation. Future Claudes (and Jota) read it. **Don't be terse.** Explain WHY, include the verbatim quote of the bug, mention specific line numbers where relevant.

### 2.4 Code comments

We comment HEAVILY with the PR number and reasoning:

```js
// PR 23.10.2: refactored to TWO separate queries instead of a
// joined inner. The previous attempt at `.eq("sessions.status",
// "active")` on an inner-joined select didn't return results in
// production — most likely PostgREST didn't apply the nested
// filter the way the docs suggest, leaving every joined row
// through. Splitting makes the data flow explicit and easier
// to debug if it fails again.
```

This pattern means future debuggers can grep `// PR XX` and find the reasoning instantly. **Follow this style** — terseness is a bug.

### 2.5 Validation before commit

Always before committing:

```bash
# JSX validation
cat > check.cjs << 'EOF'
const parser = require('@babel/parser');
const fs = require('fs');
const files = [/* paths to changed files */];
let ok = true;
for (const f of files) {
  try {
    parser.parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    console.log('OK', f);
  } catch (e) {
    ok = false;
    console.log('FAIL', f, ':', e.message, 'line', e.loc?.line);
  }
}
process.exit(ok ? 0 : 1);
EOF
node check.cjs && rm check.cjs

# CSS brace check (if CSS touched)
node -e "
const fs = require('fs');
const css = fs.readFileSync('src/styles/themes.css', 'utf8');
const open = (css.match(/{/g) || []).length;
const close = (css.match(/}/g) || []).length;
console.log('CSS:', open === close ? '✓' : 'MISMATCH', open, close);
"
```

### 2.6 The zip recipe (exact)

```bash
cd /home/claude/clasloop-fresh && \
rm -f /tmp/clasloop-prXX.zip && \
zip -r /tmp/clasloop-prXX.zip clasloop-phase1 \
  -x "clasloop-phase1/node_modules/*" \
  -x "clasloop-phase1/dist/*" \
  -x "*.DS_Store" \
  2>&1 | tail -3 && \
cp /tmp/clasloop-prXX.zip /mnt/user-data/outputs/clasloop-prXX-short-name.zip
```

Then `present_files` with the output path.

### 2.7 When using `ask_user_input_v0`

Pattern: 1-3 questions, 2-4 options each. **Include "Decidí tú" as the last option always** — Jota uses it often.

When I have a strong preference, **state my vote and reasoning AFTER the tool call**, before he answers. He often goes with my vote, but it's his decision.

Don't over-ask. If a question is trivial, just make the call. Reserve asking for genuinely ambiguous design choices.

### 2.8 Tool/skill usage

- **conversation_search** and **recent_chats** ARE available — use them when Jota references past work I don't immediately have context for. He often says "como ayer" or "como en X PR".
- **No `view` on files outside the working dir.** Skills at `/mnt/skills/public/` are read-only and rarely needed for this project (we're not creating docx/pdf/pptx).
- **Don't ask permission** to use `web_search` or `bash_tool`. Just use them.

### 2.9 ⚠️ Redesign over patch — important Jota rule

**Direct quote from Jota (May 16, 2026, after OAuth marathon):**
> "la próxima vez, si vez algo raro o complicado, en vez de forzarte a arreglarlo, mejor rediseñar es mejor y más rápido"

**The rule:** if a bug fix is getting into the 3rd or 4th iteration without working cleanly, or if I find myself adding cascading checks ("but if A and not B and timestamp > X..."), **STOP and propose a redesign** instead of another patch. Jota prefers losing some work and rewriting the logic to fighting a complex chain of fixes.

**Real example — what NOT to do:** OAuth signup flow. PRs 36→42 (seven iterations) trying to patch around role-flipping, duplicate emails, race conditions with a SQL trigger, localStorage not surviving redirects, query param smuggling, last_sign_in_at threshold checks, role-mismatch screens. Each PR added complexity. Eventually Jota said "let's redesign, this is dumb" → PR 43 wiped most of that in favor of a single linear flow (drop the trigger, one auth button, mandatory RoleOnboarding screen). The redesign was simpler, faster to write, and bug-free.

**Concrete heuristics for when to redesign:**

- Same area has 3+ fix-iterations and the next bug is still in the same area
- A fix requires explaining 2+ time thresholds, race conditions, or "if A AND NOT B"
- The solution feels brittle (e.g. "if user does X within Y seconds")
- I'm relying on browser-specific behavior (localStorage surviving redirects, etc)
- A SQL trigger is racing against client code
- I find myself writing defensive `if (...)` checks just to cover what the previous fix broke

**How to propose:**

Pause, recap what we've tried, what failed, what the root mismatch is. Then sketch an alternative architecture in 1-2 paragraphs. Let Jota approve before coding the new thing. Don't just start rewriting silently.

---

## 3. Project state — May 2026

### 3.1 Tech stack

- **Frontend:** React + Vite + JavaScript (no TypeScript), React Router v6
- **Styling:** CSS-in-JS via inline styles + a big global `src/styles/themes.css` file (~3300 lines)
- **Backend:** Supabase (Postgres + Auth + Realtime + RLS)
- **Auth:** Supabase Auth, email-only signup (no Google/social)
- **Realtime:** Supabase Realtime channels for live sessions
- **Hosting:** Vercel (push to main → auto-deploy)
- **Repo:** Local at `/home/claude/clasloop-fresh/clasloop-phase1`. Jota maintains the github remote.

### 3.2 Key paths

```
src/
  App.jsx                          Routing + global state, ~900 lines
  pages/
    StudentJoin.jsx                Student quiz flow, ~3700 lines (HUGE)
    SessionFlow.jsx                Teacher quiz launch + lobby + live, ~2800 lines (HUGE)
    Settings.jsx                   Account settings
    Today.jsx                      Teacher dashboard
    MyClasses.jsx                  Student's class list
    ClassPage.jsx                  Per-class view (teacher or student)
    Sessions.jsx                   Teacher's sessions list
    Review.jsx                     Teacher grades free-text answers
  components/
    Sidebar.jsx                    Left nav (collapsible, mobile drawer)
    DeleteAccountModal.jsx         PR 28
    ClassCodeModal.jsx             PR 26 — gates students without a class
    StudentsModal.jsx              PR 27 — teacher views/removes students
    tokens.js                      Design tokens (colors via `C` object)
    Avatars.jsx, Icons.jsx
  styles/
    themes.css                     Global styles, 3300+ lines, organized by PR
  lib/
    supabase.js                    Client init (v2)
    notifications.js
    spaced-repetition.js
  hooks/
    useAuth.js
    useTheme.js
  routes.js                        ROUTES + buildRoute helpers

supabase/
  schema.sql                       Base schema (truth source)
  phase*.sql                       Incremental migrations, one per PR-set
  functions/                       Edge functions (Sonnet AI)
```

### 3.3 The two giant files

**StudentJoin.jsx** (~3700 lines) and **SessionFlow.jsx** (~2800 lines) are the heart of the live-session experience. They're huge because they handle every state, every animation, every edge case for student-side and teacher-side respectively.

Don't try to refactor them. They work. Read the existing patterns and add to them carefully.

### 3.4 i18n

We support **English, Spanish, Korean** (en / es / ko). i18n is done **inline per-component** with a literal object at the top:

```js
const i18n = {
  en: { hello: "Hi", ... },
  es: { hello: "Hola", ... },
  ko: { hello: "안녕", ... },
};
function MyComponent({ lang }) {
  const t = i18n[lang] || i18n.en;
  return <p>{t.hello}</p>;
}
```

No external i18n library. Always add all 3 languages for any new user-facing string.

### 3.5 Theming

Quizzes have **lobby themes**: `calm`, `ocean`, `pop`, `mono`. Set per-class in `classes.lobby_theme`, can be overridden per-deck in `decks.lobby_theme_override`. The student inherits via `sessions.lobby_theme` (denormalized at launch time — PR 20.2.3).

CSS uses `[data-theme="pop"]` selectors. The themed render path is in StudentJoin around line 1900+ (quiz) and ~3300+ (results).

### 3.6 The session lifecycle

```
sessions.status: lobby → active → completed
                                  ↘ cancelled (was broken pre-PR 23.13.3)
```

Transitions:
- lobby: teacher clicked Launch but hasn't started quiz yet (PIN screen visible)
- active: quiz is running, students answering
- completed: ended normally (teacher End or auto-close when all students done)
- cancelled: teacher Cancel from lobby (NEW in 23.13.3 — schema check now allows it)

---

## 4. Recent work — PRs 23 through 28 (this session and prior)

Detailed log so a new chat can find context fast.

### PR 23.x — Mobile portrait fallback for StudentJoin

Theme: students using phones/tablets in portrait mode were having a bad time. Layout adapts (does NOT force-rotate).

| PR | What |
|---|---|
| **23** | Initial portrait CSS — rail vertical→horizontal, MCQ 2×2 → 1×4 on phones |
| **23.1 + 23.2** | Join screen portrait + sidebar sign-out visible (`flex-shrink: 0`) |
| **23.3** | Waiting state 3-col→1-col, Next button absolute bottom, sidebar mobile sign-out, X exit button in StudentJoin |
| **23.4** | Safari iOS dvh fix — `height: 100vh; height: 100dvh` + `env(safe-area-inset-bottom)` for the Next button |
| **23.5** | Image MCQ portrait — override `.answers-grid.is-image-mode`, smaller tiles, scrollable |
| **23.6** | Tablet landscape image MCQ — first attempt with `max-width: 1180px` |
| **23.7** | Guests always get `calm` theme regardless of class theme |
| **23.8** | (REVERTED — I misread "ABCD" as the letter badges; he meant the image tiles) |
| **23.9** | Real fix: shrink image tiles + tighter padding for tablet landscape |
| **23.10** | Galaxy Tab S9: switched to `max-height: 850px` (tablets are wide but short) + rehydration on refresh |
| **23.10.1** | Refactor rehydration to two queries + debug logs |
| **23.10.2** | Real bug: `select("*")` instead of explicit column list (deck_title doesn't exist on sessions) |
| **23.10.3** | Loader during rehydration so no "join → quiz" flash |
| **23.11** | Zombie session cleanup — migration with `pending_close_at` + 2 RPCs |
| **23.11.1** | Hotfix: race condition that cleared the flag before rehydration read it |
| **23.12 + 23.13** | Auto-close on last-student exit + Sidebar "Active session" badge |
| **23.13.1** | Fix: badge didn't refresh on cancel/end (page hadn't changed) |
| **23.13.2** | Hotfix: beforeunload was sending anon key (v1 vs v2 supabase auth API) |
| **23.13.3** | Schema fix: `cancelled` wasn't in CHECK constraint — cancel was silently 400ing for MONTHS |
| **23.13.4** | Debug logs for badge issue |
| **23.13.5** | Cleanup zombi sessions >24h + 24h floor in active-session query |

**Bug raíz (PR 23.13.3)**: `handleCancel` had been writing `status='cancelled'` since forever, but the schema CHECK constraint only allowed `'lobby', 'active', 'completed'`. Every cancel produced a silent 400; frontend ignored the error. Sessions stayed in lobby/active indefinitely. Invisible until PR 23.13's "Active session" sidebar polling exposed it.

### Earlier PRs in this session (before 23)

| PR | What |
|---|---|
| **24.x** | Themed quiz rendering for all question types (mcq, tf, fill, match, order, free) + section pills + animation polish |
| **25.x** | Today page rebuild with date-based filtering, DayDateModal for unit planning |
| **26 / 26.1 / 26.2 / 26.3** | ClassCodeModal: students without a class are gated, must enter code to join one. 26.1 was a React Rules of Hooks hotfix (useState above conditional return). 26.3 made Leave class actually work via RLS policy. |
| **27** | Removed "Leave class" from student MyClasses; added "View students" modal for teachers with Remove capability |
| **28** | Delete account — RPC + typed-confirmation modal ("type DELETE to confirm"). Teacher delete cascades to all owned classes/decks/sessions. |

### PR 28.x — Cleanup, calendar, Today/Review redesigns, deletion audit, realtime

Multi-feature consolidation PR series. Roughly: deck cleanup, calendar bug, Today redesign, Review drilldown, audit/deletions, realtime student-removal toast, bulk remove, default deck privacy, shuffle questions, animation flash fix, Netflix-fill Next button, timeout shake, MyClasses redesign, Favorites page, save=favorite unification, lib cleanup, mobile blocking (28.17.x), order question UX (28.18), tablet layout fixes (28.20).

### PR 29.x — PDF export multi-style redesign (HUGE — 12 PRs)

This is the project's deepest dive into a single feature. Started as "make PDFs prettier" and ended up rebuilding the whole exporter into a dispatcher pattern with 3 distinct styles + a modal selector with live preview.

**Architecture:**
- `src/lib/pdf-export.js` — dispatcher (`exportPDF(deck, classObj, {style, variant, lang})`)
- `src/lib/pdf-styles/shared.js` — LABELS, drawWrappedText, deterministicShuffle, formatAnswerForKey, image cache, `groupQuestionsBySection`
- `src/lib/pdf-styles/classic.js` — "El cuaderno". Sober, professional. Double-rule signature, circled question numbers, dotted writing lines.
- `src/lib/pdf-styles/modern.js` — "El sticker pack". Colorful (teal+coral). Sticker badge, full-color section bands, MCQ pills with soft tint.
- `src/lib/pdf-styles/editorial.js` — "La revista". Premium, magazine-like. Eyebrow + thick rule + monospace question numbers ("01" "02") + em-dash MCQ bullets + TF squares (not circles). NO drop cap (tried twice, abandoned).
- `src/components/PDFExportModal.jsx` — modal opened from Decks.jsx's download button. Variant toggle (exam/answer_key) + 3 inline-SVG thumbnails + live preview iframe via `doc.output('blob')` + URL.createObjectURL. Sticky style choice in `localStorage.clasloop_pdf_style`.

| PR | What |
|---|---|
| **29.0** | Dispatcher refactor — 5 files (shared + 3 styles). Legacy `exportExamPDF`/`exportAnswerKeyPDF` kept as shims. |
| **29.0.1** | Classic redesigned + sections logic (`groupQuestionsBySection`). Selection = mcq/tf/match/order/slider/fill; Written = sentence/free/open. |
| **29.0.2** | Modern implemented + temp localStorage hack for switching style. |
| **29.0.3** | 5 fixes on classic + modern (TF/MCQ bullet sizes, fill spacing, widow protection, eyebrow→title gap, dotted underline). |
| **29.0.4** | **Critical bug: `doc.circle()` without explicit "S"/"F" arg renders nothing in jsPDF 2.5.** Audited every shape call. Added "S" to 6 missing ones. |
| **29.0.5** | First pagination calibration — `base` 14→8, divisor 80→90, betweenQuestions 11→9. |
| **29.0.6** | Second pagination calibration — `base` 8→5, more spacings reduced, footer reserve 12→8mm. Classic confirmed perfect. |
| **29.0.7** | Editorial implemented from stub. Drop cap "S" attempted but rendered broken (S floating below rest of title). |
| **29.1** | Modal selector with thumbnails + live preview + sticky localStorage. PDFExportModal component. |
| **29.1.1** | Sticker R 14→10mm, drop cap shared-baseline attempt. |
| **29.1.2** | Drop cap REMOVED (third attempt, abandoned — title bumped 26→30pt to compensate). Grouping by type within section (MCQ→TF→match→order→slider→fill). Tighter estimates. |
| **29.1.3** | Sequential renumbering after sort (was using creation-order numbers, jumping 1, 4, 7, 3...). Answer key reuses same ordering. |
| **29.1.4** | **Root cause finally found via console.log instrumentation: widow check was breaking pages early, leaving 60mm dead space.** Removed in all 3 styles. Modern banner 22→14mm. Modern pill 6→5mm. Editorial all SPACING reduced. **Result: 2 pages for 13-question deck.** |

**Key technical decisions captured:**
- `doc.circle(x, y, r)` without 4th arg ("S"/"F"/"FD") may render nothing in jsPDF 2.5.x — always pass style explicitly. Verified by reproducing in isolated node tests.
- Pagination math: real consumption per question type measured with console.log instrumentation, not eyeballed. MCQ in modern = pillH + 1mm gap = 6mm/option (after PR 29.1.4).
- Widow check (page-break-early to avoid orphan at top of next page) was net negative — orphans are visually less offensive than 60mm dead space mid-exam.
- Drop cap in editorial: tried twice, both renders broken due to jsPDF baseline math. Abandoned. Identity carried by other elements (eyebrow tracked, thick rule, mono numbers, em-dash bullets, TF squares).
- Questions reordered within sections by type for both visual cohesion and easier pagination math (uniform-height runs are easier to pack).

### Reverted / abandoned

- **PR 23.8** — REVERTED. Misinterpreted "ABCD" as letter badges instead of image tiles.
- **Themed Session Results page** — Jota: "puedo vivir sin eso, do NOT reintentar"
- **Realtime presence** (PR 23.11 design decision) — too complex. We use 60s-since-last-response as proxy.

---

## 5. Database state

### 5.1 Migrations status (as of end of this session)

All migrations are in `supabase/`. Jota runs them manually in Supabase SQL Editor. The flow:

1. I create `supabase/phaseXX_name.sql`
2. He pastes it in SQL Editor and clicks Run
3. THEN we push the code

**Always state in the deploy section "MIGRATION FIRST"** when there's one.

Migrations Jota has confirmed running this session:
- ✅ phase23_11_zombie_sessions.sql — pending_close_at column, close_zombie_sessions RPC, force_close_my_pending_sessions RPC
- ✅ phase23_13_3_cancelled_status.sql — CHECK constraint now allows 'cancelled' + cleanup pass
- ✅ phase23_13_5_zombie_cleanup.sql — closes lingering >24h zombies (PR 23.13.5's mass cleanup)
- ✅ phase28_delete_my_account.sql — delete_my_account RPC
- ✅ phase27_class_members_teacher_remove.sql — RLS for teachers to remove students

### 5.2 Critical schema facts

- **sessions.status** ∈ {'lobby', 'active', 'completed', 'cancelled'} (post-23.13.3)
- **sessions.pending_close_at** — timestamptz, NULL = not pending; set = teacher closed tab
- **sessions.questions** — jsonb, frozen copy of deck.questions at launch
- **sessions.section, sessions.lobby_theme** — denormalized from deck/class at launch (PR 20.2.3)
- **session_participants.completed_at** — set when student reaches results OR exits via X (PR 15 + PR 23.12)
- **class_members.student_id** — `ON DELETE SET NULL` (preserves teacher roster when student deletes their account)
- **decks.lobby_theme_override** — optional per-deck theme

### 5.3 RLS patterns

- **Anyone can read** sessions, session_participants — needed for guests/students without RLS scope
- **Anyone can insert** session_participants — students join without auth
- **Teachers can update own sessions** — `auth.uid() = teacher_id`
- **Profile delete cascades** — wipes teacher-owned tree (classes → units → decks → sessions → responses)

### 5.4 RPCs

| RPC | What | Auth |
|---|---|---|
| `delete_my_account()` | Full account wipe + auth.users delete | auth.uid() internal, SECURITY DEFINER |
| `close_zombie_sessions()` | Closes sessions with pending_close_at >2min + no recent responses | SECURITY DEFINER, no params |
| `force_close_my_pending_sessions()` | Closes ALL of caller's pending sessions | auth.uid() internal, SECURITY DEFINER |
| `generate-insight` (edge function) | Sonnet AI for unit insights | Service-role internally |

---

## 6. Patterns to know

### 6.1 Conversation rehydration (PR 23.10–23.11.1)

When student refreshes mid-quiz, we restore their state from DB. Conditions:

1. `sessionStorage` flag `clasloop:in-quiz` must be set (means they were actively in a quiz before refresh)
2. Effect calls `close_zombie_sessions()` to clean stale rows first
3. Query `session_participants` for student → cross-reference with `sessions WHERE status='active'`
4. Reconstruct `answers[]` from `responses` rows
5. If `allAnswered` → don't rehydrate (clear flag, show join screen). They finished, sending them back to results is confusing.
6. While rehydrating, show a small loader (PR 23.10.3) — no "join screen flash"

The flag effect MUST gate on `!rehydrating` to avoid the race condition (PR 23.11.1).

### 6.2 Tick pattern for cross-component refresh

When child component changes DB and parent's polled state needs to update:

```js
// Parent (App.jsx)
const [activeSessionTick, setActiveSessionTick] = useState(0);

useEffect(() => {
  // ... query DB, update local state ...
}, [profile, page, activeSessionTick]);

// Pass to child:
<Child notifyActiveSessionChanged={() => setActiveSessionTick(n => n + 1)} />

// Child uses it:
onClick={() => {
  doSomethingThatChangesDB();
  if (notifyActiveSessionChanged) notifyActiveSessionChanged();
}}
```

Used for: `studentMembershipTick` (PR 26.2), `activeSessionTick` (PR 23.13.1).

### 6.3 sessionStorage flag pattern

We use sessionStorage (not localStorage) for "I'm currently in flow X" flags:
- Per-tab scope (closing tab clears it — good)
- Survives F5 refresh (good)
- Survives back/forward nav (good)

Key naming: `clasloop:<scope>` (e.g. `clasloop:in-quiz`).

### 6.4 beforeunload + keepalive PATCH

For "before page closes, mark this in DB":

```js
const accessTokenRef = useRef(null);

useEffect(() => {
  // Cache token async on mount
  (async () => {
    const { data } = await supabase.auth.getSession();
    accessTokenRef.current = data?.session?.access_token || null;
  })();

  const onBeforeUnload = () => {
    const token = accessTokenRef.current;
    if (!token) return;
    fetch(`${SUPABASE_URL}/rest/v1/table?id=eq.${id}`, {
      method: "PATCH",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ field: value }),
    });
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  return () => window.removeEventListener("beforeunload", onBeforeUnload);
}, [deps]);
```

**Critical:** `supabase.auth.session()` does NOT exist in v2. Use `getSession()` (async) and cache the token in a ref. The v1 vs v2 confusion broke PR 23.13.2.

### 6.5 Two-query instead of joined inner

PostgREST `select("...inner_table!inner(...)").eq("inner_table.col", val)` is unreliable. We learned this in PR 23.10.2 — the nested filter didn't apply, all rows came through. Pattern that works:

```js
// Query A
const { data: parts } = await supabase
  .from("a").select("id, b_id").eq("user_id", uid);

// Query B
const { data: bs } = await supabase
  .from("b").select("*").in("id", parts.map(p => p.b_id)).eq("status", "active");

// JS join
const bById = new Map(bs.map(b => [b.id, b]));
const matched = parts.find(p => bById.has(p.b_id));
```

### 6.6 `select("*")` vs explicit columns

We learned (PR 23.10.2 the hard way) that explicit column lists break when migrations don't run on every DB. Default to `select("*")` unless you have a perf reason. The UI uses optional chaining (`session?.deck_title`) and falls back to `"—"` so missing fields are tolerated.

### 6.7 Migration writing

Every migration file follows:

```sql
-- ============================================
-- PHASE XX.X MIGRATION — <short name>
-- Run in Supabase SQL Editor.
--
-- BACKGROUND
-- <what was the bug or feature need>
--
-- FIX
-- <what this migration does>
-- ============================================

alter table public.foo
  add column if not exists bar timestamptz;

-- ============================================
-- DONE
-- ============================================
```

Always use `IF NOT EXISTS` so re-running is safe.

### 6.8 Visual conventions

- **Design tokens** in `src/components/tokens.js` as `C.bg`, `C.text`, `C.accent`, `C.red`, `C.redSoft`, etc. NEVER hardcode hex codes.
- **Fonts:** 'Outfit' for UI, 'JetBrains Mono' for monospace (the DELETE confirmation in DeleteAccountModal uses mono).
- **Pulsing dot**: keyframe `cl-pulse` in App.jsx sidebarCSS (PR 23.13)
- **Themed top-strip**, `.stage-page`, `.stage-wrap`, `.stage` divs for themed renders. Look at SessionJoin lines 1700+ for the pattern.

---

## 7. Things that LOOK like bugs but aren't

Save future Claudes from re-investigating:

- **handleExitConfirm in StudentJoin marks completed_at = now()** — yes intentional (PR 23.12). It's how SessionFlow's auto-close detects "last student left".
- **Anyone can read sessions/participants via RLS** — yes intentional. Guests need access without auth.
- **`session.deck_title` doesn't exist as a DB column** — it's set in-memory in `handleJoin` and shown with `|| "—"` fallback.
- **Realtime channel for participants but polling for the active-session badge** — different scopes. Realtime is for inside SessionFlow live view. Polling is for the App-level "is there an active session" check, which doesn't need realtime urgency.
- **Sidebar has a `'cl-pulse'` keyframe defined in App.jsx not Sidebar.jsx** — historical, App.jsx owns the global sidebar CSS injection.
- **Sessions older than 24h are hidden from the active-session query** even if status='active' — PR 23.13.5, intentional. Real sessions don't last that long.

---

## 8. Current backlog (from `docs/BACKLOG_PR28+.md`)

What's NOT done. Pick from here next:

### Pending features (frequently mentioned)
- **Sistema de escuelas** — autocomplete + count. Option C consolidated, optional with skip, no verification. Plan exists, not started.
- **Landing completar** — nav inert links (Features / Pricing / For schools), footer links.
- **Pricing real** — ~$10/mes, ~$5/mes anual ($60/año = 50% off). Postponed until ready to push billing.
- **Wow moment del primer flow** — postponed during PDF series.
- **Año escolar** — concept agreed, not implemented.
- **History page** — student-side view of past quiz performance. Mockups approved, not started.

### Quality of life
- **Themed slideshow for discussion mode** — optional, low priority. Show questions one by one without quiz framing, for class discussion.
- **Audio cue on timeout** — Web Audio API, ~1-2hrs PR.
- **Branding switch free/premium** — premium can hide Clasloop footer in PDFs. Waits for billing implementation.

### Lower priority / nice-to-have
- **MCQ with images portrait** could be MORE refined (Jota said "better but not perfect" after PR 23.10)
- **PDF "study guide" 3rd variant** — deck + answers + explanations as one document. Out of scope for PR 29 series.

### Done in PR 28-29 series (so NOT pending):
- ✅ Toast realtime when teacher removes student (PR 28.x)
- ✅ Bulk remove in StudentsModal (PR 28.x)
- ✅ PDF redesign + multi-style + modal (PR 29.x)

### Logs to clean up
**PR 23.13.4 added console.log statements for debugging.** They're still in the code in:
- `src/App.jsx` — `console.log("[clasloop] activeSession poll:", ...)`
- `src/pages/SessionFlow.jsx` — `console.log("[clasloop] cancel session OK, id:", ...)`, `console.log("[clasloop] calling notifyActiveSessionChanged")`

These work fine but pollute the console. Could be removed in a small cleanup PR or left until the next bug investigation.

---

## 9. The mistakes I made — learn from these

For full transparency / pattern recognition:

1. **PR 23.8 — misinterpreted "ABCD"**. He said "los ABCD de fotos siguen siendo grandes". I shrunk the literal letter badges (A/B/C/D). He meant the image tiles. REVERTED.
   - **Lesson:** when a bug description has ambiguity, confirm via `ask_user_input_v0` first. Don't guess.

2. **PR 23.10 — wrong column list**. Asked for `deck_title, class_name, session_settings, started_at` which don't exist on `sessions` table. 400 error.
   - **Lesson:** prefer `select("*")` over enumerated columns. Schema can be inconsistent across DBs.

3. **PR 23.10 — inner join nested filter**. Used `.eq("sessions.status", "active")` with `sessions!inner` join. Didn't work in production.
   - **Lesson:** two queries + JS join is more reliable than PostgREST nested filters.

4. **PR 23.11 — race condition on sessionStorage flag**. The flag-clearing effect ran before the rehydration could read it, defeating the entire feature.
   - **Lesson:** when multiple useEffects interact through state/storage, gate them on a stable flag (`!rehydrating`) so the read happens before any potential clear.

5. **PR 23.13.2 — v1 vs v2 Supabase API**. Used `supabase.auth.session()` (v1) instead of `getSession()` (v2 async).
   - **Lesson:** check the version. Cache async values in refs for sync access.

6. **PR 23.13.3 — assumed schema had 'cancelled'**. Code wrote 'cancelled' for months, schema rejected it silently. Frontend's `await` didn't inspect errors.
   - **Lesson:** when an UPDATE doesn't seem to be persisting, FIRST query the constraint definitions before assuming the JS is right. And: never `await` without checking `error`.

---

## 10. Quick start for the new chat

If you're the new Claude reading this:

1. **Greet Jota briefly in Spanish casual.** No "Hello!", just "Buenas" or "Dale, en qué estamos hoy" — match his register.

2. **Don't dump this entire handoff back at him.** He knows it. He gave it to you so YOU know it.

3. **First message should be**: confirm you have context (briefly: "Leí el handoff, estoy al día con PR 23.13.5 y el backlog. ¿Por dónde seguimos?")

4. **When he reports a bug**: investigate before proposing. Read the relevant file. Check git log for recent PRs touching that area.

5. **Working directory is always** `/home/claude/clasloop-fresh/clasloop-phase1/`.

6. **For UI changes that affect mobile**: he tests on Galaxy Tab S9 (1280×800 landscape) and iPhone. Use `max-height: 850px` to target tablets, not `max-width`.

7. **For ANY DB change**: write the migration first, tell him to run it BEFORE pushing the code.

8. **Use heredoc commit messages** with the full template from §2.3.

9. **The conversation_search tool** is your friend if you need historical context for specific past PRs.

Bienvenido. Suerte.

---

*Document created at end of PR 23.13.5 session. Last commit: `b41fa8f`. May 2026.*
