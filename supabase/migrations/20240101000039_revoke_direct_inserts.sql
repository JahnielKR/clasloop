-- ═══════════════════════════════════════════════════════════════════════
-- PR 72 — Step 2: Lock down direct INSERTs after RPCs are deployed
-- ═══════════════════════════════════════════════════════════════════════
--
-- ⚠️  ONLY APPLY THIS AFTER:
--     1. pr72_hardening_rpcs.sql has been applied (creates the RPCs)
--     2. The corresponding code changes in src/ have been deployed
--        (useClass.js + spaced-repetition.js call the new RPCs)
--     3. You've verified the app works end-to-end with the new RPCs
--        (one student joins a class, one teacher closes a session)
--
-- After this file is applied, direct INSERTs to class_members and
-- student_topic_progress will be REJECTED by RLS. The only way to write
-- is through the RPCs, which have validation.
--
-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ═══════════════════════════════════════════════════════════════════════
--
-- If something breaks after applying this, run:
--
--   drop policy if exists "Direct inserts blocked — use join_class_by_code RPC"
--     on public.class_members;
--   drop policy if exists "Direct inserts blocked — use upsert_student_progress RPC"
--     on public.student_topic_progress;
--
--   -- restore the original permissive policies (they were "Anyone can ..."):
--   create policy "Anyone can join classes"
--     on public.class_members for insert with check (true);
--   create policy "Anyone can upsert progress"
--     on public.student_topic_progress for insert with check (true);
--
-- That returns the schema to its pre-PR-72 state for those two tables.
-- The RPCs from step 1 remain (harmless, just unused).
--
-- ═══════════════════════════════════════════════════════════════════════

-- ── CLASS_MEMBERS: block direct INSERTs ────────────────────────────────
-- The original "Anyone can join classes" policy with check (true) was
-- the agujero. Replace it with a `with check (false)` policy — nothing
-- can insert directly. Only the join_class_by_code RPC (SECURITY DEFINER)
-- can write, and it has validation built in.

drop policy if exists "Anyone can join classes" on public.class_members;
drop policy if exists "Direct inserts blocked — use join_class_by_code RPC" on public.class_members;

create policy "Direct inserts blocked — use join_class_by_code RPC"
on public.class_members
for insert
with check (false);


-- ── STUDENT_TOPIC_PROGRESS: block direct INSERTs ───────────────────────
-- Same idea. Only upsert_student_progress RPC can write.

drop policy if exists "Anyone can upsert progress" on public.student_topic_progress;
drop policy if exists "Direct inserts blocked — use upsert_student_progress RPC" on public.student_topic_progress;

create policy "Direct inserts blocked — use upsert_student_progress RPC"
on public.student_topic_progress
for insert
with check (false);


-- ═══════════════════════════════════════════════════════════════════════
-- NOTE: We DO NOT touch UPDATE/SELECT policies on these tables.
-- ═══════════════════════════════════════════════════════════════════════
-- PR 33 already set them correctly:
--   class_members SELECT: class teacher OR own student row
--   class_members UPDATE: class teacher OR own student row
--   class_members DELETE: class teacher (phase26/phase27)
--   student_topic_progress SELECT: class teacher OR own student row
--   student_topic_progress UPDATE: class teacher OR own student row
-- The only thing left was INSERT — this PR closes it.
-- ═══════════════════════════════════════════════════════════════════════
