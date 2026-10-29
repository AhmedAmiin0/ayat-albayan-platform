-- Family accounts (docs/30 §4, owner 2026-10-29: «For login make it with chat number»): the sign-in /
-- password code template `account_code` moves from the notifications line to the CHAT line, so the
-- templates page submits it to the chat line's WABA and the health sync reads it there. The API sends
-- codes on the chat line only (CodeSend), whatever this row says.
--
-- Its Meta state belonged to the notifications WABA, so it starts over as not_submitted with no number
-- of its own (the reset of «نقل إلى الرقم الآخر», template-move.ts): the owner submits it on the chat
-- line; the sync then marks it approved. Idempotent: a row already on chat is left as it is.

set local lock_timeout = '5s';

update public.message_templates
set line = 'chat',
  status = 'not_submitted',
  meta_id = null,
  quality = null,
  last_error = null,
  submitted_at = null,
  last_checked_at = null,
  number_id = null
where key = 'account_code'
  and line <> 'chat';

-- RLS / grants: unchanged (migration 141: RLS on, admin read policy; only the API writes).
--
-- MANUAL ROLLBACK (only after the code rollback):
--   update public.message_templates set line = 'notifications', status = 'not_submitted', meta_id = null, number_id = null
--   where key = 'account_code';
