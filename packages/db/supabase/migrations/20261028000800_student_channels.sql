-- Student channel (docs/31 §2, owner 2026-10-27: «When the assistant registers a student it opens a chat
-- channel between teacher and student that is monitored by assistant and all authorized users»).
-- In-platform text messaging: one channel per student; participants = the student's own login, the
-- guardian's login and the student's CURRENT teacher(s); monitors (read-only) = the owning assistant and
-- anyone holding student_channels.monitor. The API (service role) is the only writer.
--
-- 1. Tables: student_channels (one per student), channel_messages (text, 1..2000), channel_reads (per
--    participant, for unread counts).
-- 2. A trigger opens the channel when a student is INSERTED (every registration path); one idempotent
--    insert…select opens it for the students that exist (new rows only, nothing else changes).
-- 3. merge_students re-points every FK to the kept student (migration 020): the merged student's messages
--    move to the kept channel and its own channel row goes with it.
-- 4. channel_teacher_ids(student): the current part of the teacher scope (teacher_student_ids, migration
--    165): the assigned teacher, or the teacher of an open lesson running now or starting within a day (a
--    substitute on the day; a lesson booked weeks ahead with another teacher grants nothing yet). A teacher
--    change moves the channel at once: the new teacher reads the whole history, the old one nothing.
-- 5. RLS (the second wall): participants and the owning assistant read; the admin reads; no client writes.
-- 6. student_channels.monitor: seeded for the system admin (the API grants it to admins anyway).
-- Idempotent.

create table if not exists public.student_channels (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.student_channels (id) on delete cascade,
  -- null once the sender's login is deleted (the message stays in the history).
  sender_profile_id uuid references public.profiles (id) on delete set null,
  sender_role text not null check (sender_role in ('teacher', 'guardian', 'student')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists channel_messages_channel_idx on public.channel_messages (channel_id, created_at desc);

create table if not exists public.channel_reads (
  channel_id uuid not null references public.student_channels (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, profile_id)
);

create or replace function public.open_student_channel() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.student_channels (student_id) values (new.id) on conflict (student_id) do nothing;
  return new;
end $$;
revoke execute on function public.open_student_channel() from public, anon, authenticated;
drop trigger if exists students_open_channel on public.students;
create trigger students_open_channel after insert on public.students
  for each row execute function public.open_student_channel();

insert into public.student_channels (student_id)
select s.id from public.students s
on conflict (student_id) do nothing;

create or replace function public.student_channels_keep_one() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  kept uuid;
begin
  if new.student_id <> old.student_id then
    select c.id into kept from public.student_channels c where c.student_id = new.student_id;
    if kept is not null then
      update public.channel_messages set channel_id = kept where channel_id = old.id;
      return null;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.student_channels_keep_one() from public, anon, authenticated;
drop trigger if exists student_channels_keep_one on public.student_channels;
create trigger student_channels_keep_one before update of student_id on public.student_channels
  for each row execute function public.student_channels_keep_one();

create or replace function public.channel_teacher_ids(p_student_id uuid) returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.teacher_id from public.students s where s.id = p_student_id and s.teacher_id is not null
  union
  select l.teacher_id from public.lessons l
    join public.lesson_students ls on ls.lesson_id = l.id
   where ls.student_id = p_student_id and l.status in ('scheduled', 'confirmed') and l.ends_at >= now()
     and l.starts_at < now() + interval '1 day' and l.teacher_id is not null
$$;
revoke execute on function public.channel_teacher_ids(uuid) from public, anon, authenticated;
grant execute on function public.channel_teacher_ids(uuid) to service_role;

-- The same rule the other way round: the students whose channel a teacher is in now (the teacher's list).
create or replace function public.teacher_channel_student_ids(p_teacher_id uuid) returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.id from public.students s where s.teacher_id = p_teacher_id
  union
  select ls.student_id from public.lessons l
    join public.lesson_students ls on ls.lesson_id = l.id
   where l.teacher_id = p_teacher_id and l.status in ('scheduled', 'confirmed') and l.ends_at >= now()
     and l.starts_at < now() + interval '1 day'
$$;
revoke execute on function public.teacher_channel_student_ids(uuid) from public, anon, authenticated;
grant execute on function public.teacher_channel_student_ids(uuid) to service_role;

-- Per channel of these students, for one participant: unread (messages of the other side, p_count_roles,
-- after their last read) and the last message. Service role (the API decided who may ask).
create or replace function public.channel_summaries(p_profile uuid, p_student_ids uuid[], p_count_roles text[])
  returns table (student_id uuid, channel_id uuid, unread int, last_body text, last_role text, last_at timestamptz)
  language sql stable security definer set search_path = '' as $$
  select c.student_id, c.id,
    (select count(*)::int from public.channel_messages m
      where m.channel_id = c.id and m.sender_profile_id is distinct from p_profile
        and m.sender_role = any(p_count_roles)
        and m.created_at > coalesce((select r.last_read_at from public.channel_reads r
                                      where r.channel_id = c.id and r.profile_id = p_profile), '-infinity')),
    l.body, l.sender_role, l.created_at
  from public.student_channels c
  left join lateral (select m.body, m.sender_role, m.created_at from public.channel_messages m
                      where m.channel_id = c.id order by m.created_at desc limit 1) l on true
  where c.student_id = any(p_student_ids)
$$;
revoke execute on function public.channel_summaries(uuid, uuid[], text[]) from public, anon, authenticated;
grant execute on function public.channel_summaries(uuid, uuid[], text[]) to service_role;

-- RLS helper: may the caller read this channel? (participant, owning assistant, admin)
create or replace function public.can_read_channel(p_channel uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_channels c
    where c.id = p_channel
      and (public.is_admin()
        or c.student_id in (select public.portal_student_ids())
        or (public.auth_role() = 'teacher'
            and public.my_teacher_id() in (select public.channel_teacher_ids(c.student_id)))
        or (public.auth_role() = 'sales' and c.student_id in (select public.my_sales_student_ids()))))
$$;
revoke execute on function public.can_read_channel(uuid) from public, anon;
grant execute on function public.can_read_channel(uuid) to authenticated, service_role;

alter table public.student_channels enable row level security;
alter table public.channel_messages enable row level security;
alter table public.channel_reads enable row level security;

drop policy if exists student_channels_read on public.student_channels;
create policy student_channels_read on public.student_channels for select to authenticated
  using (public.can_read_channel(id));
drop policy if exists channel_messages_read on public.channel_messages;
create policy channel_messages_read on public.channel_messages for select to authenticated
  using (public.can_read_channel(channel_id));
drop policy if exists channel_reads_own on public.channel_reads;
create policy channel_reads_own on public.channel_reads for select to authenticated
  using (profile_id = (select auth.uid()));

revoke all on public.student_channels, public.channel_messages, public.channel_reads from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.student_channels, public.channel_messages, public.channel_reads from authenticated;

insert into public.role_permissions (role_id, permission)
select r.id, 'student_channels.monitor' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;

-- MANUAL ROLLBACK (only after the code rollback): drop trigger students_open_channel on public.students;
--   drop table public.channel_reads, public.channel_messages, public.student_channels; drop functions
--   open_student_channel, student_channels_keep_one, channel_teacher_ids, teacher_channel_student_ids,
--   channel_summaries, can_read_channel;
--   delete from public.role_permissions where permission = 'student_channels.monitor'.
