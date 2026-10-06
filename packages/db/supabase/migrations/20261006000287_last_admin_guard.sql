-- The academy always keeps an active system admin (review of the users-control PR, M1). Idempotent.
--
-- The API checks "an active system admin remains" before a disable, delete or role change, but two
-- concurrent requests could each see the other admin still active and both succeed. This is the
-- backstop in the database: a DEFERRED constraint trigger that fires when a system admin profile
-- (role admin, role_id null = the system role) that was active is disabled, re-roled or deleted.
-- It runs at commit under one advisory lock: the second of two racing transactions waits for the
-- first to commit, then reads its result (READ COMMITTED: a new snapshot per statement) and fails.
-- An empty profiles table is allowed (the e2e reset deletes every login in one statement).
-- Error: P0001 'last_admin' (the API maps it to 409 last_admin; a GoTrue delete surfaces as a 500).
create or replace function public.profiles_guard_last_admin() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('ab:last-system-admin', 0));
  if exists (select 1 from public.profiles p where p.role = 'admin' and p.role_id is null and p.disabled_at is null)
    or not exists (select 1 from public.profiles) then
    return null;
  end if;
  raise exception 'last_admin' using errcode = 'P0001';
end $$;

revoke all on function public.profiles_guard_last_admin() from public, anon, authenticated;

drop trigger if exists profiles_last_admin_trg on public.profiles;
create constraint trigger profiles_last_admin_trg
  after update of role, role_id, disabled_at or delete on public.profiles
  deferrable initially deferred
  for each row
  when (old.role = 'admin' and old.role_id is null and old.disabled_at is null)
  execute function public.profiles_guard_last_admin();
