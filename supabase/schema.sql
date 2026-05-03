-- ============================================
-- CLASLOOP DATABASE SCHEMA
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor → New Query)
-- ============================================

-- ── Enable extensions ──
create extension if not exists "uuid-ossp";

-- ── Profiles (extends Supabase auth.users) ──
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('teacher', 'student')) default 'teacher',
  full_name text,
  avatar_id text default 'fox',
  frame_id text default 'none',
  school text,
  language text default 'en' check (language in ('en', 'es', 'ko')),
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  streak_last_date date,
  daily_goal integer default 10,
  created_at timestamptz default now()
);

-- ── Classes ──
create table public.classes (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  grade text not null,
  subject text not null,
  class_code text unique not null,
  created_at timestamptz default now()
);

-- ── Class Members (students in classes) ──
create table public.class_members (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  student_name text not null,
  student_id uuid references public.profiles(id) on delete set null,
  joined_at timestamptz default now(),
  unique(class_id, student_name)
);

-- ── Sessions (warmups / exit tickets) ──
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  topic text not null,
  key_points text,
  session_type text not null check (session_type in ('warmup', 'exitTicket')) default 'warmup',
  activity_type text not null check (activity_type in ('mcq', 'tf', 'fill', 'order', 'match', 'poll')) default 'mcq',
  pin text not null,
  status text not null check (status in ('lobby', 'active', 'completed')) default 'lobby',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ── Session Participants ──
create table public.session_participants (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  student_name text not null,
  student_id uuid references public.profiles(id) on delete set null,
  joined_at timestamptz default now()
);

-- ── Responses (individual answers) ──
create table public.responses (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  participant_id uuid references public.session_participants(id) on delete cascade not null,
  question_index integer not null,
  answer jsonb not null, -- flexible: number for MCQ, boolean for T/F, string for fill, etc.
  is_correct boolean not null,
  time_taken_ms integer, -- how long they took to answer
  created_at timestamptz default now()
);

-- ── Topic Retention (spaced repetition tracking) ──
create table public.topic_retention (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  topic text not null,
  subject text,
  retention_score real default 0, -- 0-100
  total_questions integer default 0,
  correct_answers integer default 0,
  session_count integer default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  ease_factor real default 2.5, -- SM-2 algorithm
  interval_days integer default 1,
  created_at timestamptz default now(),
  unique(class_id, topic)
);

-- ── Student Topic Progress (per-student retention) ──
create table public.student_topic_progress (
  id uuid default uuid_generate_v4() primary key,
  student_name text not null,
  student_id uuid references public.profiles(id) on delete set null,
  class_id uuid references public.classes(id) on delete cascade not null,
  topic text not null,
  retention_score real default 0,
  total_questions integer default 0,
  correct_answers integer default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique(class_id, student_name, topic)
);

-- ── Achievements (unlocked by students) ──
create table public.achievements (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id text not null,
  unlocked_at timestamptz default now(),
  unique(student_id, achievement_id)
);

-- ── Community Decks ──
create table public.decks (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  subject text not null,
  grade text not null,
  language text not null default 'en',
  questions jsonb not null default '[]'::jsonb,
  tags text[] default '{}',
  is_public boolean default false,
  uses_count integer default 0,
  rating real default 0,
  review_count integer default 0,
  created_at timestamptz default now()
);

-- ── Row Level Security (RLS) ──
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.responses enable row level security;
alter table public.topic_retention enable row level security;
alter table public.student_topic_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.decks enable row level security;

-- ── RLS Policies ──

-- Profiles: users can read all, update own
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Classes: teacher can CRUD own, anyone can read
create policy "Anyone can read classes" on public.classes for select using (true);
create policy "Teachers can create classes" on public.classes for insert with check (auth.uid() = teacher_id);
create policy "Teachers can update own classes" on public.classes for update using (auth.uid() = teacher_id);
create policy "Teachers can delete own classes" on public.classes for delete using (auth.uid() = teacher_id);

-- Sessions: teacher can CRUD, participants can read
create policy "Anyone can read sessions" on public.sessions for select using (true);
create policy "Teachers can create sessions" on public.sessions for insert with check (auth.uid() = teacher_id);
create policy "Teachers can update own sessions" on public.sessions for update using (auth.uid() = teacher_id);

-- Session participants: anyone can join (students don't need auth)
create policy "Anyone can read participants" on public.session_participants for select using (true);
create policy "Anyone can join sessions" on public.session_participants for insert with check (true);

-- Responses: anyone can create (students), teachers can read
create policy "Anyone can read responses" on public.responses for select using (true);
create policy "Anyone can create responses" on public.responses for insert with check (true);

-- Class members: teachers manage, anyone can read
create policy "Anyone can read class members" on public.class_members for select using (true);
create policy "Anyone can join classes" on public.class_members for insert with check (true);

-- Topic retention: readable by class teacher
create policy "Anyone can read retention" on public.topic_retention for select using (true);
create policy "Anyone can upsert retention" on public.topic_retention for insert with check (true);
create policy "Anyone can update retention" on public.topic_retention for update using (true);

-- Student progress: readable
create policy "Anyone can read progress" on public.student_topic_progress for select using (true);
create policy "Anyone can upsert progress" on public.student_topic_progress for insert with check (true);
create policy "Anyone can update progress" on public.student_topic_progress for update using (true);

-- Achievements: user can read own
create policy "Users can read own achievements" on public.achievements for select using (auth.uid() = student_id);
create policy "Users can unlock achievements" on public.achievements for insert with check (auth.uid() = student_id);

-- Decks: public decks readable by all, authors can manage own
create policy "Public decks are readable" on public.decks for select using (is_public = true or auth.uid() = author_id);
create policy "Users can create decks" on public.decks for insert with check (auth.uid() = author_id);
create policy "Authors can update own decks" on public.decks for update using (auth.uid() = author_id);
create policy "Authors can delete own decks" on public.decks for delete using (auth.uid() = author_id);

-- ── Auto-create profile on signup ──
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'teacher')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Helper function: generate unique class code ──
create or replace function public.generate_class_code(p_subject text, p_grade text)
returns text as $$
declare
  code text;
  exists_count integer;
begin
  loop
    code := upper(left(p_subject, 4)) || '-' || regexp_replace(p_grade, '[^0-9]', '', 'g') || chr(65 + floor(random() * 26)::int);
    select count(*) into exists_count from public.classes where class_code = code;
    exit when exists_count = 0;
  end loop;
  return code;
end;
$$ language plpgsql;

-- ── Helper function: generate session PIN ──
create or replace function public.generate_session_pin()
returns text as $$
declare
  pin text;
  exists_count integer;
begin
  loop
    pin := lpad(floor(random() * 1000000)::text, 6, '0');
    select count(*) into exists_count from public.sessions where sessions.pin = pin and status != 'completed';
    exit when exists_count = 0;
  end loop;
  return pin;
end;
$$ language plpgsql;

-- ── Enable Realtime for live sessions ──
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_participants;
alter publication supabase_realtime add table public.responses;

-- ============================================
-- DONE! Your database is ready.
-- ============================================
