-- «أرسل عبر واتساب» when staff sent the held text from WhatsApp Business BEFORE tapping (docs/19):
-- the app's echo was stored as its own external row (created_by null) and nothing attached it.
-- The tap (AppSend.start) now finds that row first and adopts it in ONE transaction:
--   the external row is deleted (its wamid is unique) and the held row takes its wamid, status
--   and times, with its window and every hold field cleared: one bubble, never sent again.
-- Compare-and-set on both rows: the held row still has no wamid, is staff-written, queued or failed
-- and not claimed by the sender; the external row is still an outbound, staff-less, sent row,
-- never older than the held row (an earlier identical message is never taken).
-- false = either moved: nothing changes. Service role only (the API); RLS is unchanged.
-- Re-runs safely (create or replace).
-- ROLLBACK (manual, after the code rollback):
--   drop function if exists public.app_send_adopt(uuid, uuid);
set local lock_timeout = '5s';

create or replace function public.app_send_adopt(p_held uuid, p_external uuid)
  returns boolean
  language plpgsql
  security invoker
  set search_path = ''
as $$
declare
  ext public.messages%rowtype;
  held_at timestamptz;
begin
  select h.created_at into held_at from public.messages h
    where h.id = p_held
      and h.direction = 'outbound'
      and h.created_by is not null
      and h.wa_message_id is null
      and h.status in ('queued', 'failed')
      and (h.error_code is null or h.error_code <> 'sending')
    for update;
  if not found then
    return false;
  end if;
  select * into ext from public.messages e
    where e.id = p_external
      and e.id <> p_held
      and e.direction = 'outbound'
      and e.created_by is null
      and e.wa_message_id is not null
      and e.status in ('sent', 'delivered', 'read')
      and e.created_at >= held_at
    for update;
  if not found then
    return false;
  end if;
  delete from public.messages where id = ext.id;
  update public.messages set
      wa_message_id = ext.wa_message_id,
      status = ext.status,
      sent_at = coalesce(ext.sent_at, ext.created_at),
      delivered_at = ext.delivered_at,
      read_at = ext.read_at,
      sent_manually_at = now(),
      app_send_until = null,
      error_code = null,
      error_text = null,
      next_attempt_at = null,
      expires_at = null,
      scheduled_for = null
    where id = p_held;
  return true;
end;
$$;

comment on function public.app_send_adopt(uuid, uuid) is
  'أرسل عبر واتساب: the held row takes the external app message sent before the tap (one bubble)';

revoke all on function public.app_send_adopt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.app_send_adopt(uuid, uuid) to service_role;
