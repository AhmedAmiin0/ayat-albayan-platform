-- Two new grantable permissions (owner 2026-10-12, docs/16 rows 23–24), ON for the system sales role and
-- the admin can switch them off in «الأدوار والصلاحيات» (system teacher / sales / assistant grants are
-- editable, the admin role stays fixed):
--   students.check_registration  «التحقق من التسجيل»: GET /sales/registration-check (name, code, status,
--                                 teacher of the matching children; never ids, phones, money or notes).
--   subscriptions.set_start_date «تحديد تاريخ بداية الاشتراك»: an inline check of POST /sales/subscriptions;
--                                 without it the package starts on the default day.
-- The system admin holds every grantable key in the API whatever its rows say; its rows are listed for
-- readers (as every earlier seed). Idempotent; custom roles keep whatever the admin set in the matrix,
-- except one thing: a custom role based on sales already set the start day (the old sales form always sent
-- it), so it keeps that ability: subscriptions.set_start_date is granted to every existing non-system
-- role with base_role 'sales'. «التحقق من التسجيل» is new, so custom roles get it only from the matrix.
insert into public.role_permissions (role_id, permission)
select r.id, 'students.check_registration' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, 'subscriptions.set_start_date' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;

-- Custom roles based on sales keep setting the start day (see the header).
insert into public.role_permissions (role_id, permission)
select r.id, 'subscriptions.set_start_date' from public.roles r where not r.is_system and r.base_role = 'sales'
on conflict do nothing;
