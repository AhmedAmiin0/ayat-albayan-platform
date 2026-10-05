-- Dynamic roles, step 6: closes the self-escalation holes found in review. Idempotent.
--
-- The Nest API writes roles / role_permissions / profiles.role[_id] with the SERVICE ROLE (like
-- settings), so no client role needs to write them: drop the admin write policies of migration 223.
-- Before this, any admin-base user (even one with a limited role) could PATCH their own
-- profiles.role_id through PostgREST (profiles_admin_write) or edit role_permissions directly.
drop policy if exists roles_admin_write on public.roles;
drop policy if exists role_permissions_admin_write on public.role_permissions;

revoke all on public.roles, public.role_permissions, public.v_role_user_counts from anon;
revoke insert, update, delete, truncate on public.roles, public.role_permissions from authenticated;

-- True for a client session (PostgREST as anon / authenticated). Reads the JWT claim as well as
-- current_user, so a SECURITY DEFINER function a client calls does not hide it. SQL run by
-- postgres / migrations (no JWT claim) and the service role (claim service_role) is trusted.
create or replace function public.is_client_session() returns boolean
  language sql stable set search_path = '' as $$
  select coalesce(auth.role(), '') in ('authenticated', 'anon') or current_user in ('authenticated', 'anon')
$$;

-- Only a trusted caller may change a profile's base role or role: the access-token hook, the
-- JWT claim user_role and every RLS policy read profiles.role. Fires before profiles_sync_role_trg.
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

-- System roles: never created by a client session, never flipped between system and custom.
create or replace function public.roles_guard() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.is_system and public.is_client_session() then
      raise exception 'a system role cannot be created by a client' using errcode = '42501';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.is_system then raise exception 'system role % cannot be deleted', old.key; end if;
    return old;
  end if;
  if old.is_system <> new.is_system then
    raise exception 'role % cannot change between system and custom', old.key;
  end if;
  if old.is_system and (new.key <> old.key or new.base_role <> old.base_role) then
    raise exception 'system role % is immutable', old.key;
  end if;
  if new.base_role <> old.base_role and exists (select 1 from public.profiles where role_id = old.id) then
    raise exception 'role % still has users; its base role cannot change', old.key;
  end if;
  return new;
end $$;

drop trigger if exists roles_guard_trg on public.roles;
create trigger roles_guard_trg before insert or update or delete on public.roles
  for each row execute function public.roles_guard();

-- The wildcard belongs to the admin system role only, and the admin role always keeps it.
create or replace function public.role_permissions_guard() returns trigger
  language plpgsql set search_path = '' as $$
declare
  r public.roles;
begin
  if tg_op <> 'INSERT' then
    select * into r from public.roles where id = old.role_id;
    if found and r.key = 'admin' and r.is_system and old.permission = '*'
       and (tg_op = 'DELETE' or new.permission <> '*' or new.role_id <> old.role_id) then
      raise exception 'the admin role always keeps the * permission';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.permission = '*' then
    select * into r from public.roles where id = new.role_id;
    if not found or r.key <> 'admin' or not r.is_system then
      raise exception 'the * permission can only be granted to the admin system role';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists role_permissions_guard_trg on public.role_permissions;
create trigger role_permissions_guard_trg before insert or update or delete on public.role_permissions
  for each row execute function public.role_permissions_guard();

-- One transaction: a role's permission set becomes exactly `perms` (the API's single write path).
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
