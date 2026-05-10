# Clasloop — Project Handoff

**Document purpose:** Complete state of the project as of 2026-05-10. Use this to onboard a new team member, restart work after a long break, or hand the project to anyone who needs the full picture.

**Last update:** 2026-05-10
**Owner:** Jota (sole maintainer)
**Production status:** Live, used in real classrooms.

---

## 1. What Clasloop is

> Clasloop is a web app that helps teachers know what to teach tomorrow based on what their students actually remember today.

Not "another quiz app". The bet is that **the bottleneck in education is not data, it's decisions derived from data**. Kahoot tells you "your class scored 67% on verbs". Clasloop tells you "your class needs to review verbs this week, before they drop to 50%".

Every feature is judged against this question: *does this tell the teacher what to do, or just give them more information to process?* If the second, it doesn't ship.

### One-paragraph product description

A teacher launches a quiz in class — students join with a PIN from their phones, just like Kahoot. The difference: data doesn't disappear at the end. Every answer is indexed by student × question × deck × class, and a spaced-repetition algorithm tracks what each class is forgetting. Next morning, the teacher opens the app and sees "Today: launch these 3 decks — your class needs them most." The teacher's job is to teach. The app's job is to remember what to revisit.

### Who it's for

- **Sweet spot:** secondary school teachers with 2–5 classes (same or different levels)
- **Original case:** language teachers (high retention leakiness, ideal for spaced repetition)
- **Also works for:** small-group tutors, private tutors with persistent groups
- **NOT designed for:** university-scale (200+ student classes), corporate training (no persistent class), early elementary (UI assumes literate students)

---

## 2. The product in concrete daily flows

### Teacher flow (Monday morning)

1. Opens Clasloop → "Today" page shows: *"Suggested for today: Verbos irregulares (Spanish 9th, retention 54% — dropping), Por y Para (Spanish 9th, 5 days overdue), Subjuntivo (Spanish 11th, retention 38%)."*
2. Clicks "Verbos irregulares" → configures session options (timer, who sees correct answer, etc.) → Launch.
3. PIN appears on the projector. Students join from phones.
4. Live quiz: each question shows, students answer, see ranking, see correct answer. Like Kahoot.
5. At the end, instead of "ranking + done", every response is saved indexed by student × question × deck × class.
6. If there were free-text questions, a red badge appears in `/review` with the count. When the teacher has time, they grade keyboard-fast: `1` correct, `2` partial, `3` incorrect, optional comment.

### Student flow (after class)

1. Notification: *"Your teacher reviewed 3 of your Verbos irregulares answers."*
2. Click → sees their answers next to the correct ones, and where the teacher graded free-text, sees the grade pill (green/yellow/red) with the comment.
3. Optional: practices any saved deck on their own (not the primary use case, but supported).

### Teacher flow (closing a unit)

1. After several weeks teaching "Verbos del presente" (multiple warmups + exit tickets launched), the teacher closes the unit.
2. Modal: "Are you sure?" → continues to a Summary page.
3. Summary shows: avg retention across the unit, strongest/weakest topics, per-deck breakdown, days the unit ran.
4. **AI narrative auto-generates** (Sonnet writes + Sonnet verifies): "WHAT WORKED" + "WHAT DIDN'T" — concrete paragraphs naming specific decks and retention numbers from this unit's data.
5. **Suggested closing review** button: generates a 7-question recap deck targeting the unit's weakest topics. Teacher reviews and launches.
6. Optional: teacher writes a short note ("what you hoped they'd learn") — for their own records.
7. Click "Close unit" → unit moves to "Past", auto-promotes the next planned unit to active.

---

## 3. Core mental model (the conceptual backbone)

These are the abstractions everything else builds on. Understand these and the rest follows.

### Class = persistent reality

A class (e.g., "Spanish 9A") is permanent. Same class is used year after year. Has its own join code, its own roster, its own history.

### Deck = a topic, with two faces

A deck can be either:
- **Warmup** (start of class, set the table)
- **Exit ticket** (end of class, check what stuck)
- **General review** (standalone, e.g., quarterly recap)

Each deck has a `section` field. The **same theme** (e.g., "Verbo hacer") can have BOTH a warmup deck and an exit ticket deck, paired by position within a unit.

### Unit = a theme

A unit is the conceptual container: "Verbo hacer", "French Revolution", "Photosynthesis". Inside a unit live warmup + exit ticket pairs. **A unit doesn't have a `section`** — only its decks do. General review decks live OUTSIDE units (`unit_id = null`) because they recap multiple themes.

