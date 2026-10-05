-- Dynamic roles, step 4: RLS. Admin writes; every authenticated user reads their own role (and its
-- permissions). Fine-grained permissions are NOT enforced here (see the ceiling in migration 220).
create or replace function public.my_role_id() returns uuid
  language sql stable security definer set search_path = '' as $$
  select role_id from public.profiles where id = auth.uid()
$$;

alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated
  using (public.is_admin() or id = public.my_role_id());
drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write on public.roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions for select to authenticated
  using (public.is_admin() or role_id = public.my_role_id());
drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- The access-token hook still reads profiles.role (the base role): the JWT claim is unchanged.
