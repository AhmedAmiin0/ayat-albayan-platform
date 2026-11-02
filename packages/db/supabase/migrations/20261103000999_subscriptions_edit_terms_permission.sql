-- «تعديل بيانات الباقة» (owner 2026-11-03): one new key, subscriptions.edit_terms, that gates for assistants
-- every change to an EXISTING package or payment: its start date, «حلقات مستخدمة من الباقة», its price and a
-- recorded payment's amount (GET / PATCH /subscriptions/:id/lessons-used-before today; the start-date and
-- amount edits as they land). subscriptions.set_start_date keeps the start date of the CREATE / renew forms
-- only. NOT a default of the system sales role: the admin grants it from the matrix to one trusted custom
-- role. Same defaults as the catalog (packages/catalog catalog.data.ts): the system admin holds every
-- grantable key whatever its rows say, and gets the row so the seed test reads it. No RLS change: the
-- writes run as the service role behind the Nest guards. Seed-only, idempotent.
-- Rollback: delete from public.role_permissions where permission = 'subscriptions.edit_terms'.
insert into public.role_permissions (role_id, permission)
select r.id, 'subscriptions.edit_terms' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
