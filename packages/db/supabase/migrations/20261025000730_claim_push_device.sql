-- One statement for PUT /me/push-tokens' takeover check (review of #177; owner 2026-10-25: «do
-- what you recommend»). Migration 720's rule, unchanged, but the read, the decision and the write
-- now happen under one per-token lock: two PUTs of the same token (a claim racing the holder's own
-- re-registration, or two first registrations) can no longer interleave between the check and the
-- upsert, and a contest never lands on a binding its holder has just renewed.
--
-- claim_push_device returns:
--   'bound'      the caller now holds the token, with p_new_hash (a fresh key);
--   'proven'     the caller presented the binding's own key: moved, the key kept;
--   'in_use'     another profile's live session holds it and no key proved the device: the binding
--                stays and is marked contested (no push until its holder registers it again);
--   'no_session' the caller's session ended meanwhile (foreign key): nothing bound.
--
-- Idempotent (create or replace), expand-only (the previous API keeps its two-step path). Service
-- role only.

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
      device_key_hash = excluded.device_key_hash, contested_at = null;
  return case when proven then 'proven' else 'bound' end;
exception when foreign_key_violation then
  return 'no_session';
end $$;

revoke all on function public.claim_push_device(text, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_push_device(text, uuid, uuid, text, text) to service_role;

-- MANUAL ROLLBACK (only after the code rollback):
--   drop function public.claim_push_device(text, uuid, uuid, text, text);
