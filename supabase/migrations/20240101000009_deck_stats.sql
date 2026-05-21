-- ============================================
-- PHASE 4 TURN 3 — Per-deck question stats RPC
--
-- Powers /decks/:id/results. The teacher wants to see, per question:
--   - total responses
--   - count correct / partial / incorrect
--   - count pending teacher review (free-text)
--   - average response time (ms)
--   - answer distribution (which option each student picked, in JSONB)
--
-- We do this server-side because:
--   - A popular deck can accumulate thousands of responses; client
--     aggregation would download all of them.
--   - The aggregation is cheap in SQL (one GROUP BY) and keeps the
--     client lean.
--   - RLS already restricts which `responses` rows any logged-in user
--     can read; the function inherits that via SECURITY INVOKER (the
--     default), so a teacher only ever aggregates rows from sessions
--     they own.
--
-- The function takes:
--   p_deck_id  — required, the deck to summarize
--   p_class_id — optional class filter (null = aggregate across all
--                classes the deck has been used in)
--
-- Returns one row per question_index that has at least one response.
-- Questions with zero responses are NOT in the result; the client
-- displays them as "no data yet".
-- ============================================

create or replace function public.deck_question_stats(
  p_deck_id uuid,
  p_class_id uuid default null
)
returns table (
  question_index integer,
  total_responses integer,
  correct_count integer,
  partial_count integer,
  incorrect_count integer,
  pending_review_count integer,
  avg_time_ms integer,
  -- answer_distribution: a JSONB object mapping the stringified `answer`
  -- value to the count of responses with that exact answer. Useful for
  -- MCQ / TF where the answer is a small finite set; less useful for
  -- free-text (the client can ignore it for those types).
  --
  -- Shape: { "0": 12, "1": 3, "2": 8, ... } for an MCQ where students
  -- picked option indices 0/1/2; or { "true": 15, "false": 4 } for T/F.
  -- For non-trivial answers (objects, arrays) we store the JSON as the
  -- key, so they collapse predictably.
  answer_distribution jsonb
)
language sql
stable
as $$
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

-- Allow authenticated users to call it. RLS on `responses` and `sessions`
-- restricts what they can actually aggregate (a teacher only sees their
-- own sessions; SECURITY INVOKER defaults to using the caller's identity).
grant execute on function public.deck_question_stats(uuid, uuid) to authenticated;

-- ============================================
-- DONE
-- ============================================
