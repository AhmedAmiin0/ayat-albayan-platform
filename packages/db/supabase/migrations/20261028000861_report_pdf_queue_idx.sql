-- API round trips (owner 2026-10-27: «The API gets slowed»). The report PDF worker (ReportPdfJob, every
-- minute) now asks one cheap question per idle tick instead of an update + a read:
--   select id from lesson_reports where pdf_status in ('pending', 'rendering') limit 1
-- and, when there is work, the stale recovery and the pending read of the same rows:
--   update lesson_reports set pdf_status = 'pending' where pdf_status = 'rendering' and updated_at < $1
--   select id from lesson_reports where status = 'submitted' and pdf_status = 'pending' order by updated_at limit 20
-- lesson_reports had no index on pdf_status, so each was a scan of every report ever written. The partial
-- index holds only the queue (a handful of rows; ready/failed rows are not in it). Idempotent, expand-only.

set local lock_timeout = '5s';

create index if not exists lesson_reports_pdf_queue_idx on public.lesson_reports (updated_at)
  where pdf_status in ('pending', 'rendering');

-- MANUAL ROLLBACK (any time: the code works without the index):
--   drop index if exists public.lesson_reports_pdf_queue_idx;
