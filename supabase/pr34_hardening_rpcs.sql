-- ═══════════════════════════════════════════════════════════════════════
-- PR 34: HARDENING — replace permissive INSERTs with security-definer RPCs
-- ═══════════════════════════════════════════════════════════════════════
--
-- Follow-up to PR 33. The RLS rewrite closed the READ cross-tenant leak,
-- but INSERT on the student-write tables stayed `with check (true)`:
--
--   - session_participants  (anyone could join any session)
--   - responses             (anyone could submit answers to any session)
--   - class_members         (anyone could add anyone to any class)
--   - student_topic_progress(anyone could insert progress for any class)
--
-- Why those stayed permissive: students may be unauthenticated guests,
-- so we can't gate by auth.uid(). The gate is supposed to be the
-- session pin / class code that the student knows. But the gate was
-- only in the CLIENT — the database accepted any insert blindly.
--
-- Risk: a malicious authenticated user could POST directly to the
-- Supabase REST API and create rows with arbitrary session_id /
-- class_id values. Falsified scores, fake participants, junk progress.
-- Not a READ leak (PR 33 fixed those), but data INTEGRITY is at risk.
--
-- ═══════════════════════════════════════════════════════════════════════
-- SCOPE OF THIS PR
-- ═══════════════════════════════════════════════════════════════════════
--
-- The two HOT-PATH write endpoints during a live quiz:
--   1. session_participants  → student joins a session
--   2. responses             → student submits an answer
--
-- These run dozens of times per session. They're the ones most worth
-- locking down. class_members and student_topic_progress are slower
-- paths and a follow-up PR can tighten them.
--
-- Approach: SECURITY DEFINER RPCs that:
--   - Validate the gate (pin matches a real session in lobby/active,
--     participant matches the caller, etc.)
--   - Perform the INSERT with elevated privileges (definer = postgres,
--     bypasses RLS)
--   - Return the inserted row or a structured error
--
-- After the RPCs exist, INSERT on the underlying tables is REVOKED for
-- the anon and authenticated roles. The only way to write rows is
-- through the RPC, which means validation always happens.
--
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- RPC 1: join_session
-- ═══════════════════════════════════════════════════════════════════════
-- Validates the session pin and inserts a session_participants row.
-- Idempotent for the same (session, student_id) pair (returns existing
-- row instead of erroring).
--
-- Args:
--   p_pin           — the 6-digit session PIN the student typed
--   p_student_name  — display name
--   p_student_id    — profile id of the authenticated student (or null
--                     for guest mode)
--   p_guest_token   — generated client-side for guest mode (must be
--                     non-null if p_student_id is null and the session
--                     allows guests)
--
-- Returns: the session_participants row (as JSON).
-- Raises:  session_not_found, session_not_open, guests_not_allowed,
--          missing_identity.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.join_session(
  p_pin          text,
  p_student_name text,
  p_student_id   uuid default null,
  p_guest_token  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session    public.sessions%rowtype;
  v_participant public.session_participants%rowtype;
  v_existing_id uuid;
begin
  -- Validate inputs
  if p_pin is null or length(trim(p_pin)) = 0 then
    raise exception 'invalid_pin';
  end if;
  if p_student_name is null or length(trim(p_student_name)) = 0 then
    raise exception 'invalid_name';
  end if;
  if p_student_id is null and (p_guest_token is null or length(p_guest_token) < 8) then
    raise exception 'missing_identity';
  end if;

  -- Find the session by pin. Must be in lobby or active.
  select * into v_session
  from public.sessions
  where pin = p_pin
    and status in ('lobby', 'active')
  limit 1;

  if not found then
    raise exception 'session_not_found';
  end if;

  -- Block guests if the session doesn't allow them
  if p_student_id is null and not coalesce(v_session.allow_guests, false) then
    raise exception 'guests_not_allowed';
  end if;

  -- Rejoin check: same authenticated student or same guest_token already
  -- joined? Return that row instead of duplicating.
  if p_student_id is not null then
    select id into v_existing_id
    from public.session_participants
    where session_id = v_session.id
      and student_id = p_student_id
    limit 1;
  elsif p_guest_token is not null then
    select id into v_existing_id
    from public.session_participants
    where session_id = v_session.id
      and guest_token = p_guest_token
    limit 1;
  end if;

  if v_existing_id is not null then
    select * into v_participant
    from public.session_participants
    where id = v_existing_id;
    return to_jsonb(v_participant);
  end if;

  -- Fresh insert
  insert into public.session_participants (
    session_id,
    student_name,
    student_id,
    guest_token,
    guest_name,
    is_guest
  )
  values (
    v_session.id,
    trim(p_student_name),
    p_student_id,
    p_guest_token,
    case when p_student_id is null then trim(p_student_name) else null end,
    p_student_id is null
  )
  returning * into v_participant;

  return to_jsonb(v_participant);
end;
$$;

grant execute on function public.join_session(text, text, uuid, text) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- RPC 2: submit_response
-- ═══════════════════════════════════════════════════════════════════════
-- Validates the participant matches the caller (authenticated student
-- by profile id, or guest by token), then upserts the response.
--
-- Args:
--   p_participant_id — the session_participants row id
--   p_question_index — int, position in the deck
--   p_answer         — jsonb (could be number, bool, string, etc)
--   p_is_correct     — bool (the client computes this; for free/open
--                      it's true (participation) until teacher grades)
--   p_points         — int
--   p_max_points     — int
--   p_needs_review   — bool (true = free/open answer needing teacher grade)
--   p_time_taken_ms  — int
--   p_guest_token    — if guest, must match the participant's token
--
-- Returns: the upserted response row.
-- Raises:  participant_not_found, identity_mismatch, session_not_active.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.submit_response(
  p_participant_id uuid,
  p_question_index integer,
  p_answer         jsonb,
  p_is_correct     boolean,
  p_points         integer,
  p_max_points     integer,
  p_needs_review   boolean,
  p_time_taken_ms  integer default 0,
  p_guest_token    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.session_participants%rowtype;
  v_session     public.sessions%rowtype;
  v_response    public.responses%rowtype;
begin
  if p_participant_id is null then
    raise exception 'invalid_participant';
  end if;
  if p_question_index is null or p_question_index < 0 then
    raise exception 'invalid_question_index';
  end if;

  -- Load the participant row
  select * into v_participant
  from public.session_participants
  where id = p_participant_id;

  if not found then
    raise exception 'participant_not_found';
  end if;

  -- Verify the caller owns this participant row
  -- Auth path: profile id matches participant.student_id
  -- Guest path: guest_token matches
  if v_participant.student_id is not null then
    if auth.uid() is null or auth.uid() <> v_participant.student_id then
      raise exception 'identity_mismatch';
    end if;
  else
    if p_guest_token is null
       or v_participant.guest_token is null
       or p_guest_token <> v_participant.guest_token then
      raise exception 'identity_mismatch';
    end if;
  end if;

  -- Session must be active (lobby is OK too for warmup-up answers
  -- that arrive at the very start)
  select * into v_session
  from public.sessions
  where id = v_participant.session_id;

  if not found or v_session.status = 'completed' or v_session.status = 'cancelled' then
    raise exception 'session_not_active';
  end if;

  -- Upsert. Same unique constraint used by the previous direct
  -- upsert: (session_id, participant_id, question_index).
  insert into public.responses (
    session_id,
    participant_id,
    question_index,
    answer,
    is_correct,
    points,
    max_points,
    needs_review,
    time_taken_ms,
    guest_token
  )
  values (
    v_participant.session_id,
    p_participant_id,
    p_question_index,
    p_answer,
    coalesce(p_is_correct, true),
    coalesce(p_points, 0),
    coalesce(p_max_points, 1),
    coalesce(p_needs_review, false),
    coalesce(p_time_taken_ms, 0),
    case when v_participant.student_id is null then v_participant.guest_token else null end
  )
  on conflict (session_id, participant_id, question_index) do update
  set
    answer        = excluded.answer,
    is_correct    = excluded.is_correct,
    points        = excluded.points,
    max_points    = excluded.max_points,
    needs_review  = excluded.needs_review,
    time_taken_ms = excluded.time_taken_ms
  returning * into v_response;

  return to_jsonb(v_response);
end;
$$;

grant execute on function public.submit_response(uuid, integer, jsonb, boolean, integer, integer, boolean, integer, text) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- LOCK DOWN DIRECT INSERTS on the two tables now covered by RPCs
-- ═══════════════════════════════════════════════════════════════════════
--
-- We replace the previous "Anyone can join sessions" / "Anyone can create
-- responses" INSERT policies with policies that ALLOW NO ONE via the
-- direct REST INSERT path. Writes can only happen through the RPCs
-- above, which run as SECURITY DEFINER (= postgres role, bypasses RLS).
--
-- Note: REVOKE on the table itself would also work, but doing it via a
-- RLS policy is reversible and consistent with the rest of our security
-- model.

drop policy if exists "Anyone can join sessions" on public.session_participants;
create policy "Direct inserts blocked — use join_session RPC"
on public.session_participants
for insert
with check (false);

drop policy if exists "Anyone can create responses" on public.responses;
create policy "Direct inserts blocked — use submit_response RPC"
on public.responses
for insert
with check (false);

-- ═══════════════════════════════════════════════════════════════════════
-- NOT TOUCHED (deferred to a follow-up PR)
-- ═══════════════════════════════════════════════════════════════════════
--
-- - class_members INSERT             (join_class_by_code RPC pending)
-- - student_topic_progress INSERT    (upsert_progress RPC pending)
--
-- These run far less frequently than join_session and submit_response,
-- so the integrity risk is lower while we wait. The follow-up PR will
-- add their RPCs and lock down their inserts too.
--
-- ═══════════════════════════════════════════════════════════════════════
-- END
-- ═══════════════════════════════════════════════════════════════════════
