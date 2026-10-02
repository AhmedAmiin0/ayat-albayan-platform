-- Lessons (one row per occurrence) and their students. R-SCH-02, R-SCH-03, R-SCH-07, R-LES-01..03.
-- unique (rule_id, starts_at) makes occurrence generation idempotent (rule 8, issue B1): the
-- generator inserts with `on conflict do nothing` and never overwrites a row, so a cancelled or
-- rescheduled occurrence is what stops that slot from being generated again.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.schedule_rules (id),
  teacher_id uuid not null references public.teachers (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.lesson_status not null default 'scheduled',
  meeting_link text,
  cancel_reason text,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id),
  google_event_id text,
  -- Set when an admin booked/moved this lesson over a conflict (R-SCH-04).
  override_reason text,
  rescheduled_from_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  unique (rule_id, starts_at),
  check (ends_at > starts_at)
);
create index lessons_teacher_time_idx on public.lessons (teacher_id, starts_at);
create index lessons_time_idx on public.lessons (starts_at);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- chargeable: does this lesson consume the student's package (R-SCH-07, @ab/shared isChargeable).
create table public.lesson_students (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.students (id),
  attendance public.attendance,
  chargeable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lesson_id, student_id)
);
create index lesson_students_student_idx on public.lesson_students (student_id);
create trigger lesson_students_updated_at before update on public.lesson_students
  for each row execute function public.set_updated_at();

-- Lesson number per student, computed, never typed (R-LES-03, issue A5).
-- TODO(R-LES-03): docs say "completed lessons"; owner to confirm whether `late` also counts.
create view public.v_lesson_sequence with (security_invoker = true) as
  select ls.lesson_id, ls.student_id, l.starts_at,
         row_number() over (partition by ls.student_id order by l.starts_at, l.id) as seq
  from public.lesson_students ls
  join public.lessons l on l.id = ls.lesson_id
  where l.status = 'completed';

-- RLS helpers. security definer so lessons ↔ lesson_students policies never recurse.
create function public.my_student_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.id from public.students s
  join public.guardians g on g.id = s.guardian_id
  where g.profile_id = auth.uid()
$$;

create function public.is_my_lesson(p_lesson uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lessons
                 where id = p_lesson and teacher_id = public.my_teacher_id())
$$;

create function public.is_my_child_lesson(p_lesson uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_students
                 where lesson_id = p_lesson and student_id in (select public.my_student_ids()))
$$;

-- RLS (rule 9): admin all; teacher reads/updates own lessons and their students; guardian reads
-- own children's lessons. The API (service role) is the real writer and enforces the same rules.
alter table public.lessons enable row level security;
alter table public.lesson_students enable row level security;

create policy lessons_admin on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lessons_teacher_read on public.lessons for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));
create policy lessons_teacher_update on public.lessons for update to authenticated
  using (teacher_id = (select public.my_teacher_id()))
  with check (teacher_id = (select public.my_teacher_id()));
create policy lessons_guardian_read on public.lessons for select to authenticated
  using (public.is_my_child_lesson(id));

create policy lesson_students_admin on public.lesson_students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy lesson_students_teacher_read on public.lesson_students for select to authenticated
  using (public.is_my_lesson(lesson_id));
create policy lesson_students_teacher_update on public.lesson_students for update to authenticated
  using (public.is_my_lesson(lesson_id)) with check (public.is_my_lesson(lesson_id));
create policy lesson_students_guardian_read on public.lesson_students for select to authenticated
  using (student_id in (select public.my_student_ids()));