Unit lifecycle: `planned` → `active` → `closed`. Only one unit is `active` per class at a time.

### Session = one launch event

A session is one specific launch of one specific deck on one specific day. It has a PIN, participants (students who joined), and responses. Sessions accumulate; they're the raw fuel for the retention algorithm.

### Spaced repetition = the differentiator

Every class has a "retention score" per deck, computed from:
- How often students got correct answers
- How long since the last launch
- Forgetting curve approximation

The "Today" page surfaces decks with low retention OR overdue for review. Up to 9 suggestions, distributed across classes, ignoring decks not touched in 14+ days.

### Things this model deliberately rejects

- **No course → unit → lesson → topic hierarchy.** Just classes containing units containing decks. Flat enough to be navigable.
- **No formal gradebook.** Clasloop is tactical (what to teach next), not record-keeping.
- **No multi-teacher per class.** One class = one teacher.

---

## 4. Architecture overview

### Stack

- **Frontend:** React 18 + Vite. Routing via React Router. Styles inline + design tokens (no CSS framework).
- **Backend:** Supabase (Postgres + Auth + Realtime + RLS).
- **Serverless functions:** `/api` directory (Vercel functions). Two endpoints currently: `/api/generate.js` (deck question generation, Sonnet writes + Haiku verifies) and `/api/close-unit-narrative.js` (AI close-unit narrative, Sonnet writes + Sonnet verifies).
- **AI:** Anthropic Claude. Sonnet 4.6 for primary writing, Haiku 4.5 for fast verification.
- **Hosting:** Vercel (frontend + functions). Supabase (DB + auth).
- **Deploy:** Push to `main` → Vercel auto-deploys. No staging environment (deliberate).

### Project structure

```
clasloop-phase1/
├── api/
│   ├── generate.js                    # Deck question generation
│   └── close-unit-narrative.js        # AI narrative for unit closure
├── src/
│   ├── pages/                         # Top-level routes
│   │   ├── SessionFlow.jsx            # Today page (teacher home)
│   │   ├── ClassPage.jsx              # Single class view (Plan + decks)
│   │   ├── StudentJoin.jsx            # Student quiz experience
│   │   ├── Community.jsx              # Browse community decks
│   │   ├── MyClasses.jsx              # Student: my classes & saved decks
│   │   ├── Review.jsx                 # Free-text grading queue
│   │   ├── DeckResults.jsx            # Results after a session
│   │   ├── ClassInsights.jsx          # Per-class deep stats
│   │   ├── Settings.jsx
│   │   ├── TeacherProfile.jsx         # Public profile of a teacher
│   │   ├── AdminAIStats.jsx           # Admin: AI generation tracking
│   │   ├── Director.jsx               # Director role (school-level overview)
│   │   ├── Achievements.jsx           # Student gamification (deprecated, low priority)
│   │   ├── Notifications.jsx
│   │   └── ...
│   ├── components/
│   │   ├── Sidebar.jsx                # Main nav (Today/Teach/Discover/Account groups)
│   │   ├── PlanView.jsx               # Unit-based plan view inside a class
│   │   ├── CloseUnitFlow.jsx          # Close-unit modal + summary page
│   │   ├── SectionBadge.jsx           # The Warmup/Exit/Review pill
│   │   ├── PageHeader.jsx
│   │   ├── tokens.js                  # Color + spacing design tokens
│   │   └── ...
│   └── lib/
│       ├── ai.js                      # Generation orchestration
│       ├── ai-prompt.js               # Prompts for question generation
│       ├── close-unit-ai.js           # Client for narrative + review deck
│       ├── close-unit-prompt.js       # Prompts for narrative + review
│       ├── section-theme.jsx          # Quiz visual theming per section
│       ├── spaced-repetition.js       # Core retention algorithm
│       ├── scoring.js                 # Answer evaluation
│       ├── pdf-export.js              # Deck → PDF (exam + answer key)
│       └── ...
├── supabase/                          # SQL migrations (in order)
│   ├── schema.sql                     # Initial schema
│   ├── phase1_class_hierarchy.sql
│   ├── phase4_review_scoring.sql      # Free-text grading
│   ├── phase5_units_status.sql        # Units with status
│   ├── phase6_units_themes.sql        # Units as themes
│   ├── phase7_unit_closing_note.sql
│   ├── phase12_close_unit_ai.sql      # Latest: AI narrative caching
│   └── ...
├── docs/
│   └── SCHOOL_YEARS_PLAN.md           # Future feature spec (August 2026)
├── package.json
├── vercel.json
└── vite.config.js
```

