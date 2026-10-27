-- Review of #327 (2026-10-27): two follow-ups to the old-CRM copy job (migration 891).
--
-- 1. Switching crm_media_copy_all from off to on re-arms every failed row: its non-skipped
--    crm_media_copy_failures rows are deleted, so a row capped during an earlier run (an outage, a
--    file the CRM did not serve then) is tried again. Skipped rows (never ours to fetch) stay.
-- 2. crm_media_copy_counts adds `remaining`: imported CRM file links still without a copy on ANY host
--    and not in crm_media_copy_failures (the batch only picks rows on crm_media_host, so the «done»
--    audit row could not see files on another host). The old bucket goes private only at remaining = 0
--    (docs/19).
--
-- Expand-only: no message is read for writing or changed; only failure rows of this job are deleted.

set local lock_timeout = '5s';

-- Security definer: a settings write may come from an admin's session, which cannot touch the
-- failures table (service role writes only, migration 891).
create or replace function public.crm_media_copy_rearm() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.key = 'crm_media_copy_all' and new.value = 'true'::jsonb
     and (tg_op = 'INSERT' or old.value is distinct from new.value) then
    delete from public.crm_media_copy_failures where not skipped;
  end if;
  return null;
end;
$$;
revoke all on function public.crm_media_copy_rearm() from public, anon, authenticated;

drop trigger if exists settings_crm_media_copy_rearm on public.settings;
create trigger settings_crm_media_copy_rearm after insert or update of value on public.settings
  for each row execute function public.crm_media_copy_rearm();

create or replace function public.crm_media_copy_counts(p_host text)
  returns jsonb
  language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'copied', (select count(*) from public.messages m
                where m.direction = 'inbound' and m.media_path is not null and m.media_id is null
                  and starts_with(m.body, 'https://' || lower(p_host) || '/storage/v1/object/public/chat-media/')),
    'failed', (select count(*) from public.crm_media_copy_failures f join public.messages m on m.id = f.message_id
                where not f.skipped and m.media_path is null
                  and starts_with(m.body, 'https://' || lower(p_host) || '/storage/v1/object/public/chat-media/')),
    'skipped', (select count(*) from public.crm_media_copy_failures f join public.messages m on m.id = f.message_id
                 where f.skipped and m.media_path is null
                   and starts_with(m.body, 'https://' || lower(p_host) || '/storage/v1/object/public/chat-media/')),
    'remaining', (select count(*) from public.messages m
                   where m.direction = 'inbound' and m.media_id is null and m.media_path is null
                     and m.body like 'https://%/storage/v1/object/public/chat-media/%'
                     and not exists (select 1 from public.crm_media_copy_failures f where f.message_id = m.id)));
$$;

revoke all on function public.crm_media_copy_counts(text) from public, anon, authenticated;
grant execute on function public.crm_media_copy_counts(text) to service_role;

-- MANUAL ROLLBACK (only after the code rollback):
--   drop trigger settings_crm_media_copy_rearm on public.settings;
--   drop function public.crm_media_copy_rearm();
--   then re-run crm_media_copy_counts from 20261028000891_crm_media_copy.sql.
