-- Sales move or cancel ONE lesson of their own students from «جدول الحلقات» (owner 2026-10-27, docs/16
-- row 37): two narrow keys, lessons.reschedule and lessons.cancel, that gate only POST /sales/lessons/:id/
-- reschedule and /cancel (the admin's routes keep lessons.write). Same defaults as the catalog
-- (packages/shared catalog.data.ts, «استعادة الافتراضي»): the system sales role; the system admin holds every
-- grantable key whatever its rows say, and gets the rows too so the seed test reads them. Teachers and
-- assistants never. Custom roles only from the matrix. Idempotent.
insert into public.role_permissions (role_id, permission)
select r.id, 'lessons.reschedule' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, 'lessons.cancel' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;
