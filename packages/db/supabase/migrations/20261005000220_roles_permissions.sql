-- Dynamic roles and permissions (owner, 2026-10-05: "add dynamic roles and permissions").
-- TWO LAYERS. profiles.role (enum user_role) stays the BASE SCOPE: the `user_role` claim, RLS and
-- every scope helper (is_admin(), my_teacher_id(), …) keep reading it, untouched. On top of it a
-- role (system or custom) carries PERMISSIONS (`resource.action`, catalog in
-- packages/shared/src/permissions) that the API guard enforces per endpoint.
-- profiles.role_id null = the system role whose key is profiles.role. A custom role's base_role
-- IS the user's profiles.role (the composite FK below keeps them in step), so RLS scoping follows.
-- Writes go through the API only (service role); admins may read.

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9-]{1,64}$'),
  name_ar text not null check (length(btrim(name_ar)) between 1 and 60),
  name_en text check (length(name_en) <= 60),
  base_role public.user_role not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  -- A system role is the role of its enum value: key 'teacher' ⇔ base_role 'teacher'.
  constraint roles_system_key check (not is_system or key = base_role::text),
  constraint roles_id_base unique (id, base_role)
);
create unique index roles_one_system_per_base on public.roles (base_role) where is_system;

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission text not null check (permission ~ '^[a-z]+\.[a-z_]+$'),
  primary key (role_id, permission)
);

-- The held role must build on the user's base role. No ON DELETE action: a role still held by
-- someone cannot be deleted (the API answers 409 role_in_use first).
alter table public.profiles add column role_id uuid;
alter table public.profiles add constraint profiles_role_id_fk
  foreign key (role_id, role) references public.roles (id, base_role);
create index profiles_role_id_idx on public.profiles (role_id) where role_id is not null;

alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
create policy roles_admin_read on public.roles for select to authenticated using (public.is_admin());
create policy role_permissions_admin_read on public.role_permissions for select to authenticated
  using (public.is_admin());
revoke all on public.roles, public.role_permissions from anon;
revoke insert, update, delete, truncate on public.roles, public.role_permissions from authenticated;

-- The five system roles: today's access exactly (packages/shared defaultGrantsOf; the API test
-- roles.seed.test.ts compares these lists with the catalog). The system admin always holds every
-- grantable permission in the API whatever its rows say; its rows are listed for readers.
insert into public.roles (key, name_ar, name_en, base_role, is_system) values
  ('admin', 'مدير النظام', 'Administrator', 'admin', true),
  ('teacher', 'معلم/ة', 'Teacher', 'teacher', true),
  ('guardian', 'ولي الأمر', 'Guardian', 'guardian', true),
  ('assistant', 'مساعد/ة', 'Assistant', 'assistant', true),
  ('sales', 'المبيعات', 'Sales', 'sales', true);

insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r
join (values
  ('admin', array['leads.read', 'leads.write', 'leads.assign', 'applicants.read', 'applicants.write',
    'students.read', 'students.write', 'students.balance', 'guardians.read', 'guardians.write',
    'assistants.read', 'assistants.write', 'teachers.read', 'teachers.write', 'availability.read',
    'availability.write', 'dashboard.read', 'lessons.read', 'lessons.status', 'lessons.write',
    'booking.write', 'pricing.read', 'tasks.manage', 'classroom.join', 'classroom.kick',
    'classroom.moderate', 'classroom.host', 'classroom.links', 'recordings.read', 'meetings.read',
    'meetings.write', 'reports.read', 'reports.write', 'reports.resend', 'feedback.read',
    'feedback.write', 'inbox.read', 'inbox.send', 'inbox.media', 'messages.read', 'messages.manage',
    'templates.manage', 'payments.read', 'payments.write', 'subscriptions.read',
    'subscriptions.write', 'invoices.read', 'receivables.read', 'payouts.read', 'payouts.write',
    'payouts.approve', 'earnings.read', 'earnings.write', 'expenses.read', 'expenses.write',
    'exports.read', 'settings.read', 'settings.write', 'activity.read', 'roles.manage',
    'notifications.push', 'translations.manage']),
  ('teacher', array['students.balance', 'availability.read', 'availability.write', 'lessons.status',
    'classroom.join', 'classroom.kick', 'classroom.moderate', 'classroom.host', 'recordings.read',
    'meetings.read', 'meetings.write', 'reports.read', 'reports.write', 'inbox.read', 'inbox.send',
    'messages.read']),
  ('assistant', array['classroom.join', 'classroom.kick', 'classroom.moderate', 'meetings.read',
    'meetings.write']),
  ('sales', array['classroom.join', 'classroom.kick', 'meetings.read', 'meetings.write',
    'inbox.read', 'inbox.send'])
) as s (key, perms) on s.key = r.key
cross join lateral unnest(s.perms) as p (permission)
where r.is_system;

-- The access token now also carries `role_id` (the held role; the system role when null), so
-- clients can tell a custom role apart offline. `user_role` is unchanged.
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
  language plpgsql stable as $$
declare
  claims jsonb := event -> 'claims';
  user_role public.user_role;
  held uuid;
begin
  select p.role, coalesce(p.role_id, r.id) into user_role, held
  from public.profiles p
  left join public.roles r on r.is_system and r.base_role = p.role
  where p.id = (event ->> 'user_id')::uuid;
  claims := jsonb_set(claims, '{user_role}', coalesce(to_jsonb(user_role), 'null'::jsonb));
  claims := jsonb_set(claims, '{role_id}', coalesce(to_jsonb(held), 'null'::jsonb));
  return jsonb_set(event, '{claims}', claims);
end $$;

grant select on table public.roles to supabase_auth_admin;
create policy roles_auth_admin_read on public.roles for select to supabase_auth_admin using (true);
