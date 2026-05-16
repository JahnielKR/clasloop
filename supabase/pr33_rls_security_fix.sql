-- ═══════════════════════════════════════════════════════════════════════
-- PR 33: RLS REWRITE — fix critical cross-tenant data leak
-- ═══════════════════════════════════════════════════════════════════════
--
-- Bug discovered by Jota: "cuando entra otro profesor no deberia de ver
-- mis to review, otro profesor se conecto y pudo ver todo como si fuera
-- yo tambien."
--
-- Root cause: every SELECT policy on the teacher-data tables was
-- `using (true)`, meaning ANY authenticated user could read EVERYONE's
-- sessions, responses, retention scores, members, etc. The comments in
-- the original schema said things like "readable by class teacher", but
-- the actual policies were wide open.
--
-- Specific bug: Review.jsx queried `responses WHERE needs_review=true`
-- and assumed RLS would filter to the current teacher's sessions. It
-- didn't. Another teacher logging in saw all pending reviews — every
-- teacher's, including Jota's.
--
-- ═══════════════════════════════════════════════════════════════════════
-- DESIGN
-- ═══════════════════════════════════════════════════════════════════════
--
-- Three tables stay readable by anyone (intentional, see comments):
--   - profiles  — UI needs teacher names/avatars publicly
--   - classes   — students look up by class_code to join (gate is the
--                 code, not RLS). Row exposes only public metadata.
--   - sessions  — students look up by pin to join (gate is the pin)
--
-- The rest are locked down by ownership:
--   - class_members           — class teacher OR own student row
--   - session_participants    — session teacher OR own student row
--   - responses               — session teacher OR own student row
--   - topic_retention         — class teacher only
--   - student_topic_progress  — class teacher OR own student row
--
-- INSERT remains permissive for the tables where unauthenticated
-- students need to write during a live quiz (responses,
-- session_participants, student_topic_progress, class_members). The
-- gate there is the session pin / class code, not auth.
--
-- ═══════════════════════════════════════════════════════════════════════

-- ── CLASS_MEMBERS ──────────────────────────────────────────────────────
drop policy if exists "Anyone can read class members" on public.class_members;

create policy "Class teacher reads members, student reads own row"
on public.class_members
for select
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
);

drop policy if exists "Class teacher updates members" on public.class_members;
create policy "Class teacher updates members, student updates own row"
on public.class_members
for update
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
);

drop policy if exists "Class teacher deletes members" on public.class_members;
create policy "Class teacher deletes members, student deletes own row"
on public.class_members
for delete
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
);

-- ── SESSION_PARTICIPANTS ───────────────────────────────────────────────
drop policy if exists "Anyone can read participants" on public.session_participants;

create policy "Session teacher reads participants, student reads own row"
on public.session_participants
for select
using (
  session_id IN (
    select id from public.sessions where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
);

drop policy if exists "Anyone can update participants" on public.session_participants;
create policy "Session teacher updates participants, student updates own row"
on public.session_participants
for update
using (
  session_id IN (
    select id from public.sessions where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
  -- Guests (unauthenticated) updating their own row via guest_token.
  -- RLS can't see the request body, so we permit any row that has
  -- a guest_token when there's no authenticated user in context.
  OR (guest_token IS NOT NULL AND auth.uid() IS NULL)
);

-- ── RESPONSES ──────────────────────────────────────────────────────────
drop policy if exists "Anyone can read responses" on public.responses;

create policy "Session teacher reads responses, student reads own"
on public.responses
for select
using (
  session_id IN (
    select id from public.sessions where teacher_id = auth.uid()
  )
  OR participant_id IN (
    select id from public.session_participants where student_id = auth.uid()
  )
);

drop policy if exists "Anyone can update responses" on public.responses;
drop policy if exists "Teachers can update responses" on public.responses;
create policy "Session teacher updates responses"
on public.responses
for update
using (
  session_id IN (
    select id from public.sessions where teacher_id = auth.uid()
  )
);

-- ── TOPIC_RETENTION ────────────────────────────────────────────────────
drop policy if exists "Anyone can read retention" on public.topic_retention;
drop policy if exists "Anyone can upsert retention" on public.topic_retention;
drop policy if exists "Anyone can update retention" on public.topic_retention;

create policy "Class teacher reads retention"
on public.topic_retention
for select
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
);

create policy "Class teacher upserts retention"
on public.topic_retention
for insert
with check (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
);

create policy "Class teacher updates retention"
on public.topic_retention
for update
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
);

-- ── STUDENT_TOPIC_PROGRESS ─────────────────────────────────────────────
drop policy if exists "Anyone can read progress" on public.student_topic_progress;

create policy "Class teacher reads progress, student reads own"
on public.student_topic_progress
for select
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
);

drop policy if exists "Anyone can update progress" on public.student_topic_progress;
create policy "Class teacher or own student updates progress"
on public.student_topic_progress
for update
using (
  class_id IN (
    select id from public.classes where teacher_id = auth.uid()
  )
  OR student_id = auth.uid()
  -- Guests writing their own progress (no student_id, no auth)
  OR (student_id IS NULL AND auth.uid() IS NULL)
);

-- ═══════════════════════════════════════════════════════════════════════
-- NOT TOUCHED (intentional)
-- ═══════════════════════════════════════════════════════════════════════
--
-- - profiles:         SELECT stays public (UI needs teacher names)
-- - classes:          SELECT stays public (join-by-code flow needs it)
-- - sessions:         SELECT stays public (join-by-pin flow needs it)
-- - decks:            already correctly scoped (is_public OR author_id)
-- - achievements:     already correctly scoped (auth.uid() = student_id)
--
-- Defense in depth: even though `sessions` SELECT is public, the
-- application-layer queries that show sensitive data (Review.jsx,
-- SessionRecap.jsx, MyClasses.jsx) now explicitly filter by
-- teacher_id / student_id. See pr33 changes to Review.jsx.
--
-- ═══════════════════════════════════════════════════════════════════════
-- END
-- ═══════════════════════════════════════════════════════════════════════
