-- Phase 4 messaging columns (docs/12 §2): sender retries, manual sends, inbound media and replies,
-- Meta conversation info, lead follow-ups, the thread list and the messaging settings.
-- R-MSG-02..05, R-LEAD-01/02/05, R-SCH-03.

-- Sender (R-MSG-02): attempts counts tries; next_attempt_at holds a retry back (backoff). The last
-- Meta error stays in error_code / error_text. sent_manually_at: R-MSG-03 wa.me fallback.
-- Inbound (R-MSG-04): reply_to_wa_id = Meta's context.id (the outbound wamid answered);
-- media_* = Meta media id, its mime type and the Storage path once downloaded; interactive_payload
-- = the raw button / interactive / unsupported part of the message.
-- wa_conversation_id / wa_pricing_category: from Meta status webhooks (conversation.id,
-- pricing.category), for cost reporting.
-- expires_at: past it a queued row is never sent (failed, error_code 'expired'): a reminder after
-- the lesson started, a follow-up whose slots passed. null = no expiry.
alter table public.messages
  add column attempts int not null default 0 check (attempts >= 0),
  add column next_attempt_at timestamptz,
  add column expires_at timestamptz,
  add column sent_manually_at timestamptz,
  add column reply_to_wa_id text,
  add column media_id text,
  add column media_mime text,
  add column media_path text,
  add column interactive_payload jsonb,
  add column wa_conversation_id text,
  add column wa_pricing_category text;

-- An inbound image, sticker or location has no text; outbound rows still need a template, a text
-- or a document.
alter table public.messages drop constraint messages_check;
alter table public.messages add constraint messages_content_check check (
  direction = 'inbound' or template_key is not null or body is not null or media_path is not null);

create index messages_phone_idx on public.messages (phone_e164, created_at desc);
-- Unread = inbound rows an admin has not opened: read_at on an INBOUND row is stamped when an
-- admin opens the thread (and the API sends Meta the read receipt). On outbound rows read_at stays
-- Meta's «read by the customer».
create index messages_unread_idx on public.messages (phone_e164)
  where direction = 'inbound' and read_at is null;

-- One row per phone that has messages (R-LEAD-02 inbox): the last message, unread count, the last
-- inbound time (24 h session window, R-MSG-01) and who the phone is (lead, guardian, teacher).
-- ponytail: distinct on over all messages; materialise or keep a contacts table if it gets slow.
create view public.v_threads with (security_invoker = true) as
with last_message as (
  select distinct on (phone_e164) phone_e164, id as last_message_id, direction as last_direction,
    body as last_body, template_key as last_template_key, status as last_status,
    media_mime as last_media_mime, created_at as last_message_at
  from public.messages
  order by phone_e164, created_at desc
), inbound as (
  select phone_e164, max(created_at) as last_inbound_at,
    (count(*) filter (where read_at is null))::int as unread_count
  from public.messages
  where direction = 'inbound'
  group by phone_e164
)
select m.*, i.last_inbound_at, coalesce(i.unread_count, 0) as unread_count,
  l.id as lead_id, l.name as lead_name, l.status as lead_status, l.source as lead_source,
  g.id as guardian_id, g.name as guardian_name, g.tz as guardian_tz,
  t.id as teacher_id, t.display_name_ar as teacher_name,
  coalesce(g.name, l.name, t.display_name_ar) as display_name
from last_message m
left join inbound i on i.phone_e164 = m.phone_e164
left join public.leads l on l.phone_e164 = m.phone_e164
left join public.guardians g on g.phone_e164 = m.phone_e164
left join public.teachers t on t.phone_e164 = m.phone_e164;

revoke all on public.v_threads from anon, authenticated;
grant select on public.v_threads to service_role;

-- R-LEAD-05: follow_up_stage = follow-ups already sent (index into settings.follow_up_hours);
-- follow_up_paused = the admin's per-lead pause, or the lead tapped «وقف الرسايل».
alter table public.leads
  add column follow_up_paused boolean not null default false,
  add column follow_up_stage int not null default 0 check (follow_up_stage >= 0);
create index leads_follow_up_idx on public.leads (next_follow_up_at)
  where not follow_up_paused and next_follow_up_at is not null;

-- Messaging settings (SettingsService; a missing row reads as these defaults).
-- follow_up_hours: R-LEAD-05 «24h then 72h» after the lead's last inbound message.
-- reminder_minutes_before: R-MSG-02 same-day reminder (lesson_reminder*) offset.
-- reminder_24h_enabled: stays false until lesson_reminder_24h is approved on Meta.
-- messaging_enabled: the admin's kill switch. The sender sends only when this AND the env
--   MESSAGING_ENABLED are true; otherwise rows stay queued. false until the CRM cut-over.
insert into public.settings (key, value) values
  ('follow_up_hours', '[24, 72]'::jsonb),
  ('reminder_minutes_before', '60'::jsonb),
  ('reminder_24h_enabled', 'false'::jsonb),
  ('messaging_enabled', 'false'::jsonb)
on conflict (key) do nothing;
