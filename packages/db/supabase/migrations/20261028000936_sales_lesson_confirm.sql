-- «تأكيد الحلقة» from the assistant's «الجدول» (owner 2026-10-28, docs/16 row 37): one narrow key,
-- lessons.confirm, that gates only POST /sales/lessons/:id/confirm (the teacher's and the admin's route keeps
-- lessons.status). Same defaults as the catalog (packages/shared catalog.data.ts, «استعادة الافتراضي»): the
-- system sales role; the system admin holds every grantable key whatever its rows say, and gets the row too so
-- the seed test reads it. Teachers and assistants never. Custom roles only from the matrix. Idempotent.
insert into public.role_permissions (role_id, permission)
select r.id, 'lessons.confirm' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;
