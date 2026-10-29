-- «ربط بطالب موجود» (owner 2026-10-29): one narrow key, leads.link_family, gating POST /leads/:id/link-family. It
-- adds a lead chat's number as the second number of an existing student's family (public.guardian_phones,
-- migration 973) and moves the lead to converted. It never sets leads.converted_guardian_id nor changes
-- leads.assigned_to, so nobody becomes an owner of that family by linking. NOT a default of the system sales
-- role: the admin grants it from the matrix. Same defaults as the catalog (packages/shared catalog.data.ts):
-- the system admin holds every grantable key whatever its rows say, and gets the row so the seed test reads it.
-- Teachers, assistants and sales never by default. No RLS change: the API writes with the service role. Idempotent.
insert into public.role_permissions (role_id, permission)
select r.id, 'leads.link_family' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
