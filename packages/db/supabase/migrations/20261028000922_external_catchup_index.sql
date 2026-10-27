-- The external catch-up (ExternalQueries.newestExternal, every 10 min per Kapso number) asks for the
-- newest message sent outside the app on a number, or on a line for legacy rows: outbound, created_by
-- null, attempts 0, with a wamid. No index matched, so it scanned messages (445 ms mean, 3.1 s max on
-- staging, growing with the table). Two small partial indexes, one per lookup, make it one index probe.
-- Plain create index (inside the migration transaction: no CONCURRENTLY). The partial predicate keeps
-- each index small, but the build still scans the whole messages heap under a SHARE lock (writes to
-- messages wait; about 1-6 s, once, at deploy).
-- Idempotent.

set local lock_timeout = '5s';

create index if not exists messages_external_number_idx on public.messages (number_id, created_at desc)
  where direction = 'outbound' and created_by is null and attempts = 0 and wa_message_id is not null;

create index if not exists messages_external_line_idx on public.messages (line, created_at desc)
  where direction = 'outbound' and created_by is null and attempts = 0 and wa_message_id is not null;

-- MANUAL ROLLBACK:
--   drop index if exists public.messages_external_line_idx;
--   drop index if exists public.messages_external_number_idx;
