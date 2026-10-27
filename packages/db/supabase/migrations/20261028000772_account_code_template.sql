-- Family accounts (docs/30 §4): the sign-in / password code template. An AUTHENTICATION template: Meta's
-- fixed text (the code, the security line) and a copy-code button; no custom words. On the notifications
-- line, NOT submitted: the owner approves its submission separately («القوالب» → submit).
--
-- The button is stored as Meta's send shape for a copy-code button (a URL button whose {{1}} is the
-- code): the sender fills it with the code like any URL suffix. The health sync keeps our buttons for
-- a button it cannot model (OTP), so the send shape survives the sync.
--
-- Idempotent: inserted once (a row with the same key, or the same Meta name + language, stays as it is).

set local lock_timeout = '5s';

insert into public.message_templates (key, meta_name, language, category, body_ar, params, buttons, status, line, sales_starter)
values (
  'account_code',
  'account_code',
  'ar',
  'authentication',
  '*{{1}}* هو رمز التحقق الخاص بك. للحفاظ على أمانك، لا تشارك هذا الرمز.',
  '["code"]'::jsonb,
  '[{"type": "url", "text": "نسخ الرمز", "url": "https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp{{1}}"}]'::jsonb,
  'not_submitted',
  'notifications',
  false
)
on conflict do nothing;

-- RLS / grants: unchanged (migration 141: RLS on, admin read policy; only the API writes).
--
-- MANUAL ROLLBACK (only after the code rollback):
--   delete from public.message_templates where key = 'account_code' and status = 'not_submitted';
