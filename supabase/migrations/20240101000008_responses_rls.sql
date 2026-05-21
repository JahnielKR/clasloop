-- ============================================
-- PHASE 4 TURN 2 — Tighten RLS on responses + add UPDATE policy for grading
--
-- Context: turn 1 added teacher_grade / teacher_feedback to responses.
-- Those columns will hold private text written by a teacher TO a specific
-- student. The current SELECT policy is `using (true)` — anyone can read
-- any response. That's a pre-existing latent issue; with feedback text
-- about to land, we tighten it before the new column gets data.
--
-- Visibility rules:
--   - The teacher who owns the session can see all responses to it
--     (used by /review queue + per-deck analytics next turn)
--   - The participant who submitted a response can see THEIR OWN responses
--     (used by StudentJoin's "see correct answers" screen)
--   - Guests can see THEIR OWN responses via guest_token match
--   - Nobody else
--
-- Update: only the session's teacher can write teacher_grade / feedback.
-- INSERT stays public (students need to submit anonymously / as guests).
-- ============================================

-- ── 1. Drop the old "anyone can read" policy ────────────────────────────
drop policy if exists "Anyone can read responses" on public.responses;

-- ── 2. New SELECT policy: teacher of the session OR own participant ─────
-- We split into two policies so the JOINs are simpler and the planner
-- can use indexes on each path.
create policy "Teachers can read their session responses"
  on public.responses for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = responses.session_id
        and s.teacher_id = auth.uid()
    )
  );

-- A logged-in student sees only their own responses (matched by
-- student_id on the participant row).
create policy "Students can read their own responses"
  on public.responses for select
  using (
    exists (
      select 1 from public.session_participants p
      where p.id = responses.participant_id
        and p.student_id = auth.uid()
        and p.student_id is not null
    )
  );

-- A guest sees only their own responses, matched by guest_token. The
-- token lives on session_participants AND on responses (we copy it at
-- INSERT time in StudentJoin) so a guest's anon client can prove
-- ownership without a JWT.
create policy "Guests can read their own responses"
  on public.responses for select
  using (
    responses.guest_token is not null
    and exists (
      select 1 from public.session_participants p
      where p.id = responses.participant_id
        and p.guest_token = responses.guest_token
    )
  );

-- ── 3. New UPDATE policy: only the session's teacher ────────────────────
-- Used by /review when the teacher grades a free-text response.
create policy "Teachers can grade their session responses"
  on public.responses for update
  using (
    exists (
      select 1 from public.sessions s
      where s.id = responses.session_id
        and s.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = responses.session_id
        and s.teacher_id = auth.uid()
    )
  );

-- INSERT policy "Anyone can create responses" stays untouched —
-- students/guests need to submit anonymously.

-- ============================================
-- DONE
-- ============================================
