-- Notifications only to authenticated, authorized people (owner 2026-10-25; R-MOB-01, R-NOT-01/02).
--
-- 1. push_device_sessions: each app push token is bound to the auth session that registered it
--    (PUT /me/push-tokens). The session's end (sign-out, revoke, «sign out everywhere», an admin's
--    password reset) deletes the binding by cascade, and the token leaves profiles.push_tokens
--    (trigger), even when the app's own DELETE timed out. The API sends only to bound tokens of a
--    live session (push_live_sessions).
-- 2. web_push_subscriptions.session_id: the same for a browser (PUT /me/web-push). Null on rows
--    made before this migration: the API skips them until the browser re-binds on its next load.
-- 3. profiles.push_tokens written by the API (service role) only: an admin's table-wide UPDATE on
--    profiles could otherwise put their own device on another person's profile.
-- 4. A disabled profile, or one whose role changes, loses every token and browser at once.
-- 5. push_live_sessions / revoke_other_user_sessions: service role only.
--
-- Idempotent: safe to run twice. Expand-only: the previous API ignores the new table and column.

set local lock_timeout = '5s';

create table if not exists public.push_device_sessions (
  token text primary key check (char_length(token) <= 200),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references auth.sessions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists push_device_sessions_profile_idx on public.push_device_sessions (profile_id);
create index if not exists push_device_sessions_session_idx on public.push_device_sessions (session_id);

-- RLS (rule 9): a user reads only their own devices; only the API (service role) writes.
alter table public.push_device_sessions enable row level security;
revoke all on public.push_device_sessions from anon;
revoke insert, update, delete, truncate, references, trigger on public.push_device_sessions
  from authenticated;
drop policy if exists push_device_sessions_own_read on public.push_device_sessions;
create policy push_device_sessions_own_read on public.push_device_sessions for select to authenticated
  using (profile_id = (select auth.uid()));

alter table public.web_push_subscriptions
  add column if not exists session_id uuid references auth.sessions (id) on delete cascade;
create index if not exists web_push_subscriptions_session_idx on public.web_push_subscriptions (session_id);

-- A binding gone (its session ended) or moved to another profile: the token leaves the old profile.
create or replace function public.push_device_sessions_release() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.profile_id = new.profile_id then return null; end if;
  update public.profiles set push_tokens = array_remove(push_tokens, old.token)
    where id = old.profile_id and old.token = any (push_tokens);
  return null;
end $$;

drop trigger if exists push_device_sessions_release_trg on public.push_device_sessions;
create trigger push_device_sessions_release_trg after delete or update of profile_id
  on public.push_device_sessions for each row execute function public.push_device_sessions_release();

-- Not security definer on purpose: current_user is the caller (PostgREST's authenticated / anon).
create or replace function public.profiles_guard_push_tokens() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.push_tokens is distinct from old.push_tokens and current_user in ('authenticated', 'anon') then
    raise exception 'push_tokens_api_only' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_push_tokens_trg on public.profiles;
create trigger profiles_guard_push_tokens_trg before update of push_tokens on public.profiles
  for each row execute function public.profiles_guard_push_tokens();

-- Disabled, or another role: no device of theirs hears anything until it registers again.
create or replace function public.profiles_revoke_push() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if (new.disabled_at is not null and old.disabled_at is null)
     or new.role is distinct from old.role or new.role_id is distinct from old.role_id then
    delete from public.web_push_subscriptions where profile_id = new.id;
    delete from public.push_device_sessions where profile_id = new.id;
    update public.profiles set push_tokens = '{}' where id = new.id and push_tokens <> '{}';
  end if;
  return null;
end $$;

drop trigger if exists profiles_revoke_push_trg on public.profiles;
create trigger profiles_revoke_push_trg after update of disabled_at, role, role_id on public.profiles
  for each row execute function public.profiles_revoke_push();

-- The given sessions still live: not ended, not past not_after, user neither banned nor deleted.
create or replace function public.push_live_sessions(p_ids uuid[]) returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.id from auth.sessions s join auth.users u on u.id = s.user_id
  where s.id = any (p_ids)
    and (s.not_after is null or s.not_after > now())
    and (u.banned_until is null or u.banned_until <= now())
    and u.deleted_at is null;
$$;

-- A password change: every other session of the user ends (and its devices' bindings with it).
create or replace function public.revoke_other_user_sessions(p_user uuid, p_keep uuid) returns integer
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from auth.sessions where user_id = p_user and id is distinct from p_keep;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.push_device_sessions_release() from public, anon, authenticated;
revoke all on function public.profiles_revoke_push() from public, anon, authenticated;
revoke all on function public.push_live_sessions(uuid[]) from public, anon, authenticated;
revoke all on function public.revoke_other_user_sessions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.push_live_sessions(uuid[]) to service_role;
grant execute on function public.revoke_other_user_sessions(uuid, uuid) to service_role;

-- MANUAL ROLLBACK (only after the code rollback):
--   drop trigger profiles_revoke_push_trg on public.profiles; drop function public.profiles_revoke_push();
--   drop trigger profiles_guard_push_tokens_trg on public.profiles; drop function public.profiles_guard_push_tokens();
--   drop function public.push_live_sessions(uuid[]); drop function public.revoke_other_user_sessions(uuid, uuid);
--   drop table public.push_device_sessions; drop function public.push_device_sessions_release();
--   alter table public.web_push_subscriptions drop column session_id;
