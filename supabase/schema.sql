-- ============================================
-- CLASLOOP DATABASE SCHEMA (canonical baseline)
-- ============================================
-- Generated: 2026-05-21
-- Source: pg_dump from production database (project mhfwyeczzilcizawixqw)
-- Includes: all tables, RLS policies, functions, triggers, RPCs as of PR 100
--
-- For setup: paste this entire file into Supabase SQL Editor on a FRESH project.
-- After this, no migrations are needed -- this IS the source of truth.
--
-- To regenerate: see supabase/schema.README.md
-- ============================================






CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



CREATE OR REPLACE FUNCTION "public"."class_decks_summary"("p_class_id" "uuid") RETURNS TABLE("deck_id" "uuid", "deck_title" "text", "deck_section" "text", "unit_id" "uuid", "total_responses" integer, "total_points" integer, "total_max_points" integer, "pct_correct" integer, "pending_review_count" integer)
    LANGUAGE "sql" STABLE
    AS $$
  select
    d.id as deck_id,
    d.title as deck_title,
    d.section as deck_section,
    d.unit_id,
    coalesce(count(r.id), 0)::int as total_responses,
    coalesce(
      sum(case when r.needs_review and r.teacher_grade is null then 0 else r.points end),
      0
    )::int as total_points,
    coalesce(
      sum(case when r.needs_review and r.teacher_grade is null then 0 else r.max_points end),
      0
    )::int as total_max_points,
    case
      when coalesce(
             sum(case when r.needs_review and r.teacher_grade is null then 0 else r.max_points end),
             0
           ) > 0
      then round(
             100.0 *
             sum(case when r.needs_review and r.teacher_grade is null then 0 else r.points end)::numeric
             /
             sum(case when r.needs_review and r.teacher_grade is null then 0 else r.max_points end)
           )::int
      else null
    end as pct_correct,
    coalesce(
      sum(case when r.needs_review and r.teacher_grade is null then 1 else 0 end),
      0
    )::int as pending_review_count
  from public.decks d
  left join public.sessions s
    on s.deck_id = d.id
   and s.class_id = p_class_id
  left join public.responses r
    on r.session_id = s.id
  where d.class_id = p_class_id
  group by d.id, d.title, d.section, d.unit_id, d.position
  -- NO HAVING — UI handles the empty-decks case via "no usage yet" copy.
  order by d.section, d.position, d.title;
$$;


ALTER FUNCTION "public"."class_decks_summary"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_scans"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  expired_scan record;
begin
  -- Loop scans expirados, borrar imagen del storage primero
  for expired_scan in
    select id, image_path
    from public.scans
    where expires_at < now()
  loop
    if expired_scan.image_path is not null then
      -- Borrar del storage. Si falla (e.g. ya borrado), seguir igual.
      begin
        delete from storage.objects
        where bucket_id = 'scan-images'
          and name = expired_scan.image_path;
      exception when others then
        -- log y continuar
        raise notice 'Failed to delete storage object %: %',
          expired_scan.image_path, sqlerrm;
      end;
    end if;
  end loop;

  -- Borrar las rows
  delete from public.scans where expires_at < now();
end;
$$;


ALTER FUNCTION "public"."cleanup_expired_scans"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_zombie_sessions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.sessions s
  set status = 'completed',
      completed_at = now(),
      pending_close_at = null
  where s.status = 'active'
    and s.pending_close_at is not null
    and s.pending_close_at < now() - interval '2 minutes'
    and not exists (
      select 1 from public.responses r
      where r.session_id = s.id
        and r.created_at > now() - interval '60 seconds'
    );
end;
$$;


ALTER FUNCTION "public"."close_zombie_sessions"() OWNER TO "postgres";




CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'teacher'::"text" NOT NULL,
    "full_name" "text",
    "avatar_id" "text",
    "frame_id" "text" DEFAULT 'none'::"text",
    "school" "text",
    "language" "text" DEFAULT 'en'::"text",
    "xp" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "streak" integer DEFAULT 0,
    "streak_last_date" "date",
    "daily_goal" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "default_deck_visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    CONSTRAINT "profiles_default_deck_visibility_check" CHECK (("default_deck_visibility" = ANY (ARRAY['private'::"text", 'public'::"text"]))),
    CONSTRAINT "profiles_language_check" CHECK (("language" = ANY (ARRAY['en'::"text", 'es'::"text", 'ko'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['teacher'::"text", 'student'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_my_profile"("p_role" "text", "p_full_name" "text", "p_avatar_url" "text" DEFAULT NULL::"text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid;
  inserted public.profiles;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_role not in ('teacher','student') then
    raise exception 'invalid role: %', p_role;
  end if;

  insert into public.profiles (id, role, full_name, avatar_url, is_admin)
  values (uid, p_role, p_full_name, p_avatar_url, false)
  on conflict (id) do nothing
  returning * into inserted;

  if inserted is null then
    -- Ya existía un profile (idempotency). Devolver el existente.
    select * into inserted from public.profiles where id = uid;
  end if;

  return inserted;
end;
$$;


ALTER FUNCTION "public"."create_my_profile"("p_role" "text", "p_full_name" "text", "p_avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;


ALTER FUNCTION "public"."current_user_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deck_question_stats"("p_deck_id" "uuid", "p_class_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("question_index" integer, "total_responses" integer, "correct_count" integer, "partial_count" integer, "incorrect_count" integer, "pending_review_count" integer, "avg_time_ms" integer, "answer_distribution" "jsonb")
    LANGUAGE "sql" STABLE
    AS $$
  with filtered as (
    select
      r.question_index,
      r.is_correct,
      r.points,
      r.max_points,
      r.needs_review,
      r.teacher_grade,
      r.time_taken_ms,
      r.answer
    from public.responses r
    join public.sessions s on s.id = r.session_id
    where s.deck_id = p_deck_id
      and (p_class_id is null or s.class_id = p_class_id)
  ),
  base as (
    select
      question_index,
      count(*)::int as total_responses,
      -- "correct": fully credited responses. For graded types
      -- points = max_points means correct. For free-text after teacher
      -- review, teacher_grade='correct' (which writes points=2/max=2).
      -- Pre-review free-text doesn't count as correct yet (it's pending).
      sum(case
            when needs_review and teacher_grade is null then 0
            when points = max_points and points > 0 then 1
            else 0
          end)::int as correct_count,
      -- "partial": got some credit but not full. Match/Order with
      -- partial pairs/slots; teacher_grade='partial' for free-text.
      sum(case
            when needs_review and teacher_grade is null then 0
            when points > 0 and points < max_points then 1
            else 0
          end)::int as partial_count,
      -- "incorrect": zero points and not pending.
      sum(case
            when needs_review and teacher_grade is null then 0
            when points = 0 then 1
            else 0
          end)::int as incorrect_count,
      -- Pending review: free-text awaiting the teacher.
      sum(case when needs_review and teacher_grade is null then 1 else 0 end)::int
        as pending_review_count,
      -- avg(time_taken_ms) excluding 0 (which is "no timer was active").
      coalesce(
        avg(nullif(time_taken_ms, 0))::int,
        0
      ) as avg_time_ms
    from filtered
    group by question_index
  ),
  dist as (
    -- Distribution: count by answer key. We turn `answer` (jsonb) into
    -- text keys so simple types (numbers, booleans, strings) collapse
    -- into recognizable keys. Complex types (arrays, objects) get
    -- serialized — less useful but still consistent.
    select
      question_index,
      jsonb_object_agg(answer_key, cnt) as answer_distribution
    from (
      select
        question_index,
        case
          when answer is null then 'null'
          when jsonb_typeof(answer) = 'string' then trim('"' from answer::text)
          else answer::text
        end as answer_key,
        count(*) as cnt
      from filtered
      group by question_index, answer_key
    ) sub
    group by question_index
  )
  select
    b.question_index,
    b.total_responses,
    b.correct_count,
    b.partial_count,
    b.incorrect_count,
    b.pending_review_count,
    b.avg_time_ms,
    coalesce(d.answer_distribution, '{}'::jsonb) as answer_distribution
  from base b
  left join dist d using (question_index)
  order by b.question_index;
$$;


ALTER FUNCTION "public"."deck_question_stats"("p_deck_id" "uuid", "p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_my_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  uid uuid;
begin
  -- 1. Identify the caller. auth.uid() returns the authenticated
  --    user's id; null if the request isn't authenticated.
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 2. Wipe student-side data that doesn't cascade automatically.
  --    class_members.student_id is `on delete set null` (so the
  --    teacher's roster preserves history when a student leaves),
  --    but for account deletion we want the rows GONE.
  delete from public.class_members where student_id = uid;

  -- Achievements are referenced via student_id with cascade, but be
  -- explicit so we don't depend on FK definitions surviving future
  -- migrations.
  delete from public.achievements where student_id = uid;

  -- session_participants: student_id is set null on cascade. Force-delete
  -- to drop the participant row entirely.
  -- IMPORTANT: this cascade-deletes `responses` via the FK
  --   responses.participant_id references session_participants(id) on delete cascade
  -- so we DO NOT need a separate `delete from responses` (which is what
  -- the original buggy version tried and failed at).
  delete from public.session_participants where student_id = uid;

  -- student_topic_progress same pattern (set null on profile delete)
  delete from public.student_topic_progress where student_id = uid;

  -- 3. Delete the profile row. Every teacher-owned table (classes,
  --    units, decks, sessions, etc.) references profiles(id) ON DELETE
  --    CASCADE, so deleting the profile wipes the teacher's entire
  --    owned tree in one shot.
  delete from public.profiles where id = uid;

  -- 4. Delete the auth.users row. Without this, the email stays
  --    taken and the user could "log back in" (but with no profile,
  --    they'd be a ghost).
  delete from auth.users where id = uid;
end;
$$;


ALTER FUNCTION "public"."delete_my_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."email_already_registered"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_my_email text;
  v_other_count integer;
begin
  -- Get the current authenticated user's email
  select email into v_my_email
  from auth.users
  where id = auth.uid();

  if v_my_email is null then
    -- Not authenticated; nothing to check
    return false;
  end if;

  -- Count OTHER auth.users with the same email (case-insensitive)
  -- We deliberately exclude the current user from the count — they're
  -- the legit row that should stay.
  select count(*) into v_other_count
  from auth.users
  where lower(email) = lower(v_my_email)
    and id <> auth.uid();

  return v_other_count > 0;
end;
$$;


ALTER FUNCTION "public"."email_already_registered"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."force_close_my_pending_sessions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.sessions s
  set status = 'completed',
      completed_at = now(),
      pending_close_at = null
  where s.status = 'active'
    and s.teacher_id = uid
    and s.pending_close_at is not null;
end;
$$;


ALTER FUNCTION "public"."force_close_my_pending_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_class_code"("p_subject" "text", "p_grade" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  code text;
  exists_count integer;
  letters text;
begin
  loop
    -- PR 157 (L21): 3 random letters → 26^3 = 17,576 codes per (subject, grade).
    letters :=
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int);
    code := upper(left(p_subject, 4)) || '-' ||
            regexp_replace(p_grade, '[^0-9]', '', 'g') || '-' ||
            letters;
    select count(*) into exists_count from public.classes where class_code = code;
    exit when exists_count = 0;
  end loop;
  return code;
end;
$$;


ALTER FUNCTION "public"."generate_class_code"("p_subject" "text", "p_grade" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_session_pin"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  pin text;
  exists_count integer;
begin
  loop
    pin := lpad(floor(random() * 1000000)::text, 6, '0');
    select count(*) into exists_count from public.sessions where sessions.pin = pin and status != 'completed';
    exit when exists_count = 0;
  end loop;
  return pin;
end;
$$;


ALTER FUNCTION "public"."generate_session_pin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guest_responses"("p_session_id" "uuid", "p_guest_token" "uuid") RETURNS TABLE("id" "uuid", "question_index" integer, "answer" "jsonb", "is_correct" boolean, "time_taken_ms" integer, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Validar que el token matchea un participant real de esta session.
  if not exists (
    select 1 from public.session_participants
    where session_id = p_session_id
      and guest_token = p_guest_token
  ) then
    raise exception 'invalid guest token for session';
  end if;

  return query
  select r.id, r.question_index, r.answer, r.is_correct,
         r.time_taken_ms, r.created_at
  from public.responses r
  join public.session_participants p on p.id = r.participant_id
  where r.session_id = p_session_id
    and p.guest_token = p_guest_token;
end;
$$;


ALTER FUNCTION "public"."get_guest_responses"("p_session_id" "uuid", "p_guest_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_class_by_code"("p_class_code" "text", "p_student_name" "text", "p_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."join_class_by_code"("p_class_code" "text", "p_student_name" "text", "p_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_session"("p_pin" "text", "p_student_name" "text", "p_student_id" "uuid" DEFAULT NULL::"uuid", "p_guest_token" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_session_id uuid;
  v_session_status text;
  v_session_allow_guests boolean;
  v_participant public.session_participants%rowtype;
  v_existing_id uuid;
  v_has_guest_cols boolean;
  v_has_allow_guests boolean;
  v_guest_token_uuid uuid := null;
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

  -- Detect optional columns once (some installs added these via PRs not
  -- tracked in schema.sql). We avoid hard references that would error
  -- on rows where the column doesn't exist.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'allow_guests'
  ) into v_has_allow_guests;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'session_participants'
      and column_name = 'guest_name'
  ) into v_has_guest_cols;

  -- Lookup session by pin. Project only id + status + (optionally)
  -- allow_guests, via dynamic SQL so missing columns don't blow up.
  if v_has_allow_guests then
    execute 'select id, status, coalesce(allow_guests, false) from public.sessions where pin = $1 and status in (''lobby'', ''active'') limit 1'
      into v_session_id, v_session_status, v_session_allow_guests
      using p_pin;
  else
    execute 'select id, status, true from public.sessions where pin = $1 and status in (''lobby'', ''active'') limit 1'
      into v_session_id, v_session_status, v_session_allow_guests
      using p_pin;
  end if;

  if v_session_id is null then
    raise exception 'session_not_found';
  end if;

  -- Block guests if the session doesn't allow them
  if p_student_id is null and not v_session_allow_guests then
    raise exception 'guests_not_allowed';
  end if;

  -- PR 34.3/34.4: en este install guest_token es uuid (no text). Convertimos
  -- p_guest_token (text) → uuid una sola vez al principio. Si el cliente
  -- pasó un string no-uuid, falla rápido con error útil en vez del
  -- '42804 column is of type uuid but expression is of type text'.
  if p_guest_token is not null and length(p_guest_token) > 0 then
    begin
      v_guest_token_uuid := p_guest_token::uuid;
    exception when others then
      raise exception 'invalid_guest_token';
    end;
  end if;

  -- Rejoin check
  if p_student_id is not null then
    select id into v_existing_id
    from public.session_participants
    where session_id = v_session_id
      and student_id = p_student_id
    limit 1;
  elsif v_guest_token_uuid is not null then
    select id into v_existing_id
    from public.session_participants
    where session_id = v_session_id
      and guest_token = v_guest_token_uuid
    limit 1;
  end if;

  if v_existing_id is not null then
    select * into v_participant
    from public.session_participants
    where id = v_existing_id;
    return to_jsonb(v_participant);
  end if;

  -- Fresh insert. Dynamic SQL so we only reference columns we know exist.
  if v_has_guest_cols then
    execute 'insert into public.session_participants (session_id, student_name, student_id, guest_token, guest_name, is_guest) values ($1, $2, $3, $4, $5, $6) returning *'
      into v_participant
      using v_session_id, trim(p_student_name), p_student_id, v_guest_token_uuid,
            case when p_student_id is null then trim(p_student_name) else null end,
            p_student_id is null;
  else
    -- Minimal insert path (older installs without guest_name/is_guest cols)
    execute 'insert into public.session_participants (session_id, student_name, student_id, guest_token) values ($1, $2, $3, $4) returning *'
      into v_participant
      using v_session_id, trim(p_student_name), p_student_id, v_guest_token_uuid;
  end if;

  return to_jsonb(v_participant);
end;
$_$;


ALTER FUNCTION "public"."join_session"("p_pin" "text", "p_student_name" "text", "p_student_id" "uuid", "p_guest_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_block_sensitive_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (select coalesce(current_setting('request.jwt.claim.role', true), '')) = 'authenticated' then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'cannot modify is_admin from client';
    end if;
    if new.role is distinct from old.role then
      raise exception 'cannot modify role from client';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."profiles_block_sensitive_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_enforce_safe_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.is_admin := false;
  if new.role is null or new.role not in ('teacher','student') then
    new.role := 'teacher';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."profiles_enforce_safe_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_response"("p_participant_id" "uuid", "p_question_index" integer, "p_answer" "jsonb", "p_is_correct" boolean, "p_points" integer, "p_max_points" integer, "p_needs_review" boolean, "p_time_taken_ms" integer DEFAULT 0, "p_guest_token" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_participant public.session_participants%rowtype;
  v_session_status text;
  v_response jsonb;
  v_has_responses_guest_token boolean;
  v_guest_token_uuid uuid := null;
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

  -- PR 34.3/34.4: Cast guest_token to uuid (it's uuid in this install).
  if p_guest_token is not null and length(p_guest_token) > 0 then
    begin
      v_guest_token_uuid := p_guest_token::uuid;
    exception when others then
      raise exception 'invalid_guest_token';
    end;
  end if;

  -- Verify the caller owns this participant row
  if v_participant.student_id is not null then
    if auth.uid() is null or auth.uid() <> v_participant.student_id then
      raise exception 'identity_mismatch';
    end if;
  else
    if v_guest_token_uuid is null
       or v_participant.guest_token is null
       or v_guest_token_uuid <> v_participant.guest_token then
      raise exception 'identity_mismatch';
    end if;
  end if;

  -- Session must not be completed/cancelled
  select status into v_session_status
  from public.sessions
  where id = v_participant.session_id;

  if v_session_status is null
     or v_session_status = 'completed'
     or v_session_status = 'cancelled' then
    raise exception 'session_not_active';
  end if;

  -- Detect optional guest_token column on responses
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'responses'
      and column_name = 'guest_token'
  ) into v_has_responses_guest_token;

  -- Upsert via dynamic SQL so we don't reference guest_token if it
  -- doesn't exist in this install.
  if v_has_responses_guest_token then
    execute $sql$
      insert into public.responses (
        session_id, participant_id, question_index, answer, is_correct,
        points, max_points, needs_review, time_taken_ms, guest_token
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      on conflict (session_id, participant_id, question_index) do update
      set answer        = excluded.answer,
          is_correct    = excluded.is_correct,
          points        = excluded.points,
          max_points    = excluded.max_points,
          needs_review  = excluded.needs_review,
          time_taken_ms = excluded.time_taken_ms
      returning to_jsonb(responses.*)
    $sql$
    into v_response
    using v_participant.session_id, p_participant_id, p_question_index, p_answer,
          coalesce(p_is_correct, true), coalesce(p_points, 0),
          coalesce(p_max_points, 1), coalesce(p_needs_review, false),
          coalesce(p_time_taken_ms, 0),
          case when v_participant.student_id is null then v_participant.guest_token else null end;
  else
    execute $sql$
      insert into public.responses (
        session_id, participant_id, question_index, answer, is_correct,
        points, max_points, needs_review, time_taken_ms
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      on conflict (session_id, participant_id, question_index) do update
      set answer        = excluded.answer,
          is_correct    = excluded.is_correct,
          points        = excluded.points,
          max_points    = excluded.max_points,
          needs_review  = excluded.needs_review,
          time_taken_ms = excluded.time_taken_ms
      returning to_jsonb(responses.*)
    $sql$
    into v_response
    using v_participant.session_id, p_participant_id, p_question_index, p_answer,
          coalesce(p_is_correct, true), coalesce(p_points, 0),
          coalesce(p_max_points, 1), coalesce(p_needs_review, false),
          coalesce(p_time_taken_ms, 0);
  end if;

  return v_response;
end;
$_$;


ALTER FUNCTION "public"."submit_response"("p_participant_id" "uuid", "p_question_index" integer, "p_answer" "jsonb", "p_is_correct" boolean, "p_points" integer, "p_max_points" integer, "p_needs_review" boolean, "p_time_taken_ms" integer, "p_guest_token" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "student_name" "text" NOT NULL,
    "student_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "guest_name" "text",
    "guest_token" "uuid",
    "is_guest" boolean DEFAULT false NOT NULL,
    "is_kicked" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."session_participants" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_guest_name"("p_session_id" "uuid", "p_guest_token" "uuid", "p_new_name" "text") RETURNS "public"."session_participants"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  updated public.session_participants;
  trimmed_name text;
begin
  -- Validar nombre (no vacío, longitud sensata)
  trimmed_name := nullif(trim(coalesce(p_new_name, '')), '');
  if trimmed_name is null then
    raise exception 'name required';
  end if;
  if length(trimmed_name) > 60 then
    raise exception 'name too long';
  end if;

  -- Validar y actualizar
  update public.session_participants
  set student_name = trimmed_name
  where session_id = p_session_id
    and guest_token = p_guest_token
    and student_id is null  -- defensive: solo guests, no usuarios logueados
  returning * into updated;

  if updated is null then
    raise exception 'invalid guest token for session';
  end if;

  return updated;
end;
$$;


ALTER FUNCTION "public"."update_my_guest_name"("p_session_id" "uuid", "p_guest_token" "uuid", "p_new_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_profile"("p_updates" "jsonb") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid;
  updated public.profiles;
  v_lang text;
  v_visibility text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'p_updates must be an object';
  end if;

  -- Validaciones de valores enumerados (mejor mensaje que CHECK violation)
  if p_updates ? 'language' then
    v_lang := p_updates->>'language';
    if v_lang is not null and v_lang not in ('en','es','ko') then
      raise exception 'invalid language: %', v_lang;
    end if;
  end if;
  if p_updates ? 'default_deck_visibility' then
    v_visibility := p_updates->>'default_deck_visibility';
    if v_visibility is not null and v_visibility not in ('private','public') then
      raise exception 'invalid default_deck_visibility: %', v_visibility;
    end if;
  end if;

  -- UPDATE con CASE per-columna. Pattern:
  --   col = case when p_updates ? 'col' then (p_updates->>'col') else col end
  -- Key presente con null → clear. Key ausente → no tocar.
  update public.profiles
  set
    full_name = case when p_updates ? 'full_name'
                     then p_updates->>'full_name'
                     else full_name end,
    avatar_id = case when p_updates ? 'avatar_id'
                     then p_updates->>'avatar_id'
                     else avatar_id end,
    frame_id  = case when p_updates ? 'frame_id'
                     then p_updates->>'frame_id'
                     else frame_id end,
    school    = case when p_updates ? 'school'
                     then p_updates->>'school'
                     else school end,
    language  = case when p_updates ? 'language'
                     then p_updates->>'language'
                     else language end,
    daily_goal = case when p_updates ? 'daily_goal'
                     then (p_updates->>'daily_goal')::int
                     else daily_goal end,
    avatar_url = case when p_updates ? 'avatar_url'
                     then p_updates->>'avatar_url'
                     else avatar_url end,
    default_deck_visibility = case when p_updates ? 'default_deck_visibility'
                     then p_updates->>'default_deck_visibility'
                     else default_deck_visibility end
  where id = uid
  returning * into updated;

  if not found then
    raise exception 'profile not found for user %', uid;
  end if;

  return updated;
end;
$$;


ALTER FUNCTION "public"."update_my_profile"("p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_student_progress"("p_class_id" "uuid", "p_student_name" "text", "p_student_id" "uuid", "p_topic" "text", "p_total_questions" integer, "p_correct_answers" integer, "p_retention_score" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."upsert_student_progress"("p_class_id" "uuid", "p_student_name" "text", "p_student_id" "uuid", "p_topic" "text", "p_total_questions" integer, "p_correct_answers" integer, "p_retention_score" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."allow_only_operation"("expected_operation" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION "storage"."allow_only_operation"("expected_operation" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."custom_oauth_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_type" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text" NOT NULL,
    "acceptable_client_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "pkce_enabled" boolean DEFAULT true NOT NULL,
    "attribute_mapping" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "authorization_params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "email_optional" boolean DEFAULT false NOT NULL,
    "issuer" "text",
    "discovery_url" "text",
    "skip_nonce_check" boolean DEFAULT false NOT NULL,
    "cached_discovery" "jsonb",
    "discovery_cached_at" timestamp with time zone,
    "authorization_url" "text",
    "token_url" "text",
    "userinfo_url" "text",
    "jwks_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK ((("authorization_url" IS NULL) OR ("authorization_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK ((("authorization_url" IS NULL) OR ("char_length"("authorization_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_client_id_length" CHECK ((("char_length"("client_id") >= 1) AND ("char_length"("client_id") <= 512))),
    CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK ((("discovery_url" IS NULL) OR ("char_length"("discovery_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (("identifier" ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::"text")),
    CONSTRAINT "custom_oauth_providers_issuer_length" CHECK ((("issuer" IS NULL) OR (("char_length"("issuer") >= 1) AND ("char_length"("issuer") <= 2048)))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK ((("jwks_uri" IS NULL) OR ("jwks_uri" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK ((("jwks_uri" IS NULL) OR ("char_length"("jwks_uri") <= 2048))),
    CONSTRAINT "custom_oauth_providers_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK ((("provider_type" <> 'oauth2'::"text") OR (("authorization_url" IS NOT NULL) AND ("token_url" IS NOT NULL) AND ("userinfo_url" IS NOT NULL)))),
    CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("discovery_url" IS NULL) OR ("discovery_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NULL) OR ("issuer" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NOT NULL))),
    CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['oauth2'::"text", 'oidc'::"text"]))),
    CONSTRAINT "custom_oauth_providers_token_url_https" CHECK ((("token_url" IS NULL) OR ("token_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_token_url_length" CHECK ((("token_url" IS NULL) OR ("char_length"("token_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK ((("userinfo_url" IS NULL) OR ("userinfo_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK ((("userinfo_url" IS NULL) OR ("char_length"("userinfo_url") <= 2048)))
);


ALTER TABLE "auth"."custom_oauth_providers" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "code_challenge" "text",
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone,
    "invite_token" "text",
    "referrer" "text",
    "oauth_client_state_id" "uuid",
    "linking_target_id" "uuid",
    "email_optional" boolean DEFAULT false NOT NULL
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'Stores metadata for all OAuth/SSO login flows';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';



CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


ALTER TABLE "auth"."oauth_client_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';



CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    "token_endpoint_auth_method" "text" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048)),
    CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (("token_endpoint_auth_method" = ANY (ARRAY['client_secret_basic'::"text", 'client_secret_post'::"text", 'none'::"text"])))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



CREATE TABLE IF NOT EXISTS "auth"."webauthn_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "challenge_type" "text" NOT NULL,
    "session_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK (("challenge_type" = ANY (ARRAY['signup'::"text", 'registration'::"text", 'authentication'::"text"])))
);


ALTER TABLE "auth"."webauthn_challenges" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."webauthn_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credential_id" "bytea" NOT NULL,
    "public_key" "bytea" NOT NULL,
    "attestation_type" "text" DEFAULT ''::"text" NOT NULL,
    "aaguid" "uuid",
    "sign_count" bigint DEFAULT 0 NOT NULL,
    "transports" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "backup_eligible" boolean DEFAULT false NOT NULL,
    "backed_up" boolean DEFAULT false NOT NULL,
    "friendly_name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone
);


ALTER TABLE "auth"."webauthn_credentials" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_generations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activity_type" "text" NOT NULL,
    "num_questions" integer NOT NULL,
    "model_used" "text" NOT NULL,
    "input_type" "text",
    "input_size_chars" integer,
    "output_raw" "jsonb",
    "output_final" "jsonb",
    "accepted_count" integer,
    "edited_count" integer,
    "regenerated_count" integer,
    "time_to_publish_ms" integer,
    "output_filtered" "jsonb",
    "validation_dropped_count" integer DEFAULT 0
);


ALTER TABLE "public"."ai_generations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_name" "text" NOT NULL,
    "student_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."class_members" REPLICA IDENTITY FULL;


ALTER TABLE "public"."class_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "grade" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "class_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "color_id" "text" DEFAULT 'auto'::"text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "lobby_theme" "text" DEFAULT 'calm'::"text" NOT NULL,
    CONSTRAINT "classes_color_id_check" CHECK (("color_id" = ANY (ARRAY['auto'::"text", 'blue'::"text", 'purple'::"text", 'green'::"text", 'orange'::"text", 'pink'::"text", 'yellow'::"text", 'red'::"text", 'gray'::"text"]))),
    CONSTRAINT "classes_lobby_theme_valid" CHECK (("lobby_theme" = ANY (ARRAY['calm'::"text", 'ocean'::"text", 'pop'::"text", 'mono'::"text"])))
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."decks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject" "text" NOT NULL,
    "grade" "text" NOT NULL,
    "language" "text" DEFAULT 'en'::"text" NOT NULL,
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_public" boolean DEFAULT false,
    "uses_count" integer DEFAULT 0,
    "rating" real DEFAULT 0,
    "review_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "class_id" "uuid" NOT NULL,
    "cover_color" "text",
    "cover_icon" "text",
    "cover_image_url" "text",
    "copied_from_id" "uuid",
    "is_adapted" boolean DEFAULT false NOT NULL,
    "section" "text" DEFAULT 'general_review'::"text" NOT NULL,
    "unit_id" "uuid",
    "position" integer DEFAULT 0 NOT NULL,
    "lobby_theme_override" "text",
    CONSTRAINT "decks_lobby_theme_override_valid" CHECK ((("lobby_theme_override" IS NULL) OR ("lobby_theme_override" = ANY (ARRAY['calm'::"text", 'ocean'::"text", 'pop'::"text", 'mono'::"text"])))),
    CONSTRAINT "decks_section_check" CHECK (("section" = ANY (ARRAY['warmup'::"text", 'exit_ticket'::"text", 'general_review'::"text"])))
);


ALTER TABLE "public"."decks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "question_index" integer NOT NULL,
    "answer" "jsonb" NOT NULL,
    "is_correct" boolean NOT NULL,
    "time_taken_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "guest_token" "uuid",
    "points" integer DEFAULT 0 NOT NULL,
    "max_points" integer DEFAULT 1 NOT NULL,
    "needs_review" boolean DEFAULT false NOT NULL,
    "teacher_grade" "text",
    "teacher_feedback" "text",
    "graded_at" timestamp with time zone,
    "graded_by" "uuid",
    CONSTRAINT "responses_teacher_grade_check" CHECK (("teacher_grade" = ANY (ARRAY['correct'::"text", 'partial'::"text", 'incorrect'::"text"])))
);


ALTER TABLE "public"."responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_decks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "deck_id" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_favorite" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."saved_decks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "deck_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "total" integer NOT NULL,
    "answers_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "image_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    CONSTRAINT "scans_check" CHECK ((("total" >= 0) AND ("total" >= "score"))),
    CONSTRAINT "scans_score_check" CHECK (("score" >= 0))
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


COMMENT ON TABLE "public"."scans" IS 'Scanner results (PR 57). Auto-expires 7 days. RLS: teacher owns row.';



COMMENT ON COLUMN "public"."scans"."answers_json" IS 'Array of {question_id, marked, correct, is_correct, confidence, is_uncertain}.';



COMMENT ON COLUMN "public"."scans"."image_path" IS 'Path in scan-images bucket. Format: {teacher_id}/{scan_id}.jpg. NULL if no image saved.';



COMMENT ON COLUMN "public"."scans"."expires_at" IS 'Auto-cleanup via cleanup_expired_scans() cron job (hourly).';



CREATE TABLE IF NOT EXISTS "public"."session_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "weak_points" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "dismissed_at" timestamp with time zone,
    "model_used" "text",
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "generation_ms" integer,
    "error_message" "text",
    CONSTRAINT "session_insights_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'ready'::"text", 'empty'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."session_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "key_points" "text",
    "session_type" "text" DEFAULT 'warmup'::"text" NOT NULL,
    "activity_type" "text" DEFAULT 'mcq'::"text" NOT NULL,
    "pin" "text" NOT NULL,
    "status" "text" DEFAULT 'lobby'::"text" NOT NULL,
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "allow_guests" boolean DEFAULT true NOT NULL,
    "deck_id" "uuid",
    "session_settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "section" "text",
    "lobby_theme" "text" DEFAULT 'calm'::"text" NOT NULL,
    "pending_close_at" timestamp with time zone,
    CONSTRAINT "sessions_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['mcq'::"text", 'tf'::"text", 'fill'::"text", 'order'::"text", 'match'::"text", 'poll'::"text"]))),
    CONSTRAINT "sessions_lobby_theme_valid" CHECK (("lobby_theme" = ANY (ARRAY['calm'::"text", 'ocean'::"text", 'pop'::"text", 'mono'::"text"]))),
    CONSTRAINT "sessions_session_type_check" CHECK (("session_type" = ANY (ARRAY['warmup'::"text", 'exitTicket'::"text"]))),
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['lobby'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_topic_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_name" "text" NOT NULL,
    "student_id" "uuid",
    "class_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "retention_score" real DEFAULT 0,
    "total_questions" integer DEFAULT 0,
    "correct_answers" integer DEFAULT 0,
    "last_reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."student_topic_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_unlocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "avatar_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_unlocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_retention" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "subject" "text",
    "retention_score" real DEFAULT 0,
    "total_questions" integer DEFAULT 0,
    "correct_answers" integer DEFAULT 0,
    "session_count" integer DEFAULT 0,
    "last_reviewed_at" timestamp with time zone,
    "next_review_at" timestamp with time zone,
    "ease_factor" real DEFAULT 2.5,
    "interval_days" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "snoozed_until" timestamp with time zone,
    "dismissed" boolean DEFAULT false NOT NULL,
    "deck_id" "uuid"
);


ALTER TABLE "public"."topic_retention" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "section" "text",
    "name" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "closed_at" timestamp with time zone,
    "closing_note" "text",
    "closing_narrative" "jsonb",
    "closing_narrative_generated_at" timestamp with time zone,
    "day_dates" "date"[] DEFAULT '{}'::"date"[] NOT NULL,
    CONSTRAINT "units_section_check" CHECK (("section" = ANY (ARRAY['warmup'::"text", 'exit_ticket'::"text", 'general_review'::"text"]))),
    CONSTRAINT "units_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'active'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE ("identifier");



ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_student_id_achievement_id_key" UNIQUE ("student_id", "achievement_id");



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_class_id_student_name_key" UNIQUE ("class_id", "student_name");



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_class_code_key" UNIQUE ("class_code");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."decks"
    ADD CONSTRAINT "decks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_unique_per_question" UNIQUE ("session_id", "participant_id", "question_index");



ALTER TABLE ONLY "public"."saved_decks"
    ADD CONSTRAINT "saved_decks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_decks"
    ADD CONSTRAINT "saved_decks_student_id_deck_id_key" UNIQUE ("student_id", "deck_id");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_insights"
    ADD CONSTRAINT "session_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_insights"
    ADD CONSTRAINT "session_insights_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_class_id_student_name_topic_key" UNIQUE ("class_id", "student_name", "topic");



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_unlocks"
    ADD CONSTRAINT "student_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_unlocks"
    ADD CONSTRAINT "student_unlocks_student_id_avatar_id_key" UNIQUE ("student_id", "avatar_id");



ALTER TABLE ONLY "public"."topic_retention"
    ADD CONSTRAINT "topic_retention_class_id_topic_key" UNIQUE ("class_id", "topic");



ALTER TABLE ONLY "public"."topic_retention"
    ADD CONSTRAINT "topic_retention_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "custom_oauth_providers_created_at_idx" ON "auth"."custom_oauth_providers" USING "btree" ("created_at");



CREATE INDEX "custom_oauth_providers_enabled_idx" ON "auth"."custom_oauth_providers" USING "btree" ("enabled");



CREATE INDEX "custom_oauth_providers_identifier_idx" ON "auth"."custom_oauth_providers" USING "btree" ("identifier");



CREATE INDEX "custom_oauth_providers_provider_type_idx" ON "auth"."custom_oauth_providers" USING "btree" ("provider_type");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "idx_users_created_at_desc" ON "auth"."users" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_users_email" ON "auth"."users" USING "btree" ("email");



CREATE INDEX "idx_users_last_sign_in_at_desc" ON "auth"."users" USING "btree" ("last_sign_in_at" DESC);



CREATE INDEX "idx_users_name" ON "auth"."users" USING "btree" ((("raw_user_meta_data" ->> 'name'::"text"))) WHERE (("raw_user_meta_data" ->> 'name'::"text") IS NOT NULL);



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



CREATE INDEX "webauthn_challenges_expires_at_idx" ON "auth"."webauthn_challenges" USING "btree" ("expires_at");



CREATE INDEX "webauthn_challenges_user_id_idx" ON "auth"."webauthn_challenges" USING "btree" ("user_id");



CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "auth"."webauthn_credentials" USING "btree" ("credential_id");



CREATE INDEX "webauthn_credentials_user_id_idx" ON "auth"."webauthn_credentials" USING "btree" ("user_id");



CREATE INDEX "ai_generations_teacher_recent_idx" ON "public"."ai_generations" USING "btree" ("teacher_id", "created_at" DESC);



CREATE INDEX "ai_generations_with_drops_idx" ON "public"."ai_generations" USING "btree" ("created_at" DESC, "validation_dropped_count") WHERE ("validation_dropped_count" > 0);



CREATE INDEX "decks_bucket_position_idx" ON "public"."decks" USING "btree" ("class_id", "section", "unit_id", "position");



CREATE INDEX "decks_class_section_idx" ON "public"."decks" USING "btree" ("class_id", "section");



CREATE INDEX "decks_unit_idx" ON "public"."decks" USING "btree" ("unit_id") WHERE ("unit_id" IS NOT NULL);



CREATE INDEX "idx_classes_teacher_position" ON "public"."classes" USING "btree" ("teacher_id", "position");



CREATE INDEX "idx_decks_copied_from_id" ON "public"."decks" USING "btree" ("copied_from_id") WHERE ("copied_from_id" IS NOT NULL);



CREATE INDEX "idx_responses_guest_token" ON "public"."responses" USING "btree" ("guest_token") WHERE ("guest_token" IS NOT NULL);



CREATE INDEX "idx_session_insights_ready" ON "public"."session_insights" USING "btree" ("status") WHERE ("status" = 'ready'::"text");



CREATE INDEX "idx_session_insights_session" ON "public"."session_insights" USING "btree" ("session_id");



CREATE INDEX "idx_session_participants_guest_token" ON "public"."session_participants" USING "btree" ("guest_token") WHERE ("guest_token" IS NOT NULL);



CREATE INDEX "idx_sessions_deck_id" ON "public"."sessions" USING "btree" ("deck_id") WHERE ("deck_id" IS NOT NULL);



CREATE INDEX "idx_sessions_pending_close" ON "public"."sessions" USING "btree" ("pending_close_at") WHERE (("pending_close_at" IS NOT NULL) AND ("status" = 'active'::"text"));



CREATE INDEX "idx_topic_retention_deck_id" ON "public"."topic_retention" USING "btree" ("deck_id") WHERE ("deck_id" IS NOT NULL);



CREATE INDEX "idx_units_closing_narrative_present" ON "public"."units" USING "btree" ("closed_at") WHERE ("closing_narrative" IS NOT NULL);



CREATE INDEX "profiles_is_admin_idx" ON "public"."profiles" USING "btree" ("is_admin") WHERE ("is_admin" = true);



CREATE INDEX "responses_pending_review_idx" ON "public"."responses" USING "btree" ("session_id", "created_at" DESC) WHERE (("needs_review" = true) AND ("teacher_grade" IS NULL));



CREATE INDEX "saved_decks_deck_id_idx" ON "public"."saved_decks" USING "btree" ("deck_id");



CREATE INDEX "saved_decks_favorite_idx" ON "public"."saved_decks" USING "btree" ("student_id", "is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "saved_decks_student_id_idx" ON "public"."saved_decks" USING "btree" ("student_id");



CREATE INDEX "scans_deck_created_idx" ON "public"."scans" USING "btree" ("deck_id", "created_at" DESC);



CREATE INDEX "scans_expires_idx" ON "public"."scans" USING "btree" ("expires_at");



CREATE INDEX "scans_teacher_created_idx" ON "public"."scans" USING "btree" ("teacher_id", "created_at" DESC);



CREATE INDEX "student_unlocks_student_id_idx" ON "public"."student_unlocks" USING "btree" ("student_id");



CREATE INDEX "topic_retention_dismissed_idx" ON "public"."topic_retention" USING "btree" ("dismissed") WHERE ("dismissed" = true);



CREATE INDEX "topic_retention_snoozed_until_idx" ON "public"."topic_retention" USING "btree" ("snoozed_until") WHERE ("snoozed_until" IS NOT NULL);



CREATE INDEX "units_class_section_idx" ON "public"."units" USING "btree" ("class_id", "section", "position");



CREATE INDEX "units_class_status_idx" ON "public"."units" USING "btree" ("class_id", "status");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "generate-insight-on-session-complete" AFTER UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://mhfwyeczzilcizawixqw.supabase.co/functions/v1/generate-insight', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZnd5ZWN6emlsY2l6YXdpeHF3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ1MjYzNiwiZXhwIjoyMDkzMDI4NjM2fQ.lWCi8CXVTHEMfg01JRHdiLNqeyf-firop71KP-1dx38"}', '{}', '10000');



CREATE OR REPLACE TRIGGER "profiles_block_sensitive_update_trg" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_block_sensitive_update"();



CREATE OR REPLACE TRIGGER "profiles_enforce_safe_insert_trg" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_enforce_safe_insert"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_generations"
    ADD CONSTRAINT "ai_generations_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."decks"
    ADD CONSTRAINT "decks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."decks"
    ADD CONSTRAINT "decks_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."decks"
    ADD CONSTRAINT "decks_copied_from_id_fkey" FOREIGN KEY ("copied_from_id") REFERENCES "public"."decks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."decks"
    ADD CONSTRAINT "decks_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."responses"
    ADD CONSTRAINT "responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_decks"
    ADD CONSTRAINT "saved_decks_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_decks"
    ADD CONSTRAINT "saved_decks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_insights"
    ADD CONSTRAINT "session_insights_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_topic_progress"
    ADD CONSTRAINT "student_topic_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_unlocks"
    ADD CONSTRAINT "student_unlocks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_retention"
    ADD CONSTRAINT "topic_retention_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_retention"
    ADD CONSTRAINT "topic_retention_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins read all generations" ON "public"."ai_generations" FOR SELECT USING ("public"."current_user_is_admin"());



CREATE POLICY "Admins read all profiles" ON "public"."profiles" FOR SELECT USING ("public"."current_user_is_admin"());



CREATE POLICY "Anyone can read classes" ON "public"."classes" FOR SELECT USING (true);



CREATE POLICY "Anyone can read sessions" ON "public"."sessions" FOR SELECT USING (true);



CREATE POLICY "Anyone can read units" ON "public"."units" FOR SELECT USING (true);



CREATE POLICY "Authors can delete own decks" ON "public"."decks" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Authors can update own decks" ON "public"."decks" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Class teacher deletes members, student deletes own row" ON "public"."class_members" FOR DELETE USING ((("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))) OR ("student_id" = "auth"."uid"())));



CREATE POLICY "Class teacher or own student updates progress" ON "public"."student_topic_progress" FOR UPDATE USING ((("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))) OR ("student_id" = "auth"."uid"())));



CREATE POLICY "Class teacher reads members, student reads own row" ON "public"."class_members" FOR SELECT USING ((("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))) OR ("student_id" = "auth"."uid"())));



CREATE POLICY "Class teacher reads progress, student reads own" ON "public"."student_topic_progress" FOR SELECT USING ((("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))) OR ("student_id" = "auth"."uid"())));



CREATE POLICY "Class teacher reads retention" ON "public"."topic_retention" FOR SELECT USING (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))));



CREATE POLICY "Class teacher updates members, student updates own row" ON "public"."class_members" FOR UPDATE USING ((("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))) OR ("student_id" = "auth"."uid"())));



CREATE POLICY "Class teacher updates retention" ON "public"."topic_retention" FOR UPDATE USING (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))));



CREATE POLICY "Class teacher upserts retention" ON "public"."topic_retention" FOR INSERT WITH CHECK (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."teacher_id" = "auth"."uid"()))));



CREATE POLICY "Decks are readable by author, public, or class member" ON "public"."decks" FOR SELECT USING ((("is_public" = true) OR ("auth"."uid"() = "author_id") OR (("class_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."class_members" "cm"
  WHERE (("cm"."class_id" = "decks"."class_id") AND ("cm"."student_id" = "auth"."uid"())))))));



CREATE POLICY "Direct inserts blocked — use join_class_by_code RPC" ON "public"."class_members" FOR INSERT WITH CHECK (false);



CREATE POLICY "Direct inserts blocked — use join_session RPC" ON "public"."session_participants" FOR INSERT WITH CHECK (false);



CREATE POLICY "Direct inserts blocked — use submit_response RPC" ON "public"."responses" FOR INSERT WITH CHECK (false);



CREATE POLICY "Direct inserts blocked — use upsert_student_progress RPC" ON "public"."student_topic_progress" FOR INSERT WITH CHECK (false);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Session teacher reads participants, student reads own row" ON "public"."session_participants" FOR SELECT USING ((("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."teacher_id" = "auth"."uid"()))) OR ("student_id" = "auth"."uid"())));



CREATE POLICY "Session teacher reads responses, student reads own" ON "public"."responses" FOR SELECT USING ((("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."teacher_id" = "auth"."uid"()))) OR ("participant_id" IN ( SELECT "session_participants"."id"
   FROM "public"."session_participants"
  WHERE ("session_participants"."student_id" = "auth"."uid"())))));



CREATE POLICY "Session teacher updates participants, student updates own row" ON "public"."session_participants" FOR UPDATE USING ((("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."teacher_id" = "auth"."uid"()))) OR ("student_id" = "auth"."uid"())));



CREATE POLICY "Session teacher updates responses" ON "public"."responses" FOR UPDATE USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."teacher_id" = "auth"."uid"()))));



CREATE POLICY "Students can update own saved_decks" ON "public"."saved_decks" FOR UPDATE USING (("auth"."uid"() = "student_id")) WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Teachers can create classes" ON "public"."classes" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can create sessions" ON "public"."sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can create units" ON "public"."units" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "units"."class_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can delete own classes" ON "public"."classes" FOR DELETE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can delete own units" ON "public"."units" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "units"."class_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can grade their session responses" ON "public"."responses" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "responses"."session_id") AND ("s"."teacher_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "responses"."session_id") AND ("s"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can remove students from their classes" ON "public"."class_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "class_members"."class_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can update own classes" ON "public"."classes" FOR UPDATE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can update own sessions" ON "public"."sessions" FOR UPDATE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can update own units" ON "public"."units" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "units"."class_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can update their own insights" ON "public"."session_insights" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."sessions" "s"
     JOIN "public"."decks" "d" ON (("d"."id" = "s"."deck_id")))
     JOIN "public"."classes" "c" ON (("c"."id" = "d"."class_id")))
  WHERE (("s"."id" = "session_insights"."session_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers read own generations" ON "public"."ai_generations" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers see insights of their own sessions" ON "public"."session_insights" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."sessions" "s"
     JOIN "public"."decks" "d" ON (("d"."id" = "s"."deck_id")))
     JOIN "public"."classes" "c" ON (("c"."id" = "d"."class_id")))
  WHERE (("s"."id" = "session_insights"."session_id") AND ("c"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Users can create decks" ON "public"."decks" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can read own achievements" ON "public"."achievements" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Users can unlock achievements" ON "public"."achievements" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_generations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."decks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_decks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_participants_guest_insert" ON "public"."session_participants" FOR INSERT WITH CHECK ((("is_guest" = true) AND (EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_participants"."session_id") AND ("s"."allow_guests" = true) AND ("s"."status" = ANY (ARRAY['lobby'::"text", 'active'::"text"])))))));



CREATE POLICY "session_participants_guest_read" ON "public"."session_participants" FOR SELECT USING (true);



CREATE POLICY "session_participants_guest_self_update" ON "public"."session_participants" FOR UPDATE USING (("is_guest" = true));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_public_read_by_code" ON "public"."sessions" FOR SELECT USING ((("status" = ANY (ARRAY['lobby'::"text", 'active'::"text"])) AND ("allow_guests" = true)));



ALTER TABLE "public"."student_topic_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_unlocks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students delete own saved" ON "public"."saved_decks" FOR DELETE USING (("student_id" = "auth"."uid"()));



CREATE POLICY "students insert own unlocks" ON "public"."student_unlocks" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "students manage own saved" ON "public"."saved_decks" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "students read own saved" ON "public"."saved_decks" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "students read own unlocks" ON "public"."student_unlocks" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "teachers delete own scans" ON "public"."scans" FOR DELETE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "teachers insert own scans" ON "public"."scans" FOR INSERT WITH CHECK (("teacher_id" = "auth"."uid"()));



CREATE POLICY "teachers read own scans" ON "public"."scans" FOR SELECT USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "teachers update own scans" ON "public"."scans" FOR UPDATE USING (("teacher_id" = "auth"."uid"())) WITH CHECK (("teacher_id" = "auth"."uid"()));



ALTER TABLE "public"."topic_retention" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deck_covers_owner_delete" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'deck-covers'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "deck_covers_owner_insert" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'deck-covers'::"text") AND ("auth"."role"() = 'authenticated'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "deck_covers_owner_update" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'deck-covers'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "deck_covers_public_read" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'deck-covers'::"text"));



ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile-avatars own delete" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'profile-avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "profile-avatars own update" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'profile-avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "profile-avatars own upload" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'profile-avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "profile-avatars public read" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'profile-avatars'::"text"));



ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teachers delete own scan images" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'scan-images'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "teachers read own scan images" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'scan-images'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "teachers upload own scan images" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'scan-images'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."class_decks_summary"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."class_decks_summary"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_decks_summary"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_scans"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_scans"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_scans"() TO "service_role";



GRANT ALL ON FUNCTION "public"."close_zombie_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_zombie_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_zombie_sessions"() TO "service_role";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_my_profile"("p_role" "text", "p_full_name" "text", "p_avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_my_profile"("p_role" "text", "p_full_name" "text", "p_avatar_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_my_profile"("p_role" "text", "p_full_name" "text", "p_avatar_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deck_question_stats"("p_deck_id" "uuid", "p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deck_question_stats"("p_deck_id" "uuid", "p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deck_question_stats"("p_deck_id" "uuid", "p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."email_already_registered"() TO "anon";
GRANT ALL ON FUNCTION "public"."email_already_registered"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."email_already_registered"() TO "service_role";



GRANT ALL ON FUNCTION "public"."force_close_my_pending_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."force_close_my_pending_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_close_my_pending_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_class_code"("p_subject" "text", "p_grade" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_class_code"("p_subject" "text", "p_grade" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_class_code"("p_subject" "text", "p_grade" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_session_pin"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_session_pin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_session_pin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guest_responses"("p_session_id" "uuid", "p_guest_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guest_responses"("p_session_id" "uuid", "p_guest_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guest_responses"("p_session_id" "uuid", "p_guest_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."join_class_by_code"("p_class_code" "text", "p_student_name" "text", "p_student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."join_class_by_code"("p_class_code" "text", "p_student_name" "text", "p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_class_by_code"("p_class_code" "text", "p_student_name" "text", "p_student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."join_session"("p_pin" "text", "p_student_name" "text", "p_student_id" "uuid", "p_guest_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_session"("p_pin" "text", "p_student_name" "text", "p_student_id" "uuid", "p_guest_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_session"("p_pin" "text", "p_student_name" "text", "p_student_id" "uuid", "p_guest_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."profiles_block_sensitive_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."profiles_block_sensitive_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."profiles_block_sensitive_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."profiles_enforce_safe_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."profiles_enforce_safe_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."profiles_enforce_safe_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_response"("p_participant_id" "uuid", "p_question_index" integer, "p_answer" "jsonb", "p_is_correct" boolean, "p_points" integer, "p_max_points" integer, "p_needs_review" boolean, "p_time_taken_ms" integer, "p_guest_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_response"("p_participant_id" "uuid", "p_question_index" integer, "p_answer" "jsonb", "p_is_correct" boolean, "p_points" integer, "p_max_points" integer, "p_needs_review" boolean, "p_time_taken_ms" integer, "p_guest_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_response"("p_participant_id" "uuid", "p_question_index" integer, "p_answer" "jsonb", "p_is_correct" boolean, "p_points" integer, "p_max_points" integer, "p_needs_review" boolean, "p_time_taken_ms" integer, "p_guest_token" "text") TO "service_role";



GRANT ALL ON TABLE "public"."session_participants" TO "anon";
GRANT ALL ON TABLE "public"."session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."session_participants" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_my_guest_name"("p_session_id" "uuid", "p_guest_token" "uuid", "p_new_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_my_guest_name"("p_session_id" "uuid", "p_guest_token" "uuid", "p_new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_my_guest_name"("p_session_id" "uuid", "p_guest_token" "uuid", "p_new_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_my_profile"("p_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_my_profile"("p_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_my_profile"("p_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_student_progress"("p_class_id" "uuid", "p_student_name" "text", "p_student_id" "uuid", "p_topic" "text", "p_total_questions" integer, "p_correct_answers" integer, "p_retention_score" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_student_progress"("p_class_id" "uuid", "p_student_name" "text", "p_student_id" "uuid", "p_topic" "text", "p_total_questions" integer, "p_correct_answers" integer, "p_retention_score" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_student_progress"("p_class_id" "uuid", "p_student_name" "text", "p_student_id" "uuid", "p_topic" "text", "p_total_questions" integer, "p_correct_answers" integer, "p_retention_score" integer) TO "service_role";



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "auth"."custom_oauth_providers" TO "postgres";
GRANT ALL ON TABLE "auth"."custom_oauth_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_client_states" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_client_states" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";



GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "auth"."webauthn_challenges" TO "postgres";
GRANT ALL ON TABLE "auth"."webauthn_challenges" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."webauthn_credentials" TO "postgres";
GRANT ALL ON TABLE "auth"."webauthn_credentials" TO "dashboard_user";



GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."ai_generations" TO "anon";
GRANT ALL ON TABLE "public"."ai_generations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_generations" TO "service_role";



GRANT ALL ON TABLE "public"."class_members" TO "anon";
GRANT ALL ON TABLE "public"."class_members" TO "authenticated";
GRANT ALL ON TABLE "public"."class_members" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."decks" TO "anon";
GRANT ALL ON TABLE "public"."decks" TO "authenticated";
GRANT ALL ON TABLE "public"."decks" TO "service_role";



GRANT ALL ON TABLE "public"."responses" TO "anon";
GRANT ALL ON TABLE "public"."responses" TO "authenticated";
GRANT ALL ON TABLE "public"."responses" TO "service_role";



GRANT ALL ON TABLE "public"."saved_decks" TO "anon";
GRANT ALL ON TABLE "public"."saved_decks" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_decks" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."session_insights" TO "anon";
GRANT ALL ON TABLE "public"."session_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."session_insights" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."student_topic_progress" TO "anon";
GRANT ALL ON TABLE "public"."student_topic_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."student_topic_progress" TO "service_role";



GRANT ALL ON TABLE "public"."student_unlocks" TO "anon";
GRANT ALL ON TABLE "public"."student_unlocks" TO "authenticated";
GRANT ALL ON TABLE "public"."student_unlocks" TO "service_role";



GRANT ALL ON TABLE "public"."topic_retention" TO "anon";
GRANT ALL ON TABLE "public"."topic_retention" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_retention" TO "service_role";



GRANT ALL ON TABLE "public"."units" TO "anon";
GRANT ALL ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



REVOKE ALL ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";



REVOKE ALL ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




