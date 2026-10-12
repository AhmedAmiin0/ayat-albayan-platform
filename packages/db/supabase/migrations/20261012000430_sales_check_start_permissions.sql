-- Two new grantable permissions (owner 2026-10-12, docs/16 rows 23–24), ON for the system sales role and
-- the admin can switch them off in «الأدوار والصلاحيات» (system teacher / sales / assistant grants are
-- editable, the admin role stays fixed):
--   students.check_registration  «التحقق من التسجيل»: GET /sales/registration-check (name, code, status,
--                                 teacher of the matching children; never ids, phones, money or notes).
--   subscriptions.set_start_date «تحديد تاريخ بداية الاشتراك»: an inline check of POST /sales/subscriptions;
--                                 without it the package starts on the default day.
-- The system admin holds every grantable key in the API whatever its rows say; its rows are listed for
-- readers (as every earlier seed). Idempotent; custom roles keep whatever the admin set in the matrix.
insert into public.role_permissions (role_id, permission)
select r.id, 'students.check_registration' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, 'subscriptions.set_start_date' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;
