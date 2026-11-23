-- messages.media_refusal (R-MSG-06, R-NFR-07): the answer a file got the first time it was
-- opened, when that answer is final: 'invoice_too_large' (past the chat file cap) or
-- 'media_expired' (the provider refused the media id). A later view answers the same error from
-- the row instead of asking the provider again. A timeout or a 5xx is never stored: a retry may
-- work. Null for every existing row.
--
-- Expand-only and idempotent: a nullable column with no default is a catalog change; the check is
-- added NOT VALID (existing rows are all null) and validated without blocking writers.
-- ROLLBACK (manual, after the code rollback):
--   alter table public.messages drop column if exists media_refusal;

set local lock_timeout = '5s';

alter table public.messages add column if not exists media_refusal text;

alter table public.messages drop constraint if exists messages_media_refusal_check;
alter table public.messages add constraint messages_media_refusal_check
  check (media_refusal in ('invoice_too_large', 'media_expired')) not valid;
alter table public.messages validate constraint messages_media_refusal_check;
