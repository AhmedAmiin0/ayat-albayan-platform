-- The visit write of a managed short link (docs/19 «Short links»), atomic per link: the link row is
-- locked, so two new visitors opening at once can never pass max_users together. A returning
-- visitor (same profile, or same verified phone) only bumps opens / last_at and always passes.
-- Answers 'recorded', 'limit_reached' or 'gone' (unknown, not active, or past its expiry).
-- The API's service role only. Idempotent (create or replace).

create or replace function public.short_link_record_visit(
  p_code text,
  p_profile uuid,
  p_phone text,
  p_matched_profile uuid,
  p_matched_guardian uuid
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_link record;
  v_seen int;
begin
  select l.status, l.expires_at, l.max_users into v_link
    from public.short_links l where l.code = p_code for update;
  if not found or v_link.status <> 'active' or v_link.expires_at <= now() then
    return 'gone';
  end if;
  update public.short_link_visits v
     set last_at = now(), opens = v.opens + 1,
         matched_profile_id = coalesce(p_matched_profile, v.matched_profile_id),
         matched_guardian_id = coalesce(p_matched_guardian, v.matched_guardian_id)
   where v.code = p_code
     and (v.profile_id = p_profile or v.phone_e164 = p_phone);
  if found then
    return 'recorded';
  end if;
  select count(*) into v_seen from public.short_link_visits v where v.code = p_code;
  if v_link.max_users is not null and v_seen >= v_link.max_users then
    return 'limit_reached';
  end if;
  insert into public.short_link_visits
    (code, profile_id, phone_e164, matched_profile_id, matched_guardian_id)
  values (p_code, p_profile, p_phone, p_matched_profile, p_matched_guardian);
  return 'recorded';
end;
$$;

revoke all on function public.short_link_record_visit(text, uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.short_link_record_visit(text, uuid, text, uuid, uuid)
  to service_role;

-- MANUAL ROLLBACK: drop function if exists public.short_link_record_visit(text, uuid, text, uuid, uuid);
