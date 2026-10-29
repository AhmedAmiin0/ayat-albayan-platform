-- «تجديد اشتراك أي طالب من المحادثة» (owner 2026-10-29, docs/16 row 38): one narrow key, sales.renew_any, an
-- inline check of the sales money endpoints (SalesMoneyScope; no route gate). With it (and self.sales_money) the
-- chat's family lists every child, not only hers, and «جدّد الاشتراك» / «اشتراك جديد» / «سجّل تحويلًا بنكيًا»
-- accept any student of that chat's family (families imported from the old sheet have no owner). NOT a default of
-- the system sales role: the admin grants it from the matrix (e.g. one custom role). Same defaults as the catalog
-- (packages/shared catalog.data.ts): the system admin holds every grantable key whatever its rows say, and gets
-- the row so the seed test reads it. Teachers, assistants and sales never by default. No RLS change: the sales
-- money writes run as the service role behind the Nest guards; sales' own RLS reads are untouched. Idempotent.
insert into public.role_permissions (role_id, permission)
select r.id, 'sales.renew_any' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
