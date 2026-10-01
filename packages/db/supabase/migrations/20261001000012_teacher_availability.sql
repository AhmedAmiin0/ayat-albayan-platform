-- Weekly availability grid + one-off unavailability. R-TCH-02.
-- weekday: 0 = الأحد … 6 = السبت (docs/06). Times are wall-clock in `tz`; time_off is UTC.
create table public.teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  tz text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  check (start_time < end_time)
);
create index teacher_availability_teacher_idx on public.teacher_availability (teacher_id, weekday);

create table public.teacher_time_off (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  check (starts_at < ends_at)
);
create index teacher_time_off_teacher_idx on public.teacher_time_off (teacher_id, starts_at);

create trigger teacher_availability_updated_at before update on public.teacher_availability
  for each row execute function public.set_updated_at();
create trigger teacher_time_off_updated_at before update on public.teacher_time_off
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admin all; teacher reads/writes own rows.
create function public.my_teacher_id() returns uuid
  language sql stable security definer set search_path = '' as $$
  select id from public.teachers where profile_id = auth.uid()
$$;

alter table public.teacher_availability enable row level security;
alter table public.teacher_time_off enable row level security;

create policy teacher_availability_admin on public.teacher_availability for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_availability_self on public.teacher_availability for all to authenticated
  using (teacher_id = (select public.my_teacher_id()))
  with check (teacher_id = (select public.my_teacher_id()));

create policy teacher_time_off_admin on public.teacher_time_off for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_time_off_self on public.teacher_time_off for all to authenticated
  using (teacher_id = (select public.my_teacher_id()))
  with check (teacher_id = (select public.my_teacher_id()));
