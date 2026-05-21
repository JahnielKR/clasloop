-- ============================================
-- PR 13 — Session Insights (post-session weak-points bar)
-- Run in Supabase SQL Editor.
--
-- Adds:
--   1. session_insights table — one row per session, stores the AI-generated
--      weak-point analysis (1 or 2 questions where most students failed).
--   2. RLS policies — teachers only see/modify insights of sessions they own.
--   3. Indexes for the read paths.
--
-- The actual generation runs in a Supabase Edge Function triggered by a
-- Database Webhook when sessions.status changes to 'completed'. See
-- supabase/functions/generate-insight/ for the worker code.
-- ============================================

create table if not exists session_insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,

  -- Array of weak point objects. Shape per element:
  -- {
  --   "label": "Las preguntas con `estar` para ubicación física",
  --   "fail_pct": 60,
  --   "fail_count": 6,
  --   "total": 10,
  --   "question_ids": ["uuid"],
  --   "top_failers": [
  --     { "participant_id": "uuid", "name": "Pedro G.", "wrong": 3, "total": 3 }
  --   ]
  -- }
  -- Stored as JSONB because it's read/written as a unit, never queried by
  -- individual student or failer. Normalizing into child tables would add
  -- complexity without query benefits.
  weak_points jsonb not null default '[]'::jsonb,

  -- Lifecycle states:
  --   pending: row created, generation in flight
  --   ready:   weak_points has 1 or 2 entries, AI succeeded
  --   empty:   AI ran but no question crossed the threshold (normal session)
  --   failed:  generation failed (timeout, API error, parse failure)
  -- The UI shows the bar only on 'ready'. 'empty', 'failed', and 'pending'
  -- render nothing.
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'empty', 'failed')),

  -- PR 13 + Jota decision: allow ONE retry if status becomes 'failed'.
  -- attempts counts the number of generation tries. After the 2nd failure,
  -- the row stays 'failed' forever (no more retries in v1).
  attempts int not null default 0,

  -- Teacher dismissed the bar from the recap screen. Once set, the UI
  -- treats this insight as if it doesn't exist (no bar rendered, even
  -- if the row is 'ready'). Reload-stable.
  dismissed_at timestamptz,

  -- Observability
  model_used text,
  generated_at timestamptz default now(),
  generation_ms int,
  error_message text,

  -- One insight per session, ever. The Edge Function uses this to be
  -- idempotent: re-triggering the same webhook does nothing if a 'ready'
  -- or 'empty' row already exists.
  unique(session_id)
);

create index if not exists idx_session_insights_session on session_insights(session_id);
create index if not exists idx_session_insights_ready on session_insights(status)
  where status = 'ready';

-- ── RLS ──
-- Teachers can SELECT and UPDATE their own session insights.
-- INSERTs come from the Edge Function using SUPABASE_SERVICE_KEY, which
-- bypasses RLS — no insert policy needed.

alter table session_insights enable row level security;

create policy "Teachers see insights of their own sessions"
  on session_insights for select
  using (
    exists (
      select 1 from sessions s
      join decks d on d.id = s.deck_id
      join classes c on c.id = d.class_id
      where s.id = session_insights.session_id
        and c.teacher_id = auth.uid()
    )
  );

create policy "Teachers can update their own insights"
  on session_insights for update
  using (
    exists (
      select 1 from sessions s
      join decks d on d.id = s.deck_id
      join classes c on c.id = d.class_id
      where s.id = session_insights.session_id
        and c.teacher_id = auth.uid()
    )
  );

-- ── Notes for the implementer ──
--
-- After running this migration:
-- 1. Deploy the Edge Function: supabase functions deploy generate-insight
-- 2. Set the function's secrets in Supabase Dashboard:
--      ANTHROPIC_API_KEY (your Anthropic key)
-- 3. Create a Database Webhook in Supabase Dashboard:
--      Table: sessions
--      Events: Update
--      Condition: When status changes to 'completed'
--      URL: https://<project-ref>.functions.supabase.co/generate-insight
--      Headers: Authorization: Bearer <SUPABASE_ANON_KEY>
-- 4. Test by ending a real session — check the session_insights table.
--
-- See supabase/functions/generate-insight/README.md for full setup steps.
