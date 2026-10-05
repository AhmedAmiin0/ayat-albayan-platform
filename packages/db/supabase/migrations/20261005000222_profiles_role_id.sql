-- Dynamic roles, step 3: profiles.role_id. profiles.role stays the BASE role (app section + RLS).
-- The trigger keeps the two consistent, so writers that set only `role` keep working:
--   insert: role_id null -> the system role of `role`; role_id set -> role := its base role.
--   update: role_id changed -> role := its base role; role changed alone -> the system role of it.
alter table public.profiles add column if not exists role_id uuid references public.roles (id);

create or replace function public.profiles_sync_role() returns trigger
  language plpgsql set search_path = '' as $$
declare
  base public.user_role;
begin
  if new.role_id is not null and (tg_op = 'INSERT' or new.role_id is distinct from old.role_id) then
    select base_role into base from public.roles where id = new.role_id;
    if base is null then raise exception 'unknown role_id %', new.role_id; end if;
    if tg_op = 'UPDATE' and new.role is distinct from old.role and new.role <> base then
      raise exception 'role % does not match the base role of role_id', new.role;
    end if;
    new.role := base;
  elsif new.role_id is null or (tg_op = 'UPDATE' and new.role is distinct from old.role) then
    select id into new.role_id from public.roles where key = new.role::text and is_system;
  end if;
  return new;
end $$;

drop trigger if exists profiles_sync_role_trg on public.profiles;
create trigger profiles_sync_role_trg before insert or update of role, role_id on public.profiles
  for each row execute function public.profiles_sync_role();

-- Backfill: every profile gets the system role of its current role (fires the trigger).
update public.profiles p set role_id = r.id
from public.roles r
where r.key = p.role::text and r.is_system and p.role_id is null;

create index if not exists profiles_role_id_idx on public.profiles (role_id);

-- Consistency check (a trigger cannot be a constraint across tables): fails the migration run
-- if any profile's role disagrees with its role's base role.
do $$
begin
  if exists (select 1 from public.profiles p join public.roles r on r.id = p.role_id where r.base_role <> p.role) then
    raise exception 'profiles.role and roles.base_role disagree';
  end if;
end $$;
