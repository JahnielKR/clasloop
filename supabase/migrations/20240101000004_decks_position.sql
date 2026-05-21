-- ============================================
-- PHASE 3.1 MIGRATION — decks.position for drag-reorder within unit
--
-- Adds an integer position column on decks. Lets the teacher drag-reorder
-- decks within a (class_id, section, unit_id) bucket. Lower position
-- values render first; ties break by created_at desc (the existing default).
--
-- Backfill: existing decks get a position derived from their creation order
-- within their bucket — that way the initial state matches what the teacher
-- already sees on the page (newest first).
--
-- The column is NOT NULL with default 0 so any deck created via INSERT
-- without specifying position gets a sensible value. The application
-- assigns "max+1 in bucket" on creation so new decks land at the end.
-- ============================================

alter table public.decks
  add column if not exists position integer not null default 0;

-- Backfill: assign positions matching current order (newest first → low
-- numbers). We use a window function over the existing visible order so
-- no deck "jumps" when the new column starts being respected.
with ordered as (
  select id,
         row_number() over (
           partition by class_id, section, coalesce(unit_id::text, '__unsorted__')
           order by created_at desc
         ) as rn
  from public.decks
)
update public.decks d
set position = ordered.rn
from ordered
where d.id = ordered.id;

create index if not exists decks_bucket_position_idx
  on public.decks(class_id, section, unit_id, position);

-- ============================================
-- DONE
-- ============================================
