-- ═══════════════════════════════════════════════════════════════════════
-- PR 72: HARDENING — Replace permissive INSERTs with security-definer RPCs
--                    (follow-up to PR 34, completes the writes lockdown)
-- ═══════════════════════════════════════════════════════════════════════
--
-- PR 34 closed INSERT on the HOT-PATH tables (session_participants,
-- responses). It explicitly deferred two more:
--
--   "NOT TOUCHED (deferred to a follow-up PR)
--    - class_members INSERT           (join_class_by_code RPC pending)
--    - student_topic_progress INSERT  (upsert_progress RPC pending)"
--
-- This PR is that follow-up. After applying THIS file AND the matching
-- code changes in src/ AND pr72_revoke_direct_inserts.sql, the only way
-- to write to those two tables is through the validated RPCs below.
--
-- ═══════════════════════════════════════════════════════════════════════
-- DEPLOY STRATEGY (TWO STEPS — IMPORTANT)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Step 1 (this file): Create the RPCs. Direct inserts STILL ALLOWED.
--                     The code starts using RPCs. App keeps working
--                     either way (RPC is just a new path).
--
-- Step 2 (pr72_revoke_direct_inserts.sql): Once the new code is deployed
--                     and verified, REVOKE direct INSERTs. The RPCs
--                     become the only write path.
--
-- This is REVERSIBLE: if anything breaks after step 1, just don't
-- migrate the code yet. If anything breaks after step 2, drop the
-- REVOKE policies. RPCs themselves are harmless.
--
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- RPC 1: join_class_by_code
-- ═══════════════════════════════════════════════════════════════════════
-- Validates that the class_code corresponds to a real class, then inserts
-- the class_members row.
--
-- The legitimate gate is the class_code (a short string like "MATH-9A").
-- An attacker who knows a class_id (UUID) but NOT the code cannot join.
--
-- Idempotent: if the student is already a member, returns the existing
-- row instead of erroring. Matches the current useClass.joinClass()
-- semantics — which detects "already joined" by the unique-violation
-- (code 23505) on (class_id, student_id).
--
-- Args:
--   p_class_code   — the class code as typed by the student
--   p_student_name — display name
--   p_student_id   — auth.uid() (caller's profile id) — REQUIRED
--                    (we don't support guest class membership; that's
--                    intentional — class membership is durable, guests
--                    only join sessions transiently)
--
-- Returns: { class: <class row jsonb>, member: <class_members row jsonb> }
-- Raises:
--   not_authenticated — p_student_id is null (no auth context)
--   class_not_found   — class_code doesn't match any class
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.join_class_by_code(
  p_class_code   text,
  p_student_name text,
  p_student_id   uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class       public.classes%rowtype;
  v_member      public.class_members%rowtype;
  v_existing_id uuid;
begin
  -- Input validation
  if p_class_code is null or length(trim(p_class_code)) = 0 then
    raise exception 'invalid_class_code';
  end if;

  if p_student_name is null or length(trim(p_student_name)) = 0 then
    raise exception 'invalid_name';
  end if;

  -- Class membership requires an authenticated user. Defense in depth:
  -- even though the RPC is callable by anon, we require a real profile
  -- id (the caller must have set it from their auth context).
  if p_student_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Optional: verify p_student_id matches auth.uid() if available.
  -- This is belt-and-suspenders — the client could pass any UUID, but
  -- if they're authenticated, we cross-check. If unauthenticated
  -- (anon), we still require p_student_id (above) — they must have
  -- some profile id to join a class.
  if auth.uid() is not null and auth.uid() <> p_student_id then
    raise exception 'identity_mismatch';
  end if;

  -- Lookup the class by code. Case-insensitive comparison via UPPER
  -- because class codes are stored uppercase (see useClass.createClass
  -- which uppercases the prefix and joinClass which uppercases input).
  select * into v_class
  from public.classes
  where upper(class_code) = upper(trim(p_class_code))
  limit 1;

  if not found then
    raise exception 'class_not_found';
  end if;

  -- Idempotent: if the student is already in the class, return that row.
  select id into v_existing_id
  from public.class_members
  where class_id = v_class.id
    and student_id = p_student_id
  limit 1;

  if v_existing_id is not null then
    select * into v_member
    from public.class_members
    where id = v_existing_id;
    return jsonb_build_object(
      'class',  to_jsonb(v_class),
      'member', to_jsonb(v_member)
    );
  end if;

  -- Fresh insert. SECURITY DEFINER bypasses the with-check policy that
  -- (after step 2) blocks direct inserts.
  insert into public.class_members (class_id, student_name, student_id)
  values (v_class.id, trim(p_student_name), p_student_id)
  returning * into v_member;

  return jsonb_build_object(
    'class',  to_jsonb(v_class),
    'member', to_jsonb(v_member)
  );
end;
$$;

grant execute on function public.join_class_by_code(text, text, uuid) to anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════
-- RPC 2: upsert_student_progress
-- ═══════════════════════════════════════════════════════════════════════
-- Inserts or updates a row in student_topic_progress.
--
-- IMPORTANT: in this app, the WRITER of student_topic_progress is the
-- TEACHER, not the student. The trigger is processSessionResults() in
-- spaced-repetition.js, which runs when the teacher closes the session.
--
-- So the gate here is: the caller must be the teacher of the class.
-- We validate this server-side and reject otherwise.
--
-- This RPC implements the SAME logic that updateStudentRetention() does
-- in JS (find existing row by class_id + student_name + topic; if found
-- update; else insert). Moving the logic into the database guarantees
-- it always runs with validation.
--
-- Args:
--   p_class_id        — class
--   p_student_name    — display name (kept for legacy rows without student_id)
--   p_student_id      — student profile id (nullable for guest rows)
--   p_topic           — topic / deck title
--   p_total_questions — N
--   p_correct_answers — n
--   p_retention_score — pre-computed by JS (calculateRetention)
--
-- Returns: the upserted row.
-- Raises:
--   not_authenticated  — auth.uid() is null
--   not_class_teacher  — caller is not the teacher of p_class_id
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.upsert_student_progress(
  p_class_id        uuid,
  p_student_name    text,
  p_student_id      uuid,
  p_topic           text,
  p_total_questions integer,
  p_correct_answers integer,
  p_retention_score integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id   uuid;
  v_existing     public.student_topic_progress%rowtype;
  v_result       public.student_topic_progress%rowtype;
  v_new_total    integer;
  v_new_correct  integer;
  v_now          timestamptz := now();
begin
  -- Input validation
  if p_class_id is null then raise exception 'invalid_class_id'; end if;
  if p_topic is null or length(trim(p_topic)) = 0 then raise exception 'invalid_topic'; end if;
  if p_total_questions is null or p_total_questions < 0 then raise exception 'invalid_total'; end if;
  if p_correct_answers is null or p_correct_answers < 0 then raise exception 'invalid_correct'; end if;

  -- The caller must be authenticated AND be the teacher of this class.
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select teacher_id into v_teacher_id
  from public.classes
  where id = p_class_id;

  if v_teacher_id is null then
    raise exception 'class_not_found';
  end if;

  if v_teacher_id <> auth.uid() then
    raise exception 'not_class_teacher';
  end if;

  -- Find existing row (same lookup as updateStudentRetention in JS)
  select * into v_existing
  from public.student_topic_progress
  where class_id = p_class_id
    and student_name = p_student_name
    and topic = p_topic
  limit 1;

  if found then
    -- Accumulate: same semantics as the JS function (newTotal = old + delta)
    v_new_total   := coalesce(v_existing.total_questions, 0) + p_total_questions;
    v_new_correct := coalesce(v_existing.correct_answers, 0) + p_correct_answers;

    update public.student_topic_progress
    set retention_score   = p_retention_score,
        total_questions   = v_new_total,
        correct_answers   = v_new_correct,
        last_reviewed_at  = v_now
    where id = v_existing.id
    returning * into v_result;
  else
    -- Fresh insert. SECURITY DEFINER bypasses the (post-step-2) blocked policy.
    insert into public.student_topic_progress (
      class_id, student_name, student_id, topic,
      retention_score, total_questions, correct_answers, last_reviewed_at
    )
    values (
      p_class_id, p_student_name, p_student_id, p_topic,
      p_retention_score, p_total_questions, p_correct_answers, v_now
    )
    returning * into v_result;
  end if;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.upsert_student_progress(uuid, text, uuid, text, integer, integer, integer) to authenticated;
-- NOT granted to anon: only teachers (authenticated) can write progress.


-- ═══════════════════════════════════════════════════════════════════════
-- END OF STEP 1
-- ═══════════════════════════════════════════════════════════════════════
-- Direct inserts to class_members and student_topic_progress are STILL
-- ALLOWED at this point. The code in src/ is updated to use the RPCs.
-- After deploying and verifying the new code works, apply
-- pr72_revoke_direct_inserts.sql to lock down the direct inserts.
-- ═══════════════════════════════════════════════════════════════════════
