-- Counts the drive backup rows the status view schema would refuse (docs/62 Decisions, read-only).
-- The skip reasons and timestamps are already checked by the repo's parse and the column types.
-- count: drive_backup_state_rows
select count(*) from public.drive_backup_state;

-- count: drive_backup_state_negative_quota
select count(*) from public.drive_backup_state where quota_limit < 0 or quota_usage < 0;

-- count: drive_backup_state_quota_without_time
select count(*) from public.drive_backup_state where quota_usage is not null and quota_at is null;

