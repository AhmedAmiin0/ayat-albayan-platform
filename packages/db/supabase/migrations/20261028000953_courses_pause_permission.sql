-- «إيقاف الدورة مؤقتًا» (owner 2026-10-28, docs/16 row 37c): one narrow key, courses.pause, that gates the course
-- pause routes (POST /students/:id/course-pause, PATCH …/until, POST …/resume, GET …/course-pause and its preview)
-- for ANY student, the same scope as moving / cancelling any lesson (row 37). Same defaults as the catalog
-- (packages/shared catalog.data.ts): the system sales role; the system admin holds every grantable key whatever
-- its rows say, and gets the row too so the seed test reads it. Teachers and assistants never. Idempotent.
insert into public.role_permissions (role_id, permission)
select r.id, 'courses.pause' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;
