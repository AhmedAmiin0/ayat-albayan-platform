-- «إيقاف الدورة مؤقتًا» (owner 2026-10-28, «Also add option to pause the course»; docs/11 §7b, docs/16 row 37c).
-- Before this a pause only labelled the package: lessons kept being generated and nothing moved. Now a pause
-- is a row here, written only by the RPCs of migration 956 (one transaction each), called by the API.
--
-- course_pauses: one per pause of a student's course. from_date / until_date are Riyadh dates (the business
--   days); until_date null = until «استئناف». rule_ids: the rules it paused (the student is their only
--   student); shared_rule_ids: group rules kept active for the others, whose generation skips this student
--   while the pause covers the day (migration 957). started_at: when the rules, the package and the student were
--   paused (at once for a pause from today; on its from day, by the hourly job, for a later one). Before-statuses
--   (read then) restore on resume. extended_days: the
--   Riyadh days the package's and the rules' dates moved forward, written once on resume (null while open).
--   One open pause (resumed_at null) per student: unique partial index.
-- course_pause_lessons: each lesson the pause took the student out of. 'cancelled' (the student was alone:
--   cancelled_by_admin, reason «إيقاف مؤقت», not chargeable) or 'left' (a group lesson: only the student's
--   lesson_students row is removed, the lesson stays for the others); chargeable_before restores it.
-- RLS: admins read everything; sales (the assistant) read only; every write through the API (service role).
-- Idempotent and expand-only. Rollback: drop table public.course_pause_lessons, public.course_pauses.
set local lock_timeout = '5s';

create table if not exists public.course_pauses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  rule_ids uuid[] not null default '{}',
  shared_rule_ids uuid[] not null default '{}',
  from_date date not null,
  until_date date,
  reason text check (reason is null or char_length(reason) between 1 and 300),
  subscription_status_before public.subscription_status,
  student_status_before public.student_status not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  resumed_at timestamptz,
  resumed_by uuid references public.profiles (id) on delete set null,
  extended_days int check (extended_days is null or extended_days >= 0),
  constraint course_pauses_range check (until_date is null or until_date >= from_date),
  constraint course_pauses_resumed check ((resumed_at is null) = (extended_days is null))
);
create unique index if not exists course_pauses_one_open on public.course_pauses (student_id) where resumed_at is null;
create index if not exists course_pauses_student_idx on public.course_pauses (student_id, created_at desc);
create index if not exists course_pauses_subscription_idx on public.course_pauses (subscription_id);
create index if not exists course_pauses_due_idx on public.course_pauses (until_date) where resumed_at is null;
create index if not exists course_pauses_start_idx on public.course_pauses (from_date) where started_at is null and resumed_at is null;
comment on table public.course_pauses is
  'Course pauses (docs/11 §7b): Riyadh from/until dates, the rules paused, before-statuses, days the dates moved on resume.';

create table if not exists public.course_pause_lessons (
  pause_id uuid not null references public.course_pauses (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind text not null check (kind in ('cancelled', 'left')),
  chargeable_before boolean not null,
  primary key (pause_id, lesson_id)
);
create index if not exists course_pause_lessons_lesson_idx on public.course_pause_lessons (lesson_id);
comment on table public.course_pause_lessons is
  'Lessons a course pause cancelled (student alone) or left (group lesson), with the chargeable flag to restore.';

alter table public.course_pauses enable row level security;
alter table public.course_pause_lessons enable row level security;
revoke all on public.course_pauses, public.course_pause_lessons from anon;
revoke insert, update, delete, truncate, references, trigger on public.course_pauses, public.course_pause_lessons from authenticated;

drop policy if exists course_pauses_admin_read on public.course_pauses;
create policy course_pauses_admin_read on public.course_pauses for select to authenticated
  using ((select public.is_admin()));
drop policy if exists course_pauses_sales_read on public.course_pauses;
create policy course_pauses_sales_read on public.course_pauses for select to authenticated
  using ((select public.auth_role()) = 'sales');
drop policy if exists course_pause_lessons_admin_read on public.course_pause_lessons;
create policy course_pause_lessons_admin_read on public.course_pause_lessons for select to authenticated
  using ((select public.is_admin()));
drop policy if exists course_pause_lessons_sales_read on public.course_pause_lessons;
create policy course_pause_lessons_sales_read on public.course_pause_lessons for select to authenticated
  using ((select public.auth_role()) = 'sales');
