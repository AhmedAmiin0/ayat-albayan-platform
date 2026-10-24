-- Validate the three data checks migration 630 added NOT VALID (docs/26 §4 «Validate»):
-- settings_key_format, settings_value_size, settings_kind. The §4 pre-check returned zero rows on
-- staging on 2026-10-24, after the 26-P2 seeder had booted there (every row has its value_type).
-- Writes no row and changes no stored value: it only marks the checks validated. VALIDATE takes a
-- SHARE UPDATE EXCLUSIVE lock, so reads and writes of settings go on while it scans.
-- Per check, a database with a failing row (one the pre-check never ran on) keeps that check
-- NOT VALID with a warning instead of failing the deploy; new writes are checked either way.
-- Idempotent: a validated check is skipped.

set local lock_timeout = '5s';

do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.settings'::regclass and not convalidated
      and conname in ('settings_key_format', 'settings_value_size', 'settings_kind')
    order by conname
  loop
    begin
      execute format('alter table public.settings validate constraint %I', c);
    exception when check_violation then
      raise warning 'settings check % stays NOT VALID: a row fails it (run the docs/26 §4 pre-check)', c;
    end;
  end loop;
end
$$;