### Database schema (high-level)

**Core tables:**
- `profiles` — every user. Roles: `teacher`, `student`, `admin`, `director`.
- `classes` — owned by a teacher. Has join_code, subject, grade.
- `class_members` — student enrollment in a class (many-to-many).
- `units` — themes within a class. Status: `planned`/`active`/`closed`. Stores `closing_narrative` jsonb (AI), `closing_note` text (teacher reflection).
- `decks` — quiz content. Belongs to a class, optionally to a unit. Has `section` (warmup/exit_ticket/general_review).
- `sessions` — one launch event. Has PIN, deck_id, settings, status.
- `session_participants` — students who joined a session.
- `responses` — individual answers. Indexed by participant × question × session.
- `notifications` — in-app notification feed.
- `ai_generations` — log of every AI call (for stats + rate limiting).

**Key views/computed:**
- `class_decks_summary` — aggregate stats per deck per class. The retention algorithm reads from here.

**RLS philosophy:** Every table has Row Level Security. Teachers see their own classes. Students see classes they're members of. No data leakage between teachers.

---

## 5. What's built (feature inventory)

This is comprehensive — every feature shipped through PR 12.1.

### Auth & profiles
- ✅ Email/password sign-up + login (Supabase Auth)
- ✅ Google OAuth login
- ✅ Profile setup with avatar selection (catalog of preset avatars)
- ✅ Roles: teacher / student / admin / director
- ✅ Multi-language UI: English, Spanish, Korean

### Class management (teacher)
- ✅ Create class with subject, grade, color
- ✅ Edit class metadata
- ✅ Join code (6 chars) for student enrollment
- ✅ Class import (paste list of student names)
- ✅ Per-class member list with grades + trends
- ✅ Class insights page: deep stats per deck/student/topic

### Decks
- ✅ Create deck manually (question editor)
- ✅ AI-generate deck from prompt or material (Sonnet writes + Haiku verifies)
- ✅ Question types: MCQ (single + multi-correct), True/False, Fill-in-the-blank, Match, Order, Slider, Free text, Sentence builder
- ✅ Image options for MCQ
- ✅ Deck section (warmup/exit_ticket/general_review)
- ✅ Drag-to-reorder decks within a class
- ✅ PDF export: print-ready exam + answer key
- ✅ Adapted decks (copy-from-community with attribution)
- ✅ Public/private deck flag
- ✅ Deck cover art (color tints + auto-generated banner)

### Units (themes)
- ✅ Plan view: organize decks by unit
- ✅ Top tabs: Current / Past / Upcoming / General / Search
- ✅ Unit status flow: planned → active → closed
- ✅ Auto-promote next planned unit when active closes
- ✅ Drag-and-drop decks between units
- ✅ Close-unit modal + summary page
- ✅ Reopen closed units (with confirmation)
- ✅ **AI close-unit narrative (PR 12)** — Sonnet writes "what worked / what didn't", Sonnet verifies
- ✅ **Suggested closing review (PR 12)** — Sonnet generates 7-question recap targeting weakest topics

### Live sessions
- ✅ Launch a deck → PIN appears → students join
- ✅ Real-time question display + participant counter
- ✅ Per-question results screen
- ✅ Final results + leaderboard
- ✅ Session settings: timer per question, total timer, one-attempt vs retry, who sees correct answer
- ✅ Free-text questions: students submit, teacher grades later
- ✅ Late-join handling
- ✅ Practice mode (student plays a deck solo, no live host)
- ✅ Guest mode (student joins without account, optional)
- ✅ Exit button in practice mode

### Student experience
- ✅ Saved decks ("favorites") — student can mark + practice anytime
- ✅ My Classes view with section badges per deck
- ✅ Notifications: when teacher grades free-text, when class invites them
- ✅ My Results: history of every quiz they've taken
- ✅ **Themed quiz UI per section (PR 10)**: warm cream for warmup, lavender for exit, neutral for review. Both light and dark mode.
- ✅ Quiz: vertical list MCQ (replaced 2x2 Kahoot grid)
- ✅ Section identity in headers (icon + label)

### Spaced repetition
- ✅ "Today" page: surfaced decks needing review
- ✅ Retention scoring per deck per class
- ✅ Distribution across classes (no single class hogs suggestions)
- ✅ 14-day ignore-cap (decks not touched stop suggesting)
- ✅ "Worth reviewing today" widget

