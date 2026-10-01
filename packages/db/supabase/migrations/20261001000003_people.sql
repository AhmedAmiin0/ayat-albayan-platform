-- teachers, guardians, students. R-TCH-01, R-STU-01, R-STU-02, R-STU-04, R-STU-05.
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  display_name_ar text not null,
  display_name_en text,
  gender public.gender not null,
  programs public.program[] not null default '{quran}',
  phone_e164 public.e164 unique,
  meeting_link text,
  rate_30 int, rate_45 int, rate_60 int, rate_90 int,
  max_students int,
  status public.teacher_status not null default 'active',
  tz text not null default 'Africa/Cairo',
  google_calendar_id text,
  mirror_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  phone_e164 public.e164 not null unique,
  country text,
  tz text not null default 'Asia/Riyadh',
  source public.lead_source,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

-- code is generated, never typed (rule 7). Identity starts after legacy AB-0001..AB-0182;
-- tools/migrate inserts legacy numbers with OVERRIDING SYSTEM VALUE so old codes survive.
create table public.students (
  id uuid primary key default gen_random_uuid(),
  code_seq bigint generated always as identity (start with 183) unique,
  code text generated always as
    ('AB-' || lpad(code_seq::text, greatest(4, length(code_seq::text)), '0')) stored unique,
  guardian_id uuid not null references public.guardians (id),
  name text not null,
  name_normalized text not null,
  age smallint check (age between 3 and 99),
  gender public.gender,
  program public.program not null default 'quran',
  level text, memorized text, goal text, riwaya text,
  tz text not null default 'Asia/Riyadh',
  status public.student_status not null default 'trial',
  teacher_id uuid references public.teachers (id),
  meeting_link_override text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index students_guardian_idx on public.students (guardian_id);
create index students_teacher_idx on public.students (teacher_id);
create index students_name_norm_idx on public.students (name_normalized);

create trigger teachers_updated_at before update on public.teachers
  for each row execute function public.set_updated_at();
create trigger guardians_updated_at before update on public.guardians
  for each row execute function public.set_updated_at();
create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admin all; teacher own row + own students; guardian own row + own students.
alter table public.teachers enable row level security;
alter table public.guardians enable row level security;
alter table public.students enable row level security;

create policy teachers_admin on public.teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teachers_self_read on public.teachers for select to authenticated
  using (profile_id = (select auth.uid()));

create policy guardians_admin on public.guardians for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy guardians_self_read on public.guardians for select to authenticated
  using (profile_id = (select auth.uid()));

create policy students_admin on public.students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy students_teacher_read on public.students for select to authenticated
  using (teacher_id in (select id from public.teachers where profile_id = (select auth.uid())));
create policy students_guardian_read on public.students for select to authenticated
  using (guardian_id in (select id from public.guardians where profile_id = (select auth.uid())));
