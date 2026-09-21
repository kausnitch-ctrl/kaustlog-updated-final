-- kaustlog final schema
-- Run this in Supabase SQL Editor.

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists problems (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  problem_number text not null,
  sort_order integer not null default 0
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid references problems(id) on delete cascade,
  result text not null check (result in ('correct', 'partial', 'wrong')),
  duration_seconds integer not null default 0,
  attempted_at timestamptz not null default now()
);

alter table attempts add column if not exists book_id text;
alter table attempts add column if not exists unit_id text;
alter table attempts add column if not exists problem_number text;
alter table attempts alter column problem_id drop not null;

create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  reflection_date date not null default current_date,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  task_date date not null default current_date,
  content text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- The app calculates study time from attempts.duration_seconds.
-- study_sessions can remain unused if it already exists.

-- kaustlog complete features
alter table attempts add column if not exists partial_mistake text;
alter table attempts add column if not exists memo text;

create table if not exists problem_notes (id uuid primary key default gen_random_uuid(), book_id text not null, unit_id text not null, problem_number text not null, content text not null default '', updated_at timestamptz not null default now(), unique(book_id,unit_id,problem_number));
create table if not exists review_schedules (id uuid primary key default gen_random_uuid(), attempt_id uuid references attempts(id) on delete set null, book_id text not null, unit_id text not null, problem_number text not null, review_type text not null check (review_type in ('needed','wrong','partial')), review_round integer not null default 1, scheduled_date date not null, completed boolean not null default false, completed_at timestamptz, stage text not null default 'day1', created_at timestamptz not null default now());
create table if not exists goals (id uuid primary key default gen_random_uuid(), title text not null, goal_type text not null default 'count', target_value numeric not null default 0, unit text not null default '問', start_date date not null default current_date, deadline date not null, book_id text, subject text, created_at timestamptz not null default now());
create table if not exists exams (id uuid primary key default gen_random_uuid(), name text not null, exam_type text not null default 'その他', exam_date date not null, scope text, goal text, memo text, created_at timestamptz not null default now());
create table if not exists exam_results (id uuid primary key default gen_random_uuid(), exam_id uuid not null references exams(id) on delete cascade, subject text not null, score numeric, max_score numeric, rank integer, deviation numeric, judgment text, memo text, created_at timestamptz not null default now());
alter table daily_tasks add column if not exists target_count integer;
alter table daily_tasks add column if not exists actual_count integer;
alter table daily_tasks add column if not exists unit text;
alter table daily_tasks add column if not exists goal_id uuid;

alter table problem_notes enable row level security; alter table review_schedules enable row level security; alter table goals enable row level security; alter table exams enable row level security; alter table exam_results enable row level security;

drop policy if exists problem_notes_select on problem_notes; drop policy if exists problem_notes_insert on problem_notes; drop policy if exists problem_notes_update on problem_notes; drop policy if exists problem_notes_delete on problem_notes;
drop policy if exists review_schedules_select on review_schedules; drop policy if exists review_schedules_insert on review_schedules; drop policy if exists review_schedules_update on review_schedules; drop policy if exists review_schedules_delete on review_schedules;
drop policy if exists goals_select on goals; drop policy if exists goals_insert on goals; drop policy if exists goals_update on goals; drop policy if exists goals_delete on goals;
drop policy if exists exams_select on exams; drop policy if exists exams_insert on exams; drop policy if exists exams_update on exams; drop policy if exists exams_delete on exams;
drop policy if exists exam_results_select on exam_results; drop policy if exists exam_results_insert on exam_results; drop policy if exists exam_results_update on exam_results; drop policy if exists exam_results_delete on exam_results;
create policy problem_notes_select on problem_notes for select using (true); create policy problem_notes_insert on problem_notes for insert with check (true); create policy problem_notes_update on problem_notes for update using (true); create policy problem_notes_delete on problem_notes for delete using (true);
create policy review_schedules_select on review_schedules for select using (true); create policy review_schedules_insert on review_schedules for insert with check (true); create policy review_schedules_update on review_schedules for update using (true); create policy review_schedules_delete on review_schedules for delete using (true);
create policy goals_select on goals for select using (true); create policy goals_insert on goals for insert with check (true); create policy goals_update on goals for update using (true); create policy goals_delete on goals for delete using (true);
create policy exams_select on exams for select using (true); create policy exams_insert on exams for insert with check (true); create policy exams_update on exams for update using (true); create policy exams_delete on exams for delete using (true);
create policy exam_results_select on exam_results for select using (true); create policy exam_results_insert on exam_results for insert with check (true); create policy exam_results_update on exam_results for update using (true); create policy exam_results_delete on exam_results for delete using (true);

alter table attempts enable row level security;
drop policy if exists attempts_select on attempts;
drop policy if exists attempts_insert on attempts;
drop policy if exists attempts_update on attempts;
drop policy if exists attempts_delete on attempts;
create policy attempts_select on attempts for select using (true);
create policy attempts_insert on attempts for insert with check (true);
create policy attempts_update on attempts for update using (true);
create policy attempts_delete on attempts for delete using (true);


-- 教科ごとの間違い・注意点
create table if not exists subject_mistakes (id uuid primary key default gen_random_uuid(), subject text not null, content text not null, created_at timestamptz not null default now());
alter table subject_mistakes enable row level security;
drop policy if exists subject_mistakes_select on subject_mistakes;
drop policy if exists subject_mistakes_insert on subject_mistakes;
drop policy if exists subject_mistakes_update on subject_mistakes;
drop policy if exists subject_mistakes_delete on subject_mistakes;
create policy subject_mistakes_select on subject_mistakes for select using (true);
create policy subject_mistakes_insert on subject_mistakes for insert with check (true);
create policy subject_mistakes_update on subject_mistakes for update using (true) with check (true);
create policy subject_mistakes_delete on subject_mistakes for delete using (true);
