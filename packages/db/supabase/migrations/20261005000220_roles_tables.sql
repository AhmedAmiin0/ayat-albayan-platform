-- Dynamic roles (owner, 2026-10-05), step 1: the role catalogue and its permissions.
--
-- CEILING: RLS stays keyed on the BASE role (profiles.role: admin|teacher|guardian|assistant|sales),
-- which also decides the app section. A custom role always has a base role; the fine-grained
-- permissions below (role_permissions.permission, catalogue in packages/shared/src/permissions.ts)
-- are enforced in the Nest API (AuthGuard + ROUTE_PERMISSIONS) and the web UI, never in RLS.
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name_ar text not null check (length(btrim(name_ar)) > 0),
  name_en text not null check (length(btrim(name_en)) > 0),
  base_role public.user_role not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission text not null check (permission = '*' or permission ~ '^[a-z_]+\.(view|manage)$'),
  primary key (role_id, permission)
);

drop trigger if exists roles_updated_at on public.roles;
create trigger roles_updated_at before update on public.roles
  for each row execute function public.set_updated_at();

-- System roles are the five base roles: they cannot be deleted, renamed by key, or re-based.
create or replace function public.roles_guard() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then raise exception 'system role % cannot be deleted', old.key; end if;
    return old;
  end if;
  if old.is_system and (new.key <> old.key or new.base_role <> old.base_role or not new.is_system) then
    raise exception 'system role % is immutable', old.key;
  end if;
  if new.base_role <> old.base_role and exists (select 1 from public.profiles where role_id = old.id) then
    raise exception 'role % still has users; its base role cannot change', old.key;
  end if;
  return new;
end $$;

drop trigger if exists roles_guard_trg on public.roles;
create trigger roles_guard_trg before update or delete on public.roles
  for each row execute function public.roles_guard();

-- The admin system role always keeps the wildcard.
create or replace function public.role_permissions_guard() returns trigger
  language plpgsql set search_path = '' as $$
declare
  r public.roles;
begin
  select * into r from public.roles where id = old.role_id;
  if found and r.key = 'admin' and old.permission = '*' then
    raise exception 'the admin role always keeps the * permission';
  end if;
  return old;
end $$;

drop trigger if exists role_permissions_guard_trg on public.role_permissions;
create trigger role_permissions_guard_trg before delete on public.role_permissions
  for each row execute function public.role_permissions_guard();
