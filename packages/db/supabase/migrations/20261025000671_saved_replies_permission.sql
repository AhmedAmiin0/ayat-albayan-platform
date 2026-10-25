-- «الردود السريعة» (owner 2026-10-25): the new grantable permission saved_replies.manage writes the
-- SHARED saved replies list. ON for the system admin by default (who holds every grantable key in the
-- API anyway; the row is for readers, like every earlier seed); the admin may grant it to assistants or
-- a custom role in «الأدوار والصلاحيات». Personal replies need no permission.
--
-- role_permissions.permission was '^[a-z]+\.[a-z_]+$' (migration 220): a resource with an underscore
-- («saved_replies») did not fit. Widened, never narrowed: every existing key still matches. NOT VALID +
-- VALIDATE so the check of existing rows takes only a SHARE UPDATE EXCLUSIVE lock. Re-runnable.

set local lock_timeout = '5s';

alter table public.role_permissions drop constraint if exists role_permissions_permission_check;
alter table public.role_permissions drop constraint if exists role_permissions_permission_format;
alter table public.role_permissions add constraint role_permissions_permission_format
  check (permission ~ '^[a-z][a-z_]*\.[a-z_]+$') not valid;
alter table public.role_permissions validate constraint role_permissions_permission_format;

insert into public.role_permissions (role_id, permission)
select r.id, 'saved_replies.manage' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;

-- MANUAL ROLLBACK (only after the code rollback):
--   delete from public.role_permissions where permission = 'saved_replies.manage';
--   (the widened check may stay: it accepts every earlier key)
