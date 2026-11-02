-- Online status and last seen (owner 2026-10-30, «add last seen and online status»; docs/33).
--
-- 1. public.profile_presence: one row per platform user, last_seen_at in UTC. RLS on and NO policy: the
--    API (service role) is its only reader and writer, and it answers only callers allowed to see that
--    user (docs/33 §2).
-- 2. presence_touch(profiles[]): the API's batched, throttled write (each user at most once a minute
--    per process, flushed every 15 s in one call). The upsert's update fires only when the stored time
--    is over a minute old, so two API processes still write about once a minute per user.
-- 3. presence_enabled(): the «القيم» switch (registry default true; the seeder stores JSON null).
-- 4. presence_can_watch(target): the SQL twin of the API rule (maySeePresence, @ab/shared): oneself;
--    the admin; a teacher or assistant (sales) the family app users (guardian login, self-contact
--    student login) of a channel they may read (can_read_channel, migration 971); a family its
--    student's current teacher(s) of an open channel.
-- 5. presence_install(): Realtime Presence policies on realtime.messages (extension 'presence'), the
--    private topic 'presence:<profile id>': insert (track) only on one's own topic while the switch is
--    on; select (join, hear) when presence_can_watch. Skipped with a notice where Realtime is not
--    running (CI's e2e stack), as inbox_live_install (migration 860); run it again later.
-- Expand only. Idempotent. Writes no row.

create table if not exists public.profile_presence (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null
);
alter table public.profile_presence enable row level security;
revoke all on public.profile_presence from anon, authenticated;
grant select, insert, update on public.profile_presence to service_role;

create or replace function public.presence_touch(p_profiles uuid[]) returns void
  language sql volatile security definer set search_path = '' as $$
  insert into public.profile_presence as pp (profile_id, last_seen_at)
  select p.id, now() from public.profiles p where p.id = any (p_profiles)
  on conflict (profile_id) do update set last_seen_at = excluded.last_seen_at
    where pp.last_seen_at < excluded.last_seen_at - interval '1 minute'
$$;
revoke execute on function public.presence_touch(uuid[]) from public, anon, authenticated;
grant execute on function public.presence_touch(uuid[]) to service_role;

create or replace function public.presence_enabled() returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce((
    select s.value = 'true'::jsonb from public.settings s
     where s.key = 'presence_enabled' and jsonb_typeof(s.value) = 'boolean'
  ), true)
$$;
revoke execute on function public.presence_enabled() from public, anon;
grant execute on function public.presence_enabled() to authenticated, service_role;

create or replace function public.presence_can_watch(p_target uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select p_target is not null and (p_target = (select auth.uid())
    or public.is_admin()
    or (public.auth_role() in ('teacher', 'sales') and exists (
      select 1 from public.students s
        join public.student_channels c on c.student_id = s.id
       where (s.guardian_id in (select g.id from public.guardians g where g.profile_id = p_target)
              or (s.profile_id = p_target and s.contact_is_self))
         and public.can_read_channel(c.id)))
    or (public.auth_role() in ('guardian', 'student') and exists (
      select 1 from public.students s
        join public.student_channels c on c.student_id = s.id
        join public.teachers t on t.profile_id = p_target
       where s.id in (select public.portal_student_ids())
         and t.id in (select public.channel_teacher_ids(s.id))
         and public.can_read_channel(c.id))))
$$;
revoke execute on function public.presence_can_watch(uuid) from public, anon;
grant execute on function public.presence_can_watch(uuid) to authenticated, service_role;

-- 'presence:<uuid>' → the uuid; anything else → null (no policy matches it).
create or replace function public.presence_topic_profile(p_topic text) returns uuid
  language sql immutable set search_path = '' as $$
  select case when p_topic ~ '^presence:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substr(p_topic, 10)::uuid end
$$;
grant execute on function public.presence_topic_profile(text) to authenticated, service_role;

create or replace function public.presence_install() returns boolean
  language plpgsql security definer set search_path = '' as $$
begin
  if to_regclass('realtime.messages') is null then
    raise notice 'presence_install: no realtime.messages here (Realtime not running); run it again once it is';
    return false;
  end if;
  drop policy if exists presence_watch on realtime.messages;
  create policy presence_watch on realtime.messages for select to authenticated
    using (
      realtime.messages.extension = 'presence'
      and (select public.presence_enabled())
      and (select public.presence_can_watch(public.presence_topic_profile((select realtime.topic()))))
    );
  drop policy if exists presence_track on realtime.messages;
  create policy presence_track on realtime.messages for insert to authenticated
    with check (
      realtime.messages.extension = 'presence'
      and (select public.presence_enabled())
      and public.presence_topic_profile((select realtime.topic())) = (select auth.uid())
    );
  return true;
end $$;
revoke all on function public.presence_install() from public, anon, authenticated;

select public.presence_install();

-- MANUAL ROLLBACK (only after the code rollback):
--   drop policy if exists presence_watch on realtime.messages;
--   drop policy if exists presence_track on realtime.messages;
--   drop function if exists public.presence_install();
--   drop function if exists public.presence_topic_profile(text);
--   drop function if exists public.presence_can_watch(uuid);
--   drop function if exists public.presence_enabled();
--   drop function if exists public.presence_touch(uuid[]);
--   drop table if exists public.profile_presence;
