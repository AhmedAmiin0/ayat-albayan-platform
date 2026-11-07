-- MinIO → Google Drive backup (owner 2026-11-07, docs/45 §5): compressed archives of the MinIO
-- buckets uploaded on the academy's existing Google connection. Three tables, written by the API's
-- service role only (the worker's job), read by admins («التكاملات» › «التخزين» status line).
--   * drive_backup_state: one row, the Drive folder (and the account it belongs to), the quota.
--   * drive_backup_archives: one row per archive file on Drive (a part of a nightly incremental or
--     a weekly full); status uploading → done | failed, then trashed by retention (the file is
--     deleted from Drive for good, not moved to its trash).
--   * drive_backup_objects: the objects (with ETags) each archive holds: what later runs count as
--     covered, so runs are idempotent and resume after a crash. Rows go with their archive.
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
  updated_at timestamptz not null default now()
);

create table if not exists public.drive_backup_archives (
  id uuid primary key default gen_random_uuid(),
  folder_id text not null check (char_length(folder_id) <= 200),
  kind text not null check (kind in ('incr', 'full')),
  label text not null check (label ~ '^\d{4}-(\d{2}-\d{2}|W\d{2})$'),
  part integer not null check (part between 1 and 10000),
  name text not null check (char_length(name) <= 200),
  status text not null default 'uploading'
    check (status in ('uploading', 'done', 'failed', 'trashed')),
  sealed boolean not null default false,
  objects integer not null default 0 check (objects >= 0),
  skipped integer not null default 0 check (skipped >= 0),
  bytes_raw bigint not null default 0 check (bytes_raw >= 0),
  bytes_compressed bigint not null default 0 check (bytes_compressed >= 0),
  drive_file_id text check (char_length(drive_file_id) <= 200),
  error text check (char_length(error) <= 500),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (folder_id, kind, label, part)
);

create index if not exists drive_backup_archives_folder_idx
  on public.drive_backup_archives (folder_id, started_at);

create table if not exists public.drive_backup_objects (
  archive_id uuid not null references public.drive_backup_archives (id) on delete cascade,
  bucket text not null check (char_length(bucket) <= 63),
  key text not null check (char_length(key) <= 1024),
  etag text not null check (char_length(etag) <= 100),
  size bigint not null check (size >= 0),
  primary key (archive_id, bucket, key)
);

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
