-- ============================================
-- PR 105 — Declare responses.guest_token (M10)
-- ============================================
-- Purpose: this column has existed in production since Phase 4 era
-- (created via Supabase UI, no migration). 20240101000008_responses_rls.sql
-- references it without declaring it, which breaks fresh replay.
--
-- This migration adds it idempotently. In prod it's a no-op (column
-- already exists). In fresh setup or staging it creates it before
-- the RLS migration tries to reference it.
--
-- Placement: timestamp 20240101000007a sits between
--   20240101000007_review_scoring.sql (phase4_review_scoring)
--   20240101000008_responses_rls.sql   (phase4_turn2_responses_rls)
-- which is the correct historical position.
-- ============================================

alter table public.responses
  add column if not exists guest_token uuid;

-- Optional: index it if guest queries by token become hot.
-- Not adding now because guest reads go through RPC get_guest_responses
-- which filters by participant_id (PR 93). If that changes:
-- create index if not exists idx_responses_guest_token
--   on public.responses(guest_token) where guest_token is not null;

-- ============================================
-- VERIFICATION
-- ============================================
-- 1. Column exists:
--      select column_name, data_type, is_nullable
--      from information_schema.columns
--      where table_schema = 'public'
--        and table_name = 'responses'
--        and column_name = 'guest_token';
--    Expected: 1 row (data_type=uuid, is_nullable=YES).
--
-- 2. Confirm replay safety (in fresh DB):
--    After running migrations in order, the RLS policies referencing
--    guest_token should apply without error.
-- ============================================
