-- «أرسِل الآن داخل قالب» (owner 2026-11-14: «a template that carries your text»). docs/19.
--
-- academy_message is the chat line's template whose {{1}} carries the staff's own text after the 24 h
-- window. It joins RESTRICTED_TEMPLATE_DEFAULTS (packages/shared), so the chat line's import flags it
-- for restricted roles (sales, assistant, teacher). This migration flags a row the registry may
-- already hold (imported before the default changed). Nothing is inserted: the template comes from
-- Meta through the import, never from here, and nothing is sent to Meta.
--
-- Idempotent: only a chat-line row not yet flagged is updated; a re-run changes nothing.

set local lock_timeout = '5s';

update public.message_templates
set sales_starter = true
where key = 'academy_message'
  and line = 'chat'
  and not sales_starter;

-- RLS / grants: unchanged (migration 141: RLS on, admin read policy; only the API writes).
--
-- MANUAL ROLLBACK (only after the code rollback):
--   update public.message_templates set sales_starter = false where key = 'academy_message';
