-- Server-side statement timeout for the API's database calls (audit BE-15; R-PAY-01, R-NFR-08).
-- The API gives up on a call after DB_TIMEOUT_MS (15 s, apps/api common/db/db-timeout.ts) and
-- answers 503, but without a server cap the statement runs on and may commit after staff were
-- told to retry. The API calls PostgREST with the service key, so its calls run as service_role;
-- PostgREST applies that role's settings to each request's transaction. 20 s ends a stalled
-- statement soon after the client deadline, and no API call can finish past 15 s anyway.
-- Set only when the role has no cap, or a higher one: a lower cap already set is kept. When
-- service_role has none, authenticator's session value applies, so that one counts too.
-- pg_cron and maintenance jobs run as postgres and are not affected.
-- RLS / grants: no table or function changes.
-- SQL test plan (e2e/tests/platform/api-statement-timeout.sql.spec.ts):
--   1. service_role carries statement_timeout ≤ 20 s.
--   2. a call that sleeps past it under service_role's settings is cancelled (57014).

set local lock_timeout = '5s';

do $$
declare
  cap_ms constant int := 20000;
  prior text := current_setting('statement_timeout');
  configured text;
  current_ms int := 0;
begin
  select coalesce(
    (select substr(c, length('statement_timeout=') + 1)
       from pg_roles r, unnest(r.rolconfig) c
      where r.rolname = 'service_role' and c like 'statement_timeout=%'),
    (select substr(c, length('statement_timeout=') + 1)
       from pg_roles r, unnest(r.rolconfig) c
      where r.rolname = 'authenticator' and c like 'statement_timeout=%'))
  into configured;

  -- pg_settings gives the value in ms whatever unit the role setting was written in.
  if configured is not null then
    perform set_config('statement_timeout', configured, true);
    select setting::int into current_ms from pg_settings where name = 'statement_timeout';
    perform set_config('statement_timeout', prior, true);
  end if;

  if current_ms = 0 or current_ms > cap_ms then
    execute format('alter role service_role set statement_timeout = %L', cap_ms || 'ms');
  end if;
end
$$;

notify pgrst, 'reload config';
