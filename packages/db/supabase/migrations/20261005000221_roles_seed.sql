-- Dynamic roles, step 2: the five system roles with the default permissions that reproduce today's
-- behaviour. admin = '*'. The others reach their routes through @Roles (base role), so their sets
-- only describe what they already use (threads, classroom, recordings); they are informational.
insert into public.roles (key, name_ar, name_en, base_role, is_system) values
  ('admin', 'مدير', 'Admin', 'admin', true),
  ('teacher', 'معلم/ة', 'Teacher', 'teacher', true),
  ('guardian', 'ولي أمر', 'Guardian', 'guardian', true),
  ('assistant', 'مساعد/ة', 'Assistant', 'assistant', true),
  ('sales', 'مبيعات', 'Sales', 'sales', true)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission)
select r.id, p.permission
from public.roles r
join (values
  ('admin', '*'),
  ('teacher', 'inbox.view'), ('teacher', 'classrooms.view'), ('teacher', 'recordings.view'),
  ('assistant', 'classrooms.view'), ('assistant', 'recordings.view'),
  ('sales', 'inbox.view'), ('sales', 'leads.view'), ('sales', 'classrooms.view'), ('sales', 'recordings.view')
) as p (key, permission) on p.key = r.key
where r.is_system
on conflict do nothing;
