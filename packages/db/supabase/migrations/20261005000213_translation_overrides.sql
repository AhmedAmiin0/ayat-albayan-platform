-- Dynamic translations (owner, 2026-10-05: "add dynamic translations; don't leave any content
-- static or dynamic untranslated"). ar.json / en.json in packages/shared stay the defaults and the
-- offline fallback; an admin can override any string leaf of them, per locale, from «الترجمات».
-- `key` is the dotted path of the leaf ('nav.leads'); the API checks it exists in the bundle and
-- that the value keeps the default's {placeholders} before writing.
--
-- Reads: the texts are public UI copy (the login page shows them before sign-in), so anon and
-- authenticated may SELECT. Clients still read them through the API (GET /i18n/:locale/overrides,
-- cached in memory there); the SELECT grant only keeps a direct read harmless.
-- Writes: only the API (service role) inserts, updates and deletes, after its admin guard.
create table public.translation_overrides (
  key text not null check (key ~ '^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$' and length(key) <= 200),
  locale text not null check (locale in ('ar', 'en')),
  value text not null check (length(btrim(value)) between 1 and 2000),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);

alter table public.translation_overrides enable row level security;
create policy translation_overrides_read on public.translation_overrides for select
  to anon, authenticated using (true);

-- Column-level: clients never see who edited a text (updated_by stays with the service role).
revoke all on public.translation_overrides from anon, authenticated;
grant select (key, locale, value, updated_at) on public.translation_overrides to anon, authenticated;
grant select, insert, update, delete on public.translation_overrides to service_role;