### Free-text grading
- ✅ Review queue (`/review`) with badge count
- ✅ Keyboard-fast grading (1=correct, 2=partial, 3=incorrect)
- ✅ Comment field
- ✅ Notification to student when graded
- ✅ Per-grade scoring (full/partial/zero credit)

### Community
- ✅ Browse all public decks
- ✅ Filter by subject, grade, language
- ✅ Section badges on cards (PR 9)
- ✅ Adapt deck → copy to your class
- ✅ Teacher profiles (public): see their published decks
- ✅ Yellow tint highlights popular community decks

### AI infrastructure
- ✅ Rate limiting: 50 generations / 24h / teacher
- ✅ Logged in `ai_generations` table for analytics
- ✅ Validation pipeline (Sonnet writes, Haiku validates per-question)
- ✅ Material-based generation (paste content → AI generates questions about it)
- ✅ Admin AI stats dashboard
- ✅ Multi-language generation (EN/ES/KO)

### Other
- ✅ Mobile-friendly (sidebar collapses to drawer on mobile)
- ✅ Dark mode (full coverage)
- ✅ Notion-style design language: Outfit + Inter fonts, restrained color palette
- ✅ Director role: school-level overview (multiple teachers)
- ✅ Achievement system (deprecated, kept for compatibility)

---

## 6. What's NOT built (and why)

These were intentional non-decisions:

- **No native push notifications.** In-app badge in sidebar instead. Avoids browser permission prompts and service workers.
- **No multi-teacher per class.** One class = one teacher. If two co-teach, each has their own version.
- **No self-study primary mode.** Practice mode exists but isn't the main flow. Anki/Quizlet do solo study better.
- **No AI-generated quizzes at scale.** AI helps build decks, but teacher curation is central.
- **No staging environment.** Push to `main` deploys to production. Risk accepted because Jota is the only user with admin powers and uses the product daily.
- **No formal gradebook export.** Not an LMS, not trying to be.
- **No Stripe yet.** Free for everyone currently. Pricing infrastructure is planned but ungated.
- **No scheduled emails / digests.** All comms in-app.

---

## 7. Design system

### Colors

Defined in `src/components/tokens.js`. Light mode is the primary; dark mode mirrors with adapted values.

- **Accent (primary action):** `#2383E2` (blue)
- **Purple:** `#9933CC` (used for combos with accent in gradients)
- **Section colors:**
  - Warmup: `#D9730D` (warm orange) — energetic, "calentemos motores"
  - Exit ticket: `#6940A5` (purple) — reflective, "demostrá lo aprendido"
  - General review: `#4A4438` (warm gray) — neutral, "estamos repasando"
- **Semantic:**
  - Green (success/correct): `#0F7B6C`
  - Red (error/wrong): `#C44D4D`
  - Orange (warning): `#D9730D`
