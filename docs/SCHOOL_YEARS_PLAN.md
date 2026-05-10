# Clasloop — School Years Feature Plan

**Status:** Planned, not yet implemented.
**Created:** 2026-05-10
**Implementation target:** August 2026 (during summer break, before September school year start).
**Estimated effort:** 3-5 sessions of focused work.

---

## TL;DR

Add a "school year" concept to Clasloop so the same teacher can use the same classes and decks year after year, but each year's data (sessions, responses, retention, narratives) stays scoped to that year. AI-generated insights and stats only look at the current year's data, but historical years remain accessible.

**The problem this solves:**
A teacher (Jota) teaches Spanish 1, 2, 3 every year with the same curriculum and same classes. Today, if he keeps using the same Clasloop class across years, retention data and AI narratives get polluted by mixing data from previous students. There's no way to "start fresh" without losing his decks or duplicating classes.

**The mental model:**
Classes (Spanish 1, 2, 3) and decks are *permanent assets*. School years are a *temporal lens* — a selector that filters what data the app shows and what the AI analyzes. Switching years doesn't delete anything; it just changes the lens.

---

## Final design decisions (confirmed by Jota)

These are settled. Don't re-litigate without strong reason.

### Decision 1: Units as templates, with multiple closures per year

**Decided:** Same unit reused across years, but each year gets its own closure narrative.

When Jota teaches "Verbo hacer" in 2025-2026 and closes the unit, that closure (narrative + closing note + closed_at + retention snapshot) is associated with school year 2025-2026. When he teaches "Verbo hacer" again in 2026-2027 with a new group, the SAME unit is reused, and a NEW closure record is created for 2026-2027. The unit ends up with multiple closures over its lifetime — one per year it was taught.

**Why this matters for schema:** The current `units.closing_narrative` JSONB column can only hold one narrative. We need a separate `unit_closures` table.

### Decision 2: Mandatory school year selection at first login after migration

**Decided:** No skip option. The teacher MUST choose a school year before doing anything.

The first time a teacher logs in after this feature ships, they see a modal: "Welcome — let's set up your school year." They define a label ("2026-2027") and optionally start/end dates. Once chosen, that becomes their `current_school_year_id`. They can't dismiss the modal, can't navigate away, can't continue without choosing.

**Why mandatory:** If we let teachers skip, half of them will end up with `current_school_year_id = null` and the filter logic gets ugly with null-checks everywhere. Better to have everyone in a year from day one.

**Onboarding flow:** Detect `profiles.current_school_year_id IS NULL` on every page load → show modal → teacher fills label → INSERT into `school_years` → UPDATE profiles.

### Decision 3: Year selector visible above Today, primary-level UI

**Decided:** Not buried in settings. A click-target visible at the top of the Today page (and possibly globally in the sidebar). One click opens dropdown of available years, another click switches.

Visual concept: a chip or button that says "2025-2026 ▾" sitting above the Today page header. Clicking shows the list of all years the teacher has ever set up, with the current one highlighted. Switching takes effect immediately and refreshes the page data.

**Why primary-level:** This is a context the teacher will think about every September. Hiding it in settings means the feature gets forgotten. Showing it always reinforces the mental model: "the data I'm seeing is filtered by this year."

### Decision 4: Community decks have no school year

**Decided:** Decks themselves (community or own) don't have a `school_year_id`. They're reusable content.

