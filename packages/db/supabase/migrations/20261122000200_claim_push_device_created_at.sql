-- Migration 730's claim_push_device, unchanged except that re-claiming a bound token now sets
-- created_at to now() (R-MOB-01). The receipts job (migration 20261122000100) drops a binding only
-- when it was made before the push a DeviceNotRegistered receipt is about. An Expo token keeps its
-- string across app upgrades and reinstalls, so a phone that registers the same token again (cold
-- start, new sign-in) is live from that moment, and a late receipt for an earlier push must not
-- delete it. Before this, an in-place re-claim kept the first created_at and the guard missed it.
--
-- The 'in_use' branch returns before the upsert: a refused claim bumps nothing. Nothing else reads
-- push_device_sessions.created_at.
--
-- Idempotent (create or replace), expand-only: the previous API calls the same signature.

set local lock_timeout = '5s';

create or replace function public.claim_push_device(
  p_token text, p_profile uuid, p_session uuid, p_new_hash text, p_presented text default null
) returns text
  language plpgsql security definer set search_path = '' as $$
declare
  b public.push_device_sessions%rowtype;
  proven boolean := false;
begin
  -- Serialises every claim of this token, also when it has no row yet.
  perform pg_advisory_xact_lock(hashtextextended('push_device:' || p_token, 0));
  select * into b from public.push_device_sessions where token = p_token for update;
  if found then
    -- coalesce: no key presented (null) must read as «not proven», never as unknown.
    proven := coalesce(b.device_key_hash = p_presented, false);
    if b.profile_id <> p_profile and not proven
       and exists (select 1 from public.push_live_sessions(array[b.session_id])) then
      update public.push_device_sessions set contested_at = coalesce(contested_at, now())
        where token = p_token;
      return 'in_use';
    end if;
  end if;
  insert into public.push_device_sessions (token, profile_id, session_id, device_key_hash, contested_at)
    values (p_token, p_profile, p_session, case when proven then p_presented else p_new_hash end, null)
    on conflict (token) do update set profile_id = excluded.profile_id, session_id = excluded.session_id,
      device_key_hash = excluded.device_key_hash, contested_at = null, created_at = now();
  return case when proven then 'proven' else 'bound' end;
exception when foreign_key_violation then
  return 'no_session';
end $$;

revoke all on function public.claim_push_device(text, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_push_device(text, uuid, uuid, text, text) to service_role;

-- MANUAL ROLLBACK (only after the code rollback): re-run migration 20261025000730's
-- create or replace function.