- **Black buttons (#000):** reserved for serious actions ("Close unit", "Generate review deck")

### Typography

- **Display (headings, page titles):** Outfit (semibold/bold)
- **Body:** Inter
- **Monospace (PINs, codes):** JetBrains Mono

### Tone

- Notion-aesthetic — restrained, lots of whitespace, no decoration for decoration's sake.
- Warm where it counts (section identity, encouragement).
- Direct in copy. No "We've got this!" cheerleader voice. No "Great job!" after every action.
- Spanish copy uses `vos` informal where applicable (Jota is from a vos region).
- Comments in code explain WHY not WHAT.

---

## 8. Working agreements (the project's "constitution")

These are decisions that survived multiple sessions and apply to all future work.

### Hard constraints

- **Don't touch achievements, community moderation, gamification.** They exist, they work, they're not priorities. Deprioritize, don't refactor.
- **No batch AI generation.** Quality > speed. The Sonnet+Haiku pipeline is the standard.
- **Quality > speed always.** If a feature is half-baked, ship it later.
- **No data loss.** Always migrate, never delete. Soft archive over hard delete.
- **Comments explain WHY not WHAT.** Code shows the what.
- **Dark mode is tested.** Every PR that touches UI must work in dark mode. Jota tests this manually.
- **LF line endings.** Never CRLF in commits.

### Communication style with Claude

- **Spanish, casual.** No sycophancy. No "great question!" preamble.
- **Methodical.** "Decidi tu" common — if Jota doesn't have a strong opinion, Claude picks with reasoning.
- **Confirms via "confio".** Means "I trust your call, proceed".
- **Direct honest feedback.** No padding.
- **Push back when warranted.** If Claude thinks a feature should wait, say so.

### Deploy workflow

1. Claude writes code locally in `/home/claude/clasloop-fresh/clasloop-phase1/`
2. Validates JS/JSX with `@babel/parser` (no ESLint, no TypeScript)
3. Commits with detailed message (PR description + reasoning)
4. Zips the project (excluding `node_modules`, `dist`)
5. Jota downloads, unzips, runs `git push origin main`
6. Vercel auto-deploys
7. **No local validation possible.** Jota doesn't run `npm dev`. Production is the test bench.

### What an "ideal PR" looks like

- One concept per PR (PR 9 = section badges in two places, PR 10 = quiz redesign, etc.)
- Migration in `supabase/phaseN_*.sql` if schema changes — Jota runs in Supabase SQL editor BEFORE deploy
- Detailed commit message: what changed, why, what NOT changed, how to revert
- Zipfile delivered with name `clasloop-prN-short-description.zip`
- Followup of "if anything breaks: `git revert HEAD`"

---

## 9. Roadmap

### Just shipped (PR 9–12.1)

- ✅ Section badges in Community + TeacherProfile
- ✅ Student quiz visual redesign (per-section identity, vertical MCQ)
- ✅ Section badges in MyClasses
- ✅ Exit button in practice mode
- ✅ AI close-unit narrative (Sonnet+Sonnet)
- ✅ Suggested closing review deck
- ✅ Better placeholder for closing-note textarea

### Pending from student feedback (next sessions)

#### **Mini stories generator with 5 MCQ** (deferred from May 10)
The teacher pastes material, AI invents a short story (200 words) that uses that material, then generates 5 MCQ questions to test reading comprehension. Discussed in detail but not yet built.

Decisions made:
- Material-based, not theme-only (teacher pastes content → AI builds story around it)
- Story stored in `deck.description` or new `story_text` field (TBD during implementation)
- Student reads story first, then answers 5 MCQ — story stays accessible during questions

Estimated work: ~1 session.

### Big planned features

#### **Landing page** (deferred to August)
The current landing is minimal/placeholder. Needs:
- Pricing decision (free vs paid tier)
- Feature highlights with screenshots
- Sign-up CTA
- For-schools section (B2B path)

Blocked on: Jota's product/pricing decisions (deferred until he has more usage data).

#### **School years** (planned for August 2026)
Full feature spec in `docs/SCHOOL_YEARS_PLAN.md`. Adds a "school year" concept so teachers can:
- Reuse classes year-after-year without polluting retention data
- Switch between viewing 2025-2026 / 2026-2027 / etc.
- AI narratives only see current year's data
- Past years remain accessible read-only

Estimated work: 3–5 sessions. **Don't start without re-reading the spec.**

### Possible / lower priority

- **Privacy: 180-day archival of individual responses.** Aggregate stats stay; per-student answers archive after retention window. Not yet started.
- **Stripe integration.** Free tier exists by default. When Stripe is integrated, gating moves from "infinite for everyone" to "tier-based". Tier limits already designed but not enforced.
- **Director dashboard improvements.** Director role exists but the dashboard is basic. School-level analytics could be expanded.
- **More languages.** EN/ES/KO is current. PT, FR, JP would be natural extensions.

### Explicit "won't do" (for now)

- Native mobile app
- Multi-teacher per class
- Course/unit/lesson/topic hierarchy (just classes/units/decks, flat)
- Self-study mode as primary flow
- Curriculum standards alignment (Common Core, IB, etc.)

---

## 10. Pricing model (planned, not enforced)

Free tier infrastructure exists. When Stripe lands, the gating activates.

### Free
- Up to 3 classes
- Up to 50 students total
- 50 AI generations / 24 hours
- All core features

### Paid (target: ~$10/mo)
- Unlimited classes
- Unlimited students
- 200 AI generations / 24 hours
- PDF export
- Priority support

### School plan
- Per-seat pricing
- Director dashboard
- Bulk teacher onboarding
- (Details TBD)

These numbers are sketches — final decisions deferred to landing page work.

---

## 11. Critical operational knowledge

### How to deploy

```bash
# Jota's machine, after receiving a zip from Claude:
unzip clasloop-prX-description.zip -d clasloop-prX/
cd clasloop-prX/clasloop-phase1
# If migration is included:
# 1. Run supabase/phaseN_*.sql in Supabase SQL editor first
# 2. Then push code:
git push origin main
# Vercel auto-deploys in ~2 minutes
```

### How to roll back

```bash
git revert HEAD
git push origin main
```

For schema rollbacks: migrations are designed to be additive (new columns, new tables — never destructive). If a schema change broke something, the column can usually stay; just revert the code that uses it.

### Environment variables

Needed in Vercel:
- `ANTHROPIC_API_KEY` — Claude API
- `SUPABASE_URL` — Supabase project URL (public)
- `SUPABASE_ANON_KEY` — Supabase anon key (public)
- `SUPABASE_SERVICE_KEY` — Supabase service role key (server-only, never exposed to client)

Local dev: `.env.example` shows the structure. Jota doesn't run locally; this is for reference / for the next dev who joins.

### Where things break (common pitfalls)

- **CRLF line endings** sneak in if you edit on Windows. Always check `file path/to/file.js` shows "Unicode text, UTF-8 text" (no `with CRLF`).
- **Missing migration.** If a PR adds a column and the SQL hasn't been run, the feature silently doesn't persist. Always note in commit: "Run migration first."
- **JSX in `.js` files.** Vite needs `.jsx` extension to process JSX. `section-theme.jsx` is the example.
- **Sidebar z-index.** Sidebar is `z-index: 60, position: fixed`. Anything `position: fixed` with lower z-index gets hidden. Fixed in PR 11.1.
- **Practice mode vs live session distinction.** Many components branch on `isPractice`. Forgetting this = bugs.

---

## 12. The "feel" of working on Clasloop

For the next session / next person:

- **The product is opinionated.** Resist requests that violate the mental model.
- **Jota is the user, the developer, and the PM.** When he says "this is what users want", he means it — he's literally the user.
- **He uses the product daily.** Bug reports are usually about today's class. Latency matters.
- **Sessions go in cycles:** ship → use a few days → return with feedback → ship again. Don't try to ship 5 features at once.
- **The product's quality is in the polish.** Section badges in 4 places. Theme-aware everything. Dark mode tested. The aggregation of small care is what makes it feel professional.
- **When in doubt, ship less.** A single well-shipped feature beats two half-shipped ones.

---

## 13. Decisions journal (highlights)

These are decisions that shaped the product. Recorded so future sessions don't re-litigate.

- **Sections instead of tags** (PR 6 era): warmup/exit/review is a structural distinction, not a label. Affects pedagogy, scheduling, AI prompts.
- **Units as themes, not as containers with their own section** (PR 6): a unit is "Verbo hacer", contains both warmups and exits. Cleaner mental model.
- **General review decks live outside units** (PR 6): they recap MULTIPLE themes. `unit_id = null`.
- **Sonnet+Haiku for question generation, Sonnet+Sonnet for narrative** (PR 12): question generation runs many times/day so Haiku's speed matters. Narrative runs ~2x/month so quality dominates.
- **Vertical MCQ instead of Kahoot 2x2 grid** (PR 10): Kahoot grid is the "look they don't like". Vertical reads better on mobile.
- **Section theming is semantic, but right/wrong is universal** (PR 10): correct=green, wrong=red, regardless of section. Section colors only on idle/selected states.
- **Mandatory school year onboarding** (planned, August 2026): half of users would skip if optional, leaving null state pollution.
- **Explicit "Add units to year" instead of implicit** (planned): gives curriculum-change agency to teachers.
- **Don't start school years now** (May 2026): mid-year is wrong timing; build it during summer with real-usage insights.

---

## 14. How to pick this up

If you're a new Claude session reading this:

1. Read `CLASLOOP_VISION.md` (if present in uploads) for the philosophical why.
2. Read this file end to end.
3. Skim recent commits: `git log --oneline -25` shows the last 25 PRs.
4. Read the SKILL files relevant to whatever you're about to build.
5. When Jota writes, default to Spanish casual. Be direct. Push back with reasoning when relevant.
6. If asked to build something big: scope it first, get decisions, build in phases.

If you're a human dev joining the project:

1. Same first 3 steps.
2. Get Vercel + Supabase access from Jota.
3. Run the project locally: `npm install && npm run dev`. Check `.env.example`.
4. Read `docs/SCHOOL_YEARS_PLAN.md` for the next big feature.
5. Talk to Jota about pricing/landing — those are unblocked the moment he has product strategy decisions.

---

## 15. Contact + ownership

**Jota** is the sole owner, developer, and primary user. He teaches Spanish in Korea. He's been building Clasloop for ~10 months as of May 2026. He uses it in his real classroom every week.

If you're handing this off to anyone else, get Jota's blessing first.

---

*End of handoff document. ~2,400 words. Update version: 2026-05-10.*
