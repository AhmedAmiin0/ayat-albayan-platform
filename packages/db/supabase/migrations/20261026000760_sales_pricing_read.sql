-- «عرض سعر» in the chat (owner 2026-10-26): the system sales role (assistants) gets pricing.read, so the
-- chat's quote sheet can call GET /pricing/quote and /pricing/catalog. Same default as the catalog
-- (packages/shared catalog.data.ts), which «استعادة الافتراضي» resets to; staging's sales role was reset
-- by SQL, so the row is inserted here too. Teachers never get it. The system admin holds every grantable
-- key whatever its rows say (and was seeded with it in 20261005000220). Custom roles get it only from the
-- matrix. Idempotent.
insert into public.role_permissions (role_id, permission)
select r.id, 'pricing.read' from public.roles r where r.is_system and r.key in ('sales')
on conflict do nothing;
