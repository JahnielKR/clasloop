-- ============================================
-- PASO 1 — CORRER ESTO EN SUPABASE DESPUÉS DEL OTRO
-- ============================================
--
-- UPDATE: class_decks_summary now returns ALL decks of a class
--
-- The original turn 4 migration had `having count(r.id) > 0` to hide
-- decks with zero responses. The user asked for opción 4: show all
-- decks, with a "no usage yet" message in the UI for ones without data.
-- This way the teacher sees the full composition of their class even
-- when some decks haven't been launched yet.
--
-- Change: remove the HAVING clause. The UI now decides what to do with
-- decks that have total_responses=0 (renders the section with a single
-- "No X used yet" message instead of one row per unused deck).
--
-- Other behavior stays the same.
-- ============================================

create or replace function public.class_decks_summary(p_class_id uuid)
returns table (
  deck_id uuid,
  deck_title text,
  deck_section text,           -- 'warmup' | 'exit_ticket' | 'general_review'
  unit_id uuid,
  total_responses integer,
  total_points integer,
  total_max_points integer,
  pct_correct integer,         -- null when total_max_points = 0
  pending_review_count integer
)
language sql
stable
as $$
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

grant execute on function public.class_decks_summary(uuid) to authenticated;

-- ============================================
-- DONE — remember to NOTIFY pgrst, 'reload schema' if PostgREST cache
-- doesn't pick up the change automatically (404 on the RPC).
-- ============================================

notify pgrst, 'reload schema';
