-- ============================================
-- PR 18 — Add position column to classes for drag-to-reorder
--
-- Teacher feedback: classes appear in My Classes ordered by created_at
-- descending. If you create Spanish 1 first and Spanish 3 last, you see
-- Spanish 3 on top — opposite of teaching order. Drag-to-reorder lets
-- the teacher arrange them however they want.
--
-- Schema: position int, NOT NULL, default 0.
-- Backfill: assign sequential positions to existing classes per teacher,
-- preserving the current order (oldest first → position 0).
--
-- Run in Supabase SQL Editor.
-- ============================================

-- 1. Add the column (default 0 so existing rows pass NOT NULL)
alter table classes
  add column if not exists position int not null default 0;

-- 2. Backfill: per teacher, number their classes in created_at order so
-- the new "position ASC" sort matches "created_at ASC" for existing data.
-- A teacher who later drags can override these.
with numbered as (
  select
    id,
    row_number() over (
      partition by teacher_id
      order by created_at asc
    ) - 1 as new_position
  from classes
)
update classes c
set position = n.new_position
from numbered n
where c.id = n.id
  and c.position = 0; -- only backfill rows still at the default

-- 3. Index for queries that filter+sort by (teacher_id, position).
-- The teacher's My Classes page is the main reader.
create index if not exists idx_classes_teacher_position
  on classes (teacher_id, position);
