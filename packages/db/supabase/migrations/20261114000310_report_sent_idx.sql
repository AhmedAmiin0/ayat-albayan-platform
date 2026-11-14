-- The family pushes' sweep (FamilyPushJob, every minute, docs/50 §5 item 6) asks for the reports sent
-- to the family lately:
--   select … from lesson_reports where sent_at >= now() - interval '2 hours' order by sent_at limit 500
-- lesson_reports had no index on sent_at, so each pass would scan every report ever written. The
-- partial index holds the sent ones only (drafts and unsent reports stay out of it).
-- Idempotent (if not exists), expand-only. RLS / grants: unchanged (an index has none).

set local lock_timeout = '5s';

create index if not exists lesson_reports_sent_at_idx on public.lesson_reports (sent_at)
  where sent_at is not null;

-- MANUAL ROLLBACK (any time: the code works without the index, only slower):
--   drop index if exists public.lesson_reports_sent_at_idx;
