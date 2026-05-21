-- ============================================
-- PHASE 1 MIGRATION — Class hierarchy
-- Run in Supabase SQL Editor.
--
-- Adds:
--   1. classes.color_id text default 'auto'         — UI color override
--   2. decks.section text not null default 'general_review' — warmup/exit_ticket/general_review
--   3. units table                                  — optional groupings inside a section
--   4. decks.unit_id uuid null                      — FK to units
--
-- Backfill: every existing deck (including those without a class) gets
-- section='general_review'. That's the safest neutral bucket — teachers can
-- reclassify anything to warmup/exit_ticket later via the deck editor.
-- ============================================

-- ── 1. classes.color_id ─────────────────────────────────────────────────
alter table public.classes
  add column if not exists color_id text not null default 'auto'
  check (color_id in ('auto', 'blue', 'purple', 'green', 'orange', 'pink', 'yellow', 'red', 'gray'));

-- ── 2. decks.section ────────────────────────────────────────────────────
-- Add as nullable first, backfill, then enforce NOT NULL. Doing it in one
-- step (NOT NULL DEFAULT 'general_review') would also work, but Postgres
-- locks the table to fill the default — splitting it is friendlier on
-- larger deck tables. Either way the end state is the same.
alter table public.decks
  add column if not exists section text default 'general_review'
  check (section in ('warmup', 'exit_ticket', 'general_review'));

update public.decks set section = 'general_review' where section is null;

alter table public.decks
  alter column section set not null;

-- ── 3. units table ──────────────────────────────────────────────────────
-- A unit groups decks within a (class, section) pair. Optional —
-- decks with unit_id = null appear in an "Unsorted" bucket inside their
-- section. position is for manual reorder; lower = first.
create table if not exists public.units (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  section text not null check (section in ('warmup', 'exit_ticket', 'general_review')),
  name text not null,
  position integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists units_class_section_idx
  on public.units(class_id, section, position);

alter table public.units enable row level security;

-- Anyone who can read a class can read its units. Only the class teacher
-- can mutate. Mirrors the policies on classes / decks.
drop policy if exists "Anyone can read units" on public.units;
create policy "Anyone can read units" on public.units for select using (true);

drop policy if exists "Teachers can create units" on public.units;
create policy "Teachers can create units" on public.units for insert
  with check (exists (
    select 1 from public.classes c
    where c.id = units.class_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "Teachers can update own units" on public.units;
create policy "Teachers can update own units" on public.units for update
  using (exists (
    select 1 from public.classes c
    where c.id = units.class_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "Teachers can delete own units" on public.units;
create policy "Teachers can delete own units" on public.units for delete
  using (exists (
    select 1 from public.classes c
    where c.id = units.class_id and c.teacher_id = auth.uid()
  ));

-- ── 4. decks.unit_id ────────────────────────────────────────────────────
alter table public.decks
  add column if not exists unit_id uuid references public.units(id) on delete set null;

create index if not exists decks_class_section_idx
  on public.decks(class_id, section);

create index if not exists decks_unit_idx
  on public.decks(unit_id) where unit_id is not null;

-- ============================================
-- DONE
-- ============================================
