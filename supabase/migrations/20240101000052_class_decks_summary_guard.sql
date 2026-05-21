-- ============================================
-- PR 106 — RLS guard for class_decks_summary (M11)
-- ============================================
-- Adds an explicit authorization check at the start of the function:
-- caller must be either the teacher of the class OR a member of it.
--
-- IMPORTANT — the body of this function is preserved verbatim from
-- production (see schema.sql / PR 101 dump). The PR 106 README
-- contained a different body that joined decks → responses directly,
-- which would change semantics (counts responses of any session for
-- that deck, not only sessions belonging to this class). The correct
-- prod body uses decks → sessions → responses and groups by
-- d.position. Only the guard at the top is new.
--
-- Language change: prod was LANGUAGE sql STABLE. We move to plpgsql
-- so we can RAISE EXCEPTION. STABLE is preserved.
-- ============================================

create or replace function public.class_decks_summary(p_class_id uuid)
returns table (
  deck_id uuid,
  deck_title text,
  deck_section text,
  unit_id uuid,
  total_responses integer,
  total_points integer,
  total_max_points integer,
  pct_correct integer,
  pending_review_count integer
)
language plpgsql
stable
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_authorized boolean := false;
begin
  -- Anonymous callers: reject.
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- PR 106 (M11): caller must be teacher of the class OR a member.
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id
      and (c.teacher_id = v_uid)
  ) or exists (
    select 1 from public.class_members cm
    where cm.class_id = p_class_id
      and cm.student_id = v_uid
  )
  into v_authorized;

  if not v_authorized then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- ── Original body, preserved from prod (PR 101 dump) ─────────────
  return query
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
end;
$$;

grant execute on function public.class_decks_summary(uuid) to authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- 1. Owner teacher succeeds:
--      As a logged-in teacher whose own class id is X:
--      select * from public.class_decks_summary(X);
--    Expected: rows.
--
-- 2. Class member (student) succeeds:
--      As a logged-in student member of class X:
--      select * from public.class_decks_summary(X);
--    Expected: rows.
--
-- 3. Foreign teacher fails:
--      As a logged-in teacher who does NOT own class X and is not a member:
--      select * from public.class_decks_summary(X);
--    Expected: ERROR: forbidden.
--
-- 4. Anon fails:
--      With no session:
--      select * from public.class_decks_summary(X);
--    Expected: ERROR: unauthorized.
-- ============================================
