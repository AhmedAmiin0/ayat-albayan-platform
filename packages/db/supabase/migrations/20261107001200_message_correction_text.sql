-- «تعديل» follow-up (review of #694, items 2-3): a correction keeps the text staff typed, without
-- any «تصحيح: » prefix, so an exact retry of its request id is recognised whatever the prefix's
-- wording is now (admins may reword it in «الترجمات» after the first send).
--   * messages.correction_text: set by the API only, on a row that carries corrects_id; null on
--     every other row and on corrections sent before this migration (the API then compares bodies).
-- Expand-only and re-runnable: a nullable column, no default, no backfill, no new index; messages
-- keeps its RLS (admins read, only the API writes).
-- ROLLBACK (manual, after the code rollback):
--   alter table public.messages drop column if exists correction_text;
set local lock_timeout = '5s';

alter table public.messages add column if not exists correction_text text;

comment on column public.messages.correction_text is
  'تصحيح: the correction''s own text without its prefix (an exact retry is recognised); API only';
