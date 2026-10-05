-- Dynamic roles, hardening (review). Idempotent.
--
-- 1. profiles_admin_write (migration 0002) lets ANY admin-base user update ANY profile through
--    PostgREST, including their own role_id: a limited custom role could move itself to the system
--    admin role. The Nest API writes profiles.role / role_id with the SERVICE ROLE, so a client
--    session (anon / authenticated) never needs to change them: refuse it here, whatever the policy.
--    The same hole existed through INSERT and DELETE (delete a profile, insert it back as an admin
--    holding the system admin role): a client session may only UPDATE other profile fields. Profiles
--    are created and deleted by the API / scripts with the service role.
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
  if public.is_client_session() then
    if tg_op = 'INSERT' then
      raise exception 'profiles can only be created by the API' using errcode = '42501';
    end if;
    if new.role is distinct from old.role or new.role_id is distinct from old.role_id then
      raise exception 'profiles.role and profiles.role_id can only be changed by the API' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role_trg on public.profiles;
create trigger profiles_guard_role_trg before insert or update of role, role_id on public.profiles
  for each row execute function public.profiles_guard_role();

-- Update-only for an admin (select stays with profiles_self_read); no client INSERT / DELETE at all.
drop policy if exists profiles_admin_write on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.profiles from authenticated, anon;

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
