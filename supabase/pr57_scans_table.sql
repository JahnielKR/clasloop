-- ═══════════════════════════════════════════════════════════════════════
-- PR 57.1: Scan results table + storage bucket + auto-expire
-- ═══════════════════════════════════════════════════════════════════════
--
-- Feature: scanner cam (Capacitor + ML Kit). Después de escanear una
-- hoja, guardamos el resultado para que el profe pueda ver el
-- histórico en /scans.
--
-- Decisión clave (Jota): los scans expiran a la SEMANA. Son ephemeral
-- — el profe revisa scores recientes, no archivo permanente. Esto:
--   - Evita explosión de costos en storage (especialmente las fotos)
--   - Privacidad: las fotos de hojas de alumnos no se acumulan para
--     siempre
--   - Si el profe necesita registro permanente, exporta el score a su
--     planilla externa
--
-- ═══════════════════════════════════════════════════════════════════════
-- DESIGN
-- ═══════════════════════════════════════════════════════════════════════
--
-- Tabla scans:
--   id              UUID PK
--   teacher_id      UUID FK profiles(id)  — quién escaneó
--   deck_id         UUID FK decks(id)     — qué deck
--   score           int                    — preguntas correctas
--   total           int                    — total preguntas escaneables
--   answers_json    jsonb                  — array [{question_id, marked, correct, confidence}]
--   image_path      text (nullable)        — path en bucket scan-images
--                                            null si no se guardó foto
--   created_at      timestamptz default now()
--   expires_at      timestamptz default (now() + interval '7 days')
--
-- answers_json estructura ejemplo:
--   [
--     { "question_id": "uuid", "marked": "A", "correct": "A",
--       "is_correct": true, "confidence": 0.92 },
--     { "question_id": "uuid", "marked": null, "correct": "B",
--       "is_correct": false, "confidence": 0.15, "is_uncertain": true },
--     ...
--   ]
--
-- RLS: teachers solo ven sus propios scans (teacher_id = auth.uid()).
--
-- Cron: pg_cron job corre cada hora, borra scans donde expires_at < now().
-- También borra el archivo del storage bucket asociado.
--
-- ═══════════════════════════════════════════════════════════════════════

-- ── TABLA scans ────────────────────────────────────────────────────────
create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  deck_id     uuid not null references public.decks(id) on delete cascade,
  score       int  not null check (score >= 0),
  total       int  not null check (total >= 0 and total >= score),
  answers_json jsonb not null default '[]'::jsonb,
  image_path  text,  -- path within scan-images storage bucket
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

-- Indexes for common queries
create index if not exists scans_teacher_created_idx
  on public.scans(teacher_id, created_at desc);
create index if not exists scans_deck_created_idx
  on public.scans(deck_id, created_at desc);
create index if not exists scans_expires_idx
  on public.scans(expires_at)
  where expires_at < now() + interval '1 day';  -- partial: solo near-expiry

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.scans enable row level security;

-- Teachers see only their own scans
drop policy if exists "teachers read own scans" on public.scans;
create policy "teachers read own scans"
on public.scans
for select
using (teacher_id = auth.uid());

-- Teachers can insert their own scans
drop policy if exists "teachers insert own scans" on public.scans;
create policy "teachers insert own scans"
on public.scans
for insert
with check (teacher_id = auth.uid());

-- Teachers can update their own scans (for confidence review edits)
drop policy if exists "teachers update own scans" on public.scans;
create policy "teachers update own scans"
on public.scans
for update
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

-- Teachers can delete their own scans
drop policy if exists "teachers delete own scans" on public.scans;
create policy "teachers delete own scans"
on public.scans
for delete
using (teacher_id = auth.uid());

-- ── STORAGE BUCKET: scan-images ────────────────────────────────────────
-- Privacy: bucket is private, files accessed via signed URLs.
insert into storage.buckets (id, name, public)
values ('scan-images', 'scan-images', false)
on conflict (id) do nothing;

-- Storage policy: teachers can upload to their own folder
-- Pattern: scan-images/{teacher_id}/{scan_id}.jpg
drop policy if exists "teachers upload own scan images" on storage.objects;
create policy "teachers upload own scan images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "teachers read own scan images" on storage.objects;
create policy "teachers read own scan images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "teachers delete own scan images" on storage.objects;
create policy "teachers delete own scan images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'scan-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ── AUTO-EXPIRE: función + cron job ────────────────────────────────────
--
-- Borra scans expirados + sus imágenes del storage.
-- Se ejecuta cada hora vía pg_cron.

create or replace function public.cleanup_expired_scans()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_scan record;
begin
  -- Loop scans expirados, borrar imagen del storage primero
  for expired_scan in
    select id, image_path
    from public.scans
    where expires_at < now()
  loop
    if expired_scan.image_path is not null then
      -- Borrar del storage. Si falla (e.g. ya borrado), seguir igual.
      begin
        delete from storage.objects
        where bucket_id = 'scan-images'
          and name = expired_scan.image_path;
      exception when others then
        -- log y continuar
        raise notice 'Failed to delete storage object %: %',
          expired_scan.image_path, sqlerrm;
      end;
    end if;
  end loop;

  -- Borrar las rows
  delete from public.scans where expires_at < now();
end;
$$;

-- Schedule the cleanup. pg_cron requires the extension.
-- This is idempotent — running the migration multiple times is safe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Unschedule any previous version of the job
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'cleanup_expired_scans';

    -- Schedule fresh: every hour at minute 17 (offset from typical xx:00 jobs)
    perform cron.schedule(
      'cleanup_expired_scans',
      '17 * * * *',
      'select public.cleanup_expired_scans();'
    );
  else
    raise notice 'pg_cron extension not available, skipping schedule. Run manually: select public.cleanup_expired_scans();';
  end if;
end;
$$;

-- ── COMMENT for future devs ────────────────────────────────────────────
comment on table public.scans is
  'Scanner results (PR 57). Auto-expires 7 days. RLS: teacher owns row.';
comment on column public.scans.answers_json is
  'Array of {question_id, marked, correct, is_correct, confidence, is_uncertain}.';
comment on column public.scans.image_path is
  'Path in scan-images bucket. Format: {teacher_id}/{scan_id}.jpg. NULL if no image saved.';
comment on column public.scans.expires_at is
  'Auto-cleanup via cleanup_expired_scans() cron job (hourly).';
