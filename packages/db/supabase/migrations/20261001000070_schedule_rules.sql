-- Weekly schedule rules → lessons over a rolling horizon. R-SCH-02, R-SCH-06, issue B1.
-- byday: 0 = الأحد … 6 = السبت (same as teacher_availability.weekday). start_time_local is
-- wall-clock in `tz`; starts_on / ends_on are local calendar days in `tz`, inclusive.
-- ends_on null = open-ended (packages are counted by subscriptions, not by an end date: issue B5).
create type public.schedule_rule_status as enum ('active', 'paused', 'ended');

create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id),
  duration_min public.lesson_duration not null,
  start_time_local time not null,
  tz text not null,
  byday smallint[] not null
    check (cardinality(byday) >= 1 and byday <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  status public.schedule_rule_status not null default 'active',
  meeting_link text,
  package public.package_size,
  created_from_lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index schedule_rules_teacher_idx on public.schedule_rules (teacher_id, status);
create trigger schedule_rules_updated_at before update on public.schedule_rules
  for each row execute function public.set_updated_at();

-- Students on a rule (group lessons, R-STU-04).
create table public.schedule_rule_students (
  rule_id uuid not null references public.schedule_rules (id) on delete cascade,
  student_id uuid not null references public.students (id),
  created_at timestamptz not null default now(),
  primary key (rule_id, student_id)
);
create index schedule_rule_students_student_idx on public.schedule_rule_students (student_id);

-- Gender preference for the teacher filter in the booking wizard (R-SCH-06). null = no preference.
alter table public.students add column teacher_gender_pref public.gender;

-- RLS (rule 9): admin all; a teacher reads own rules and their students. Writes go through the API.
alter table public.schedule_rules enable row level security;
alter table public.schedule_rule_students enable row level security;

create policy schedule_rules_admin on public.schedule_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy schedule_rules_teacher_read on public.schedule_rules for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));

create policy schedule_rule_students_admin on public.schedule_rule_students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy schedule_rule_students_teacher_read on public.schedule_rule_students for select
  to authenticated
  using (rule_id in (select id from public.schedule_rules
                     where teacher_id = (select public.my_teacher_id())));
