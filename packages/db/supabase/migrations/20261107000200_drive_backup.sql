-- MinIO → Google Drive backup (owner 2026-11-07, docs/45 §5), ADD-ONLY: every night the objects
-- not yet backed up (bucket, key, ETag) go into compressed archive parts on the academy's existing
-- Google connection. Nothing on Drive is ever deleted by the backup. Three tables, written by the
-- API's service role only (the worker's job), read by admins («التكاملات» › «التخزين» status line).
--   * drive_backup_state: one row: the Drive folder (and the account it belongs to), the quota,
--     the last night's named skipped objects and the objects waiting for room on Drive.
--   * drive_backup_archives: one row per archive part on Drive; uploading → done | failed. A
--     failed part's objects are simply sent again the next night under a new part number.
--   * drive_backup_objects: each (bucket, key, ETag) recorded once its part's upload is confirmed:
--     what later nights count as backed up (runs are idempotent and resume after a crash).
-- Expand-only and re-runnable; nothing runs until an admin switches MINIO_DRIVE_BACKUP on.

set local lock_timeout = '5s';

create table if not exists public.drive_backup_state (
  id boolean primary key default true check (id),
  folder_id text check (char_length(folder_id) <= 200),
  account_email text check (char_length(account_email) <= 320),
  quota_limit bigint,
  quota_usage bigint,
  quota_at timestamptz,
  last_run_at timestamptz,
  last_error text check (char_length(last_error) <= 500),
  -- The last night's skipped objects, named (at most 50: bucket/key, size, reason), and how many.
  skipped jsonb not null default '[]'::jsonb check (jsonb_typeof(skipped) = 'array'),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  -- Objects the night could not send because Drive's free space is under the 2 GB reserve.
  waiting integer not null default 0 check (waiting >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.drive_backup_archives (
  id uuid primary key default gen_random_uuid(),
  folder_id text not null check (char_length(folder_id) <= 200),
  label text not null check (label ~ '^\d{4}-\d{2}-\d{2}$'),
  part integer not null check (part between 1 and 10000),
  name text not null check (char_length(name) <= 200),
  status text not null default 'uploading' check (status in ('uploading', 'done', 'failed')),
  objects integer not null default 0 check (objects >= 0),
  skipped integer not null default 0 check (skipped >= 0),
  bytes_raw bigint not null default 0 check (bytes_raw >= 0),
  bytes_compressed bigint not null default 0 check (bytes_compressed >= 0),
  drive_file_id text check (char_length(drive_file_id) <= 200),
  error text check (char_length(error) <= 500),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (folder_id, label, part)
);

create index if not exists drive_backup_archives_folder_idx
  on public.drive_backup_archives (folder_id, started_at);

create table if not exists public.drive_backup_objects (
  folder_id text not null check (char_length(folder_id) <= 200),
  bucket text not null check (char_length(bucket) <= 63),
  key text not null check (char_length(key) <= 1024),
  etag text not null check (char_length(etag) <= 100),
  size bigint not null check (size >= 0),
  archive_id uuid not null references public.drive_backup_archives (id),
  primary key (folder_id, bucket, key, etag)
);

create index if not exists drive_backup_objects_archive_idx
  on public.drive_backup_objects (archive_id);

do $$
declare t text;
begin
  foreach t in array array['drive_backup_state', 'drive_backup_archives', 'drive_backup_objects'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_admin()))', t || '_admin_read', t);
  end loop;
end $$;
