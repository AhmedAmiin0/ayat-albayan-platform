-- messages.read for the system sales role (owner report 2026-10-12: «it is not able to start the
-- conversation»). Without it GET /messaging/templates answered 403 for a salesperson: the template
-- picker stayed empty and she could never send the template that opens (or reopens after 24 h) a
-- WhatsApp conversation. Read-only: the approved templates she may send (TemplatesController.list,
-- filtered server-side) and the send gate's state (GET /messages/gate). messages.manage (retry,
-- sent manually, hand-off) and templates.manage stay admin only. Idempotent; custom roles keep
-- whatever the admin set in the matrix.
insert into public.role_permissions (role_id, permission)
select r.id, 'messages.read' from public.roles r where r.is_system and r.key in ('sales')
on conflict do nothing;
