-- «القوائم» (owner 2026-10-20, docs/22 §2): the new grantable permission inbox.lists, ON for the system
-- sales role (assistants) and the admin; the admin can switch it off for sales in «الأدوار والصلاحيات».
-- Teachers never get lists (no grant). The system admin holds every grantable key in the API whatever its
-- rows say; its row is listed for readers (as every earlier seed). Custom roles get it only from the
-- matrix. Idempotent.
insert into public.role_permissions (role_id, permission)
select r.id, 'inbox.lists' from public.roles r where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;
