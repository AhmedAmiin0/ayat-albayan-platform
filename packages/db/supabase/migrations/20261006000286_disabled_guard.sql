-- Disabled logins, review of the users-control PR (H1). Idempotent.
--
-- 1. profiles.disabled_at / disabled_by / disabled_reason (migration 282) were writable by any
--    admin-base client session (policy profiles_admin_update + is_admin()): a disabled admin with a
--    still-valid JWT could clear them, and a custom admin role with no grants could disable the
--    system admin. Only the API (service role) writes them: the guard of migration 225 now covers
--    them too, and the trigger also fires when one of them is in the SET list.
-- 2. auth_role() answers null for a disabled profile, so is_admin() is false and every policy built on
--    it (PostgREST, Storage, Realtime) refuses a disabled admin at once, not when the JWT expires.
--    Callers: is_admin() only (the access-token hook reads profiles itself; the service role bypasses
--    RLS). A disabled user can still read their OWN profile row (profiles_self_read: id = auth.uid()).
create or replace function public.profiles_guard_role() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if public.is_client_session() then
    if tg_op = 'INSERT' then
      raise exception 'profiles can only be created by the API' using errcode = '42501';
    end if;
    if new.role is distinct from old.role or new.role_id is distinct from old.role_id then
      raise exception 'profiles.role and profiles.role_id can only be changed by the API' using errcode = '42501';
    end if;
    if new.disabled_at is distinct from old.disabled_at
      or new.disabled_by is distinct from old.disabled_by
      or new.disabled_reason is distinct from old.disabled_reason then
      raise exception 'profiles.disabled_* can only be changed by the API' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role_trg on public.profiles;
create trigger profiles_guard_role_trg
  before insert or update of role, role_id, disabled_at, disabled_by, disabled_reason on public.profiles
  for each row execute function public.profiles_guard_role();

create or replace function public.auth_role() returns public.user_role
  language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and disabled_at is null
$$;
