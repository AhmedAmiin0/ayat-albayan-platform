-- Dynamic roles, hardening (review). Idempotent.
--
-- 1. profiles_admin_write (migration 0002) lets ANY admin-base user update ANY profile through
--    PostgREST, including their own role_id: a limited custom role could move itself to the system
--    admin role. The Nest API writes profiles.role / role_id with the SERVICE ROLE, so a client
--    session (anon / authenticated) never needs to change them: refuse it here, whatever the policy.
-- 2. A role's permission set is replaced in ONE transaction (the API's only write path).

-- True for a client session (PostgREST as anon / authenticated). Reads the JWT claim as well as
-- current_user, so a SECURITY DEFINER function a client calls does not hide it. SQL run by
-- postgres / migrations (no JWT claim) and the service role (claim service_role) is trusted.
create or replace function public.is_client_session() returns boolean
  language sql stable set search_path = '' as $$
  select coalesce(auth.role(), '') in ('authenticated', 'anon') or current_user in ('authenticated', 'anon')
$$;

create or replace function public.profiles_guard_role() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.role_id is distinct from old.role_id)
     and public.is_client_session() then
    raise exception 'profiles.role and profiles.role_id can only be changed by the API' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role_trg on public.profiles;
create trigger profiles_guard_role_trg before update of role, role_id on public.profiles
  for each row execute function public.profiles_guard_role();

create or replace function public.set_role_permissions(role_id uuid, perms text[]) returns void
  language plpgsql set search_path = '' as $$
begin
  delete from public.role_permissions rp
  where rp.role_id = set_role_permissions.role_id and rp.permission <> all (coalesce(perms, '{}'));
  insert into public.role_permissions (role_id, permission)
  select set_role_permissions.role_id, p from unnest(coalesce(perms, '{}')) as p
  on conflict do nothing;
end $$;

revoke all on function public.set_role_permissions(uuid, text[]) from public, anon, authenticated;
grant execute on function public.set_role_permissions(uuid, text[]) to service_role;
