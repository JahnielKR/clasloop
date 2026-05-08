-- ============================================
-- PASO 1 — CORRER ESTO EN SUPABASE DESPUÉS DEL FIX FK
-- ============================================
--
-- PHASE 4 TURN 4 — Class decks summary RPC
--
-- Powers /classes/:id/insights. The teacher wants to see, per deck of
-- the class, how the class is doing overall:
--   - total responses across all sessions of that deck for this class
--   - sum of points / max_points (partials count)
--   - pre-computed % correct
--   - pending review count (free-text not yet graded)
--
-- We return one row per deck that has at least one response. Decks with
-- zero responses are filtered out via HAVING — the page renders nothing
-- for them (decision from user: don't surface decks the class hasn't
-- practiced yet, no placeholder messaging).
--
-- The function takes:
--   p_class_id — required, the class to summarize
--
-- Note on the LEFT JOIN to sessions: we filter sessions by class_id to
-- restrict the response pool to "responses from this class for this
-- deck". If a deck was used in another class too, those responses are
-- correctly excluded — that's the per-class view we want.
--
-- Note on partial review handling: pending free-text answers (needs_review
-- and teacher_grade IS NULL) contribute 0 to both points and max_points
-- of the % calc — they don't penalize the score and don't pad it. They
-- show up separately as pending_review_count so the teacher can click
-- through to /review and grade them.
-- ============================================

create or replace function public.class_decks_summary(p_class_id uuid)
returns table (
  deck_id uuid,
  deck_title text,
  deck_section text,           -- 'warmup' | 'exit_ticket' | 'general_review'
  unit_id uuid,
  total_responses integer,
  total_points integer,        -- sum(points) — partials count
  total_max_points integer,    -- sum(max_points)
  pct_correct integer,         -- pre-computed: round(100 * total_points / total_max_points)
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
    count(r.id)::int as total_responses,
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
  having count(r.id) > 0   -- exclude decks with zero responses (decision: don't surface them)
  order by d.section, d.position, d.title;
$$;

-- Allow authenticated users to call it. RLS on `responses`/`sessions`/`decks`
-- restricts what they can actually aggregate via SECURITY INVOKER (default).
grant execute on function public.class_decks_summary(uuid) to authenticated;

-- ============================================
-- DONE
-- ============================================