What does carry `school_year_id`:
- `sessions` — every launch belongs to a year
- `responses` — every student answer belongs to a year (inherited from the session)
- `class_members` — student enrollments in a class are per-year (a student in 2025-2026 isn't necessarily in 2026-2027)
- `unit_closures` — closure events belong to a year
- Possibly `unit_year_links` — see Decision 6

What does NOT carry it:
- `decks` — they're templates, used across years
- `classes` — they're permanent (Spanish 1 is Spanish 1 forever)
- `units` (the row itself) — they're templates; the year-specific data is in `unit_closures` and `unit_year_links`
- `profiles` — except for `current_school_year_id` pointer

### Decision 5: Year change asks what to do with active units

**Decided:** When the teacher changes from 2025-2026 to 2026-2027, the app counts how many units are still in `active` status with the old year's data. It shows a modal:

> "You have 3 units still active in 2025-2026:
> - Verbo hacer
> - Subjunctive mood
> - Por y para
>
> What would you like to do with them?
>
> [Close all and generate narratives] [Archive without closing] [Leave as-is and continue]"

**Defaults:** The first option ("Close all") is the recommended path and visually highlighted. Archive means the units become hidden in the new year but remain in 2025-2026 history. "Leave as-is" is the escape hatch but creates the weird state of "this unit shows in both years" — the teacher can sort it out manually later.

**Why ask, not auto:** Auto-closing is destructive (generates narratives, locks editing). Auto-archiving might lose units the teacher actually wanted to continue. The teacher is the only one who knows the right answer.

### Decision 6: Units explicitly added to each new year

**Decided:** Decision is option B from the planning chat — explicit "Add units" button.

When the teacher switches to a new year (e.g. 2026-2027), Plan view starts EMPTY. There's a clear CTA: "Add units to this year" which opens a panel showing all the teacher's existing units. They check the ones they want to teach this year, click "Add", and those units now appear in Plan view's planned/active tabs (still in `planned` status, just freshly added to the year).

**Why explicit:** Curriculum changes between years. Some topics get dropped, new ones get added. Forcing the teacher to actively choose makes the catalog more intentional. Otherwise Plan view fills up with stale topics from 2 years ago.

**Schema implication:** Need a `unit_year_links` table:
```
unit_year_links (
  unit_id uuid,
  school_year_id uuid,
  added_at timestamptz default now(),
  primary key (unit_id, school_year_id)
)
```
A unit appears in a year's Plan view only if there's a row in `unit_year_links` for that pair.

---

## Open questions (resolve during implementation)

These weren't fully decided in planning. Defer until needed:

### Q1: How does the year label work?

**Phase 1 (when implementing):** Free text. The teacher types "2025-2026" or "Año escolar 2026" or whatever. Simple, gets the feature out the door.

**Phase 2 (later):** Optional structured fields — `start_date`, `end_date`, `country` for auto-suggesting labels per region.

**Don't over-engineer Phase 1.**

### Q2: Sessions in past years — read-only or read-write?

When the teacher views a past year (2024-2025) using the selector, can they edit anything? Recommend **read-only**. The data is historical. Editing past data corrupts the historical record.

Implementation: when `current_school_year_id !== row.school_year_id`, disable launch buttons, hide the close-unit button, etc. Show a banner: "You're viewing a past year (2024-2025). Switch to 2026-2027 to edit."

### Q3: First-time experience for an existing unit's first year

When a brand-new teacher signs up after this feature ships, they create a class, create a unit, launch a warmup. Where does that data go?

Answer: into their `current_school_year_id`. The mandatory onboarding (Decision 2) runs first, so they always have a year set.

### Q4: What happens to data from BEFORE this feature ships?

This is the migration question. Existing teachers (Jota included) have sessions, responses, class_members, unit closures from before school years existed. We need to backfill them to a default year.

**Approach:** During the migration, for each existing teacher, create a `school_year` row labeled "Before 2026-2027" (or "All previous data"). Set every existing session/response/class_member/unit_closure to that school year. Set the teacher's `current_school_year_id` to a newly-created "2026-2027" (also auto-generated). On their first login, they see the new modal as a confirmation: "We've set you up for 2026-2027. Your past data is available under 'Before 2026-2027'." They can edit the labels.

### Q5: Spaced repetition — across years or within?

Today, spaced repetition uses ALL of a class's responses to compute "what's worth reviewing today." If a class has 2 years of data, that's a problem.

**Answer:** Spaced repetition queries should filter by `current_school_year_id`. The "what's worth reviewing today" logic is about THIS year's students, not last year's.

### Q6: What about Today / Worth Reviewing widgets?

Same as Q5 — filter by current year. Widgets that show "Today" or "Worth Reviewing" should only see this year's data.

### Q7: What about class_decks_summary?

It's a Postgres view (or table) computed from sessions+responses joined to decks. Need to add `school_year_id` filter. Probably easier to convert to a function: `class_decks_summary(school_year_id uuid)` returning the same shape but filtered.

---

## Schema changes (full migration)

```sql
-- ============================================
-- school_years.sql — Adds school year scoping
-- ============================================

-- 1. school_years table
create table public.school_years (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,                -- "2025-2026", "Año escolar 2026", etc.
  start_date date,                    -- nullable; phase 1 doesn't enforce
  end_date date,                      -- nullable; phase 1 doesn't enforce
  archived_at timestamptz,            -- soft delete; null = active
  created_at timestamptz default now() not null,
  unique (teacher_id, label)
);

-- RLS: teachers see only their own years
alter table public.school_years enable row level security;
create policy "Teachers see own years" on public.school_years
  for select using (auth.uid() = teacher_id);
create policy "Teachers manage own years" on public.school_years
  for all using (auth.uid() = teacher_id);

-- 2. profiles.current_school_year_id
alter table public.profiles
  add column current_school_year_id uuid references public.school_years(id) on delete set null;

-- 3. school_year_id on activity tables
alter table public.sessions
  add column school_year_id uuid references public.school_years(id) on delete set null;
alter table public.responses
  add column school_year_id uuid references public.school_years(id) on delete set null;
alter table public.class_members
  add column school_year_id uuid references public.school_years(id) on delete set null;

-- Indexes for filtered queries
create index idx_sessions_school_year on public.sessions (school_year_id);
create index idx_responses_school_year on public.responses (school_year_id);
create index idx_class_members_school_year on public.class_members (school_year_id);

-- 4. unit_closures table — replaces units.closing_narrative
create table public.unit_closures (
  id uuid default uuid_generate_v4() primary key,
  unit_id uuid references public.units(id) on delete cascade not null,
  school_year_id uuid references public.school_years(id) on delete cascade not null,
  narrative jsonb,                    -- {whatWorked, whatDidnt, version, model, verified}
  narrative_generated_at timestamptz,
  closing_note text,
  closed_at timestamptz default now() not null,
  unique (unit_id, school_year_id)    -- one closure per unit per year
);

alter table public.unit_closures enable row level security;
create policy "Teachers see own closures" on public.unit_closures
  for all using (
    exists (
      select 1 from public.units u
      join public.classes c on u.class_id = c.id
      where u.id = unit_closures.unit_id and c.teacher_id = auth.uid()
    )
  );

-- 5. unit_year_links — for explicit "Add unit to year" (Decision 6)
create table public.unit_year_links (
  unit_id uuid references public.units(id) on delete cascade,
  school_year_id uuid references public.school_years(id) on delete cascade,
  added_at timestamptz default now() not null,
  primary key (unit_id, school_year_id)
);

alter table public.unit_year_links enable row level security;
create policy "Teachers manage own links" on public.unit_year_links
  for all using (
    exists (
      select 1 from public.units u
      join public.classes c on u.class_id = c.id
      where u.id = unit_year_links.unit_id and c.teacher_id = auth.uid()
    )
  );

-- 6. Backfill — runs ONCE during migration
-- For every existing teacher: create a "Before [next year]" school year
-- and set all their existing data to it. Then create their next year's
-- school year and set it as current.
-- This is a function so it can be re-run safely if it fails partway.
do $$
declare
  rec record;
  default_past_year_id uuid;
  default_current_year_id uuid;
begin
  for rec in select id from public.profiles where role = 'teacher' loop
    -- Skip if already has a current year (idempotent)
    if exists (select 1 from public.profiles
               where id = rec.id and current_school_year_id is not null) then
      continue;
    end if;

    -- Past data goes into "Before 2026-2027"
    insert into public.school_years (teacher_id, label, archived_at)
    values (rec.id, 'Before 2026-2027', now())
    returning id into default_past_year_id;

    -- Current year
    insert into public.school_years (teacher_id, label)
    values (rec.id, '2026-2027')
    returning id into default_current_year_id;

    -- Backfill activity tables for this teacher
    update public.sessions s set school_year_id = default_past_year_id
      where s.teacher_id = rec.id and s.school_year_id is null;

    update public.responses r set school_year_id = default_past_year_id
      where r.school_year_id is null
        and r.session_id in (select id from public.sessions where teacher_id = rec.id);

    update public.class_members cm set school_year_id = default_past_year_id
      where cm.school_year_id is null
        and cm.class_id in (select id from public.classes where teacher_id = rec.id);

    -- Migrate units.closing_narrative to unit_closures (only for this teacher)
    insert into public.unit_closures (unit_id, school_year_id, narrative,
                                       narrative_generated_at, closing_note, closed_at)
    select u.id, default_past_year_id, u.closing_narrative,
           u.closing_narrative_generated_at, u.closing_note,
           coalesce(u.closed_at, now())
    from public.units u
    join public.classes c on u.class_id = c.id
    where c.teacher_id = rec.id
      and (u.closing_narrative is not null or u.closing_note is not null
           or u.status = 'closed');

    -- Set teacher's current year
    update public.profiles set current_school_year_id = default_current_year_id
      where id = rec.id;
  end loop;
end $$;

-- 7. After backfill is verified, drop the legacy columns (DO IN A LATER MIGRATION)
-- alter table public.units drop column closing_narrative;
-- alter table public.units drop column closing_narrative_generated_at;
-- alter table public.units drop column closing_note;
-- ^^^ Don't drop these in the same migration. Keep for ~1 month
-- after rollout in case rollback is needed.
```

---

## Implementation plan — session by session

### Session 1: Schema + backfill + read paths

**Goal:** All data has a school_year_id. The app still works with no UI changes — just queries filter by year.

- [ ] Run the schema migration (see above)
- [ ] Verify backfill: every existing session/response/etc has a school_year_id
- [ ] Update `getUnitRetentionSummary` to filter by `school_year_id`
- [ ] Update `class_decks_summary` to take year parameter
- [ ] Update spaced-repetition queries to filter by year
- [ ] Update Today widget queries to filter by year
- [ ] Update close-unit narrative endpoint to read from `unit_closures` table, not `units.closing_narrative`
- [ ] Update writes: when creating a session, set `school_year_id` from teacher's `current_school_year_id`
- [ ] Run end-to-end test: existing teacher logs in, sees their old data under the "Before 2026-2027" year, can switch to 2026-2027 and see empty state

**Risk:** Schema migration on production data. Rehearse on a staging copy first if possible.

### Session 2: Onboarding modal + year selector UI

**Goal:** Teachers can see and change their current year.

- [ ] Build the mandatory onboarding modal that appears when `current_school_year_id IS NULL`
  - Form: label (free text), optional start/end dates
  - Submit creates `school_years` row + sets `current_school_year_id`
  - Cannot be dismissed
- [ ] Build the year selector (dropdown chip above Today)
  - Shows all years for this teacher
  - Highlights current
  - Click changes `current_school_year_id`
  - Page refresh after switch
- [ ] Add the year selector to the sidebar too (optional, depending on visual)
- [ ] Add "viewing past year" banner that shows when `current_school_year_id` is an archived year
- [ ] Test: teacher can create year, switch year, see UI reflect the change

### Session 3: Year-change flow + active-units modal

**Goal:** Teacher can transition cleanly from one year to the next.

- [ ] When teacher tries to switch years and there are active units in the OLD year, intercept with the "What to do?" modal (Decision 5)
- [ ] Implement "Close all" — bulk-call close-unit logic for each active unit, generating narratives
- [ ] Implement "Archive" — mark units as archived in the old year (they don't show in any year's Plan view, but are accessible via Library/history)
- [ ] Implement "Leave as-is" — just switch year, leave the units in their current state. Show a warning: "These units will appear in both years."

### Session 4: Add units to year + Plan view changes

**Goal:** Plan view respects unit_year_links. Teacher can manually add units.

- [ ] Plan view queries Plan items via `unit_year_links` JOIN — only units linked to current year show
- [ ] "Add units" button opens a modal listing teacher's units (across all classes/years)
- [ ] Multi-select: teacher picks which to add to current year
- [ ] On submit: insert rows into `unit_year_links`
- [ ] Empty state for new years: prominent "Add units to start planning"
- [ ] Test: switch to a fresh year, see empty plan, add 3 units, verify they appear

### Session 5: Polish + edge cases + Library impact

**Goal:** Catch all the corners.

- [ ] Library view of decks: should they show a year? Probably no — decks are reusable. But session counts shown next to a deck should be filtered.
- [ ] Community: no changes (decks are global, no year context)
- [ ] Director dashboard (if used): needs year filter — probably another session of work
- [ ] AdminAIStats: filter by year (or aggregate across all years)
- [ ] Past year viewing: read-only mode with banner (Q2)
- [ ] Close-unit summary: show selector to view past closures of the same unit ("Verbo hacer in 2024-2025: see narrative")
- [ ] Translation: en/es/ko strings for all new UI

---

## Key decisions journal (record of how we got here)

This is the reasoning behind the decisions in case future sessions want to revisit.

**Why not "clone class" for new years?**
Original conversation explored option B "clone class". Rejected because:
- Teacher (Jota) explicitly said classes are permanent ("voy a enseñar Spanish 1, 2, 3 sin importar el año").
- Cloning duplicates the join code, requires re-inviting students, multiplies admin work.
- Decks are reusable in Clasloop; we should reuse classes too.

**Why a separate `unit_closures` table instead of array on `units`?**
Considered making `units.closures` a JSONB array of closure objects. Rejected because:
- Querying "all closures across all units in 2025-2026" requires unnesting, slow.
- RLS gets weirder with array elements.
- Adding closures means UPDATE on a potentially large array.
- Separate table is the boring relational solution. Boring is good for schema.

**Why mandatory onboarding modal?**
Considered making the school year optional initially with auto-defaults. Rejected because:
- Half of users would skip and end up in a broken state with no current year.
- Filter logic with nulls is messy.
- The modal is one-time friction; the alternative is permanent ambiguity.

**Why explicit "Add units to year" instead of automatic?**
Originally leaning toward implicit (Decision 6 option A). Jota chose explicit. Reasoning he gave (paraphrased): "I want to control which units appear, in case I drop topics from the curriculum between years." Sound reasoning — preserves curriculum agency.

---

## What this is NOT

To prevent scope creep when implementing:

- **Not a calendar feature.** No date pickers for "when does the year start", no automatic year-end transitions. Teacher chooses years and switches manually.
- **Not multi-tenancy.** Each teacher has their own years. There's no school-level or district-level shared year.
- **Not analytics across years.** Phase 1 doesn't include "compare 2024-2025 vs 2025-2026" dashboards. That's a future feature.
- **Not student-facing.** Students don't see school years. Their join code, class membership, and quiz experience are unchanged.
- **Not a billing change.** Pricing/limits are per-teacher, not per-year. (If pricing tiers ever exist, they shouldn't be year-scoped.)

---

## Pre-flight checklist before starting

When the next session arrives to implement this:

1. Verify the schema migration runs cleanly on a staging DB
2. Confirm Jota wants to proceed (mid-summer might bring new ideas)
3. Re-read this document end to end
4. Ensure you have a backup of production data before running the migration
5. Plan the rollout: probably do schema migration during low-traffic time, since it touches every active table

---

## Reference: current state of the close-unit feature (PR 12 baseline)

The school years feature builds on top of PR 12 (AI close-unit narrative + suggested review deck). Current behavior:
- `units.closing_narrative` stores ONE narrative per unit (will be migrated to `unit_closures`)
- `units.closing_narrative_generated_at` timestamp (will be migrated)
- `units.closing_note` teacher reflection (will be migrated)
- Generated review decks have `section='general_review'`, `unit_id=null`, live in the class regardless of unit
- AI endpoint at `api/close-unit-narrative.js`
- Frontend at `src/components/CloseUnitFlow.jsx`

After school years lands:
- Reading: `unit_closures` table joined by current year
- Writing: closures go into `unit_closures` with current year's id
- The `units.closing_*` columns become deprecated (kept for ~1 month for rollback safety, then dropped)

---

*End of document. Total decisions captured: 6 settled + 7 deferred. Total schema additions: 2 columns + 4 tables. Estimated work: 3-5 sessions.*
