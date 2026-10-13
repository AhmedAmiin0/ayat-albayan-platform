-- The portal roles (guardian, student) carry no permission grants: their access is the portal's own scope
-- (RLS + the portal guards), never the matrix. Edits to their grants are now refused (400 portal_role_fixed), so any
-- grant row an earlier edit left behind is removed here. Idempotent (staging had none on 2026-10-13).
delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id and r.is_system and r.key in ('guardian', 'student');
