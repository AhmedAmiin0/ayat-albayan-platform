-- Starter templates (owner 2026-10-12: «add the recently added templates from meta to start the chat
-- and make them the only available option for sales; these will be sent through the main number
-- normally but all the other templates (notifications related) … will be through the other number»).
-- Main number = the chat line (WA_CHAT_*), other number = the notifications line (WA_*), docs/12 §13.
--
-- message_templates.line: the line (WABA) Meta approved the template on; the sender sends it from
-- that line (a chat row falls back to notifications while the chat line is not configured: one line
-- = one WABA). Written by the health sync and its import, never by the admin.
-- message_templates.sales_starter: offered to sales to start a chat, the ONLY templates a salesperson
-- may list or send; ticked by the admin on the templates page (PATCH /messaging/templates/:key/starter).
--
-- Expand-only: the previous API / web / mobile ignore both columns, so a code rollback needs no SQL.

-- Fail fast instead of queueing behind a long transaction (the sender reads this table every pass).
set local lock_timeout = '5s';

alter table public.message_templates
  add column line public.wa_line not null default 'notifications',
  add column sales_starter boolean not null default false;

comment on column public.message_templates.line is
  'WhatsApp line (WABA) Meta approved this template on; the sender sends it from that line (chat falls back to notifications while the chat line is not configured). Written by the health sync, not by admins.';
comment on column public.message_templates.sales_starter is
  'Offered to sales to start a chat: the only templates a salesperson may list or send. Toggled by the admin.';

-- Rows the platform does not produce came from tools/migrate's CRM import (e.g. teacher_lesson_v2),
-- whose templates live on the main number's WABA (= the chat line). They stay non-starters until the
-- admin ticks them. The 15 keys below are TEMPLATE_KEYS (packages/shared messaging/templates.ts).
update public.message_templates set line = 'chat'
where key not in ('booking_confirmation', 'booking_confirmation_meet', 'booking_confirmation_plain',
  'lesson_reminder', 'lesson_reminder_meet', 'lesson_reminder_plain', 'teacher_lesson_reminder',
  'teacher_lesson_reminder_meet', 'lesson_reminder_24h', 'report_ready', 'renewal_due', 'follow_up_slots',
  'lesson_feedback_request', 'lesson_join_link', 'lesson_rating');

-- RLS / grants: unchanged. RLS is already on (migration 141: admin read policy) and authenticated has
-- no write grant, so only the API (service role) inserts imported rows and flips the flag. No seed:
-- starters arrive from Meta through «راجع حالة القوالب» (POST /messaging/templates/health) or the boot
-- check, or the admin ticks an existing row.
--
-- MANUAL ROLLBACK (only after the code rollback):
--   alter table public.message_templates drop column sales_starter, drop column line;
