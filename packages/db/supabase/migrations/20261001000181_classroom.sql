-- Online classrooms (LiveKit), step 2. The room of a lesson is named lesson-<lesson id> (derived,
-- nothing to store). Two new tables, the API (service role) being their only writer:
--   student_assistants: which teaching assistant (profiles.role = 'assistant') follows which student;
--   lesson_join_links: one-lesson guest links for the family. Only the sha256 of the token is kept.
create table public.student_assistants (
  student_id uuid not null references public.students (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, profile_id)
);
create index student_assistants_profile_idx on public.student_assistants (profile_id);

create function public.student_assistants_check() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = new.profile_id and role = 'assistant') then
    raise exception 'profile % is not a teaching assistant', new.profile_id using errcode = '23514';
  end if;
  return new;
end $$;
create trigger student_assistants_check before insert or update on public.student_assistants
  for each row execute function public.student_assistants_check();

create table public.lesson_join_links (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  -- sha256 (hex) of the token; the token itself only travels in the WhatsApp button.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lesson_join_links_lesson_idx on public.lesson_join_links (lesson_id);

-- RLS helpers (security definer, like my_student_ids: no policy recursion).
create function public.my_assisted_student_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select student_id from public.student_assistants where profile_id = auth.uid()
$$;

create function public.is_my_assisted_lesson(p_lesson uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_students
                 where lesson_id = p_lesson and student_id in (select public.my_assisted_student_ids()))
$$;

alter table public.student_assistants enable row level security;
create policy student_assistants_admin on public.student_assistants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy student_assistants_own_read on public.student_assistants for select to authenticated
  using (profile_id = (select auth.uid()));
revoke all on public.student_assistants from anon;

-- An assistant reads only the lessons of their assigned students (and nothing else of the lesson
-- tables): no write policy, the API writes.
create policy lessons_assistant_read on public.lessons for select to authenticated
  using (public.is_my_assisted_lesson(id));
create policy lesson_students_assistant_read on public.lesson_students for select to authenticated
  using (student_id in (select public.my_assisted_student_ids()));

-- Join links: the admin may read the rows (never the hash); nobody else, and no client writes.
alter table public.lesson_join_links enable row level security;
create policy lesson_join_links_admin_read on public.lesson_join_links for select to authenticated
  using (public.is_admin());
revoke all on public.lesson_join_links from anon;
revoke all on public.lesson_join_links from authenticated;
grant select (id, lesson_id, expires_at, revoked_at, created_by, created_at)
  on public.lesson_join_links to authenticated;
