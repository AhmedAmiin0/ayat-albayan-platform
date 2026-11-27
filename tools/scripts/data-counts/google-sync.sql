-- Counts the google sync rows the status and sync item answer schemas would refuse (docs/62 Decisions, read-only).
-- count: google_sync_items_total
select count(*) from public.google_sync_items;

-- count: google_sync_items_unknown_kind_or_state
select count(*) from public.google_sync_items
where kind not in ('teacher_event', 'main_event', 'report_pdf', 'attendance_row', 'summary_row')
  or state not in ('pending', 'synced', 'gone', 'failed', 'skipped');

-- count: google_sync_items_unknown_skip_reason
select count(*) from public.google_sync_items
where skip_reason is not null and skip_reason not in ('dry_run', 'teacher_unmapped',
  'student_unmapped', 'drive_unconfirmed', 'already_in_sheet', 'not_platform_origin',
  'script_event_present');

-- count: google_sync_items_bad_attempts_or_time
select count(*) from public.google_sync_items where attempts is null or attempts < 0 or updated_at is null;

-- count: google_account_unknown_status
select count(*) from public.google_account
where status is null or status not in ('disconnected', 'connected', 'error');
