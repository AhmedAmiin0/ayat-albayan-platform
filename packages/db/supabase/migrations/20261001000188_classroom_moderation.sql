-- Online classrooms, step 3: moderation («إخراج من الحلقة»). The API (service role) is the only
-- writer of both tables; the admin may read them.
--   classroom_participants: one row per successful join (staff login or guest link), keyed by the
--     LiveKit identity minted for it, so a removal can find whom an identity belongs to;
--   classroom_blocks: who was removed from a lesson's room. A blocked principal (a staff login or
--     a guest link) is refused 403 removed_from_room on every later join of that lesson.
create table public.classroom_participants (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  identity text not null unique check (length(identity) between 1 and 64),
  role text not null check (role in ('teacher', 'admin', 'assistant', 'sales', 'guest')),
  user_id uuid references public.profiles (id) on delete set null,
  join_link_id uuid references public.lesson_join_links (id) on delete set null,
  name text not null check (length(name) <= 60),
  joined_at timestamptz not null default now()
);
create index classroom_participants_lesson_idx on public.classroom_participants (lesson_id);

create table public.classroom_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  join_link_id uuid references public.lesson_join_links (id) on delete cascade,
  blocked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Exactly one principal: a login or a guest link.
  check ((user_id is null) <> (join_link_id is null))
);
-- One block per lesson and principal (the API inserts with on conflict do nothing).
create unique index classroom_blocks_user_uidx on public.classroom_blocks (lesson_id, user_id)
  where user_id is not null;
create unique index classroom_blocks_link_uidx on public.classroom_blocks (lesson_id, join_link_id)
  where join_link_id is not null;

alter table public.classroom_participants enable row level security;
create policy classroom_participants_admin_read on public.classroom_participants for select
  to authenticated using (public.is_admin());
revoke all on public.classroom_participants from anon;

alter table public.classroom_blocks enable row level security;
create policy classroom_blocks_admin_read on public.classroom_blocks for select
  to authenticated using (public.is_admin());
revoke all on public.classroom_blocks from anon;
