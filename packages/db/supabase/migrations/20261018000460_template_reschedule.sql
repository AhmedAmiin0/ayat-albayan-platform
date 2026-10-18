-- Templates per number (owner 2026-10-18: «more controles over templates and which number it goes to
-- and more options to sync it with meta for each number», «i need one more template to reschedule the
-- meeting»: the family is asked for a new time). docs/12 §3.4.
--
-- 1. message_templates.line is now also set by the admin: PATCH /messaging/templates/:key/line moves a
--    template to the other number (audited, template_line_set), and each number's sync reads only its
--    own rows. Migration 340's column comment («Written by the health sync, not by admins») was wrong
--    from the start: nothing but inserts ever wrote it. Restated here (old migrations stay as they are).
-- 2. trial_reschedule: a chat-line starter, on the restricted allow-list (sales_starter, now one of the
--    three RESTRICTED_TEMPLATE_DEFAULTS), not submitted. The admin submits it to the chat number's WABA
--    from the templates page; nothing here or at boot sends it to Meta.
--
-- Idempotent: the comment is re-set; the row is inserted once (a row with the same key, or the same
-- Meta name + language, e.g. one imported from Meta, is left as it is).

set local lock_timeout = '5s';

comment on column public.message_templates.line is
  'WhatsApp line (WABA) this template is on; the sender sends it from that line (chat falls back to notifications while the chat line is not configured). Set at insert (seed, import) and by the admin (PATCH /messaging/templates/:key/line, audited); each line''s sync reads only its own rows.';

insert into public.message_templates (key, meta_name, language, category, body_ar, params, status, line, sales_starter)
values (
  'trial_reschedule',
  'trial_reschedule',
  'ar',
  'utility',
  'السلام عليكم {{1}}،
نودّ إعادة جدولة موعد الحلقة التجريبية.
ما الوقت الذي يناسبكم؟',
  '["contact_name"]'::jsonb,
  'not_submitted',
  'chat',
  true
)
on conflict do nothing;

-- RLS / grants: unchanged (migration 141: RLS on, admin read policy; only the API writes).
--
-- MANUAL ROLLBACK (only after the code rollback):
--   delete from public.message_templates where key = 'trial_reschedule' and status = 'not_submitted';
