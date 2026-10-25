-- No push-token takeover (review of #172, PR #175 «Not fixed»; owner 2026-10-25: notifications
-- reach only authenticated, authorized people). docs/04-architecture.md «Push devices».
--
-- 1. push_device_sessions.device_key_hash: sha256 of a random key the API mints for a device when
--    it binds a token (PUT /me/push-tokens) and hands back to that device only. A token bound to
--    ANOTHER profile's live session moves only when the request carries that key (the same phone,
--    now signed in as someone else); otherwise PUT answers 409 and the binding stays.
--    push_device_sessions.contested_at: set on that refusal. A contested binding gets no push (the
--    phone may be in someone else's hands now) until its own profile registers it again.
-- 2. profiles.push_tokens: no SELECT for clients (anon, authenticated), so nobody can read another
--    person's device tokens through PostgREST. The table-wide SELECT becomes a column grant of every
--    other column, so every existing read (RLS policies, security-invoker views) keeps working.
--    A column added to profiles later is NOT readable by clients until its migration grants it.
--
-- Idempotent: safe to run twice. Expand-only: the previous API ignores the new column, and the API
-- (service role) keeps every privilege on profiles.

set local lock_timeout = '5s';

alter table public.push_device_sessions
  add column if not exists device_key_hash text check (device_key_hash ~ '^[0-9a-f]{64}$');

alter table public.push_device_sessions add column if not exists contested_at timestamptz;

comment on column public.push_device_sessions.contested_at is
  'Another profile asked for this token without its device key (409): no push until its holder registers it again.';

comment on column public.push_device_sessions.device_key_hash is
  'sha256 (hex) of the device key the API minted for this binding; null = bound before migration 720.';

do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name <> 'push_tokens';
  -- Revoking the table privilege drops the column grants too; re-granted just below.
  revoke select on public.profiles from anon, authenticated;
  execute format('grant select (%s) on public.profiles to anon, authenticated', cols);
end $$;

-- MANUAL ROLLBACK (only after the code rollback):
--   grant select on public.profiles to anon, authenticated;
--   alter table public.push_device_sessions drop column device_key_hash, drop column contested_at;
