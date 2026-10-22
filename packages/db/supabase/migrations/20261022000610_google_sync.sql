-- Google Calendar + Drive + Sheets sync alongside the old Apps Script (owner 2026-10-22, docs/24).
-- One way only (platform → Google), into the SAME calendars, folders and sheets the script uses. The
-- platform only ever updates or deletes the Google objects it created itself and recorded here.
--
-- 1. google_account: the one connected academy account (no token: the refresh token is in Vault).
-- 2. google_teacher_calendars / google_student_files: mappings an admin confirmed.
-- 3. google_sync_items: the outbox, one row per mirrored object, unique (kind, subject_id).
-- 4. Vault: GOOGLE_CLIENT_SECRET joins integration_secret_key_ok; the refresh token has its own
--    service-role functions (google_token_set / _read / _clear), never in the integration overlay.
-- 5. settings: google_sync_enabled false, google_sync_mode dry_run, google_calendar_window_days 60.
--
-- RLS on every table: admins read, only the API (service role) writes. Idempotent; expand-only.

set local lock_timeout = '5s';

do $$ begin
  create type public.google_sync_kind as enum ('teacher_event', 'main_event', 'report_pdf', 'attendance_row', 'summary_row');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.google_sync_state as enum ('pending', 'synced', 'gone', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists public.google_account (
  id boolean primary key default true check (id),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  email text check (char_length(email) <= 320),
  scopes text[] not null default '{}',
  connected_at timestamptz,
  connected_by uuid references auth.users (id),
  last_error text check (char_length(last_error) <= 500),
  -- The pending OAuth round trip: sha256 of the state's nonce, single use, expires (CSRF).
  oauth_nonce_hash text,
  oauth_nonce_expires_at timestamptz,
  -- Discovery (read-only Google calls) and the Drive root an admin confirmed from it.
  discovery jsonb,
  root_folder_id text check (char_length(root_folder_id) <= 200),
  root_folder_name text check (char_length(root_folder_name) <= 300),
  summary_sheet_id text check (char_length(summary_sheet_id) <= 200),
  drive_confirmed_at timestamptz,
  drive_confirmed_by uuid references auth.users (id),
  last_run_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.google_account (id) values (true) on conflict do nothing;

-- teacher_id / student_id carry no FK on purpose: merge_students deletes the merged student and
-- clear:demo refuses cascades into its tables; an orphan mapping row is inert (keyed by id only).
create table if not exists public.google_teacher_calendars (
  teacher_id uuid primary key,
  calendar_id text not null check (char_length(calendar_id) between 1 and 300),
  calendar_name text check (char_length(calendar_name) <= 300),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- folder_id null = confirmed «create a new folder» on the first report; created_by_platform marks
-- a folder and sheet the platform made (it still never deletes them).
create table if not exists public.google_student_files (
  student_id uuid primary key,
  folder_id text check (char_length(folder_id) <= 200),
  attendance_sheet_id text check (char_length(attendance_sheet_id) <= 200),
  summary_row_hint int check (summary_row_hint >= 2),
  created_by_platform boolean not null default false,
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (folder_id is not null or attendance_sheet_id is null)
);

-- subject_id: the lesson (events), the report (report_pdf, attendance_row) or the student (summary_row).
create table if not exists public.google_sync_items (
  id uuid primary key default gen_random_uuid(),
  kind public.google_sync_kind not null,
  subject_id uuid not null,
  lesson_id uuid references public.lessons (id) on delete set null,
  report_id uuid references public.lesson_reports (id) on delete set null,
  student_id uuid,
  -- The Google object the platform created: event / file id, or the sheet range of its row.
  google_id text check (char_length(google_id) <= 300),
  -- Where it lives: calendar id, folder id or spreadsheet id.
  google_parent_id text check (char_length(google_parent_id) <= 300),
  content_hash text check (char_length(content_hash) <= 128),
  state public.google_sync_state not null default 'pending',
  skip_reason text check (skip_reason in ('dry_run', 'teacher_unmapped', 'student_unmapped', 'drive_unconfirmed', 'already_in_sheet', 'not_platform_origin')),
  attempts int not null default 0 check (attempts between 0 and 100),
  next_attempt_at timestamptz not null default now(),
  -- A worker's claim (google_sync_claim); its finish matches claim_token. A change while it is held
  -- sets dirty: the finish records the Google id, then puts the row back in the queue.
  claimed_at timestamptz,
  claim_token uuid,
  dirty boolean not null default false,
  last_error text check (char_length(last_error) <= 500),
  -- dry_run: { method, target, summary } of the request live mode would send (no token, no body).
  planned jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, subject_id)
);
create index if not exists google_sync_items_due_idx on public.google_sync_items (next_attempt_at) where state = 'pending';
create index if not exists google_sync_items_recent_idx on public.google_sync_items (updated_at desc);
create index if not exists google_sync_items_lesson_idx on public.google_sync_items (lesson_id) where lesson_id is not null;

drop trigger if exists google_account_updated_at on public.google_account;
create trigger google_account_updated_at before update on public.google_account
  for each row execute function public.set_updated_at();
drop trigger if exists google_teacher_calendars_updated_at on public.google_teacher_calendars;
create trigger google_teacher_calendars_updated_at before update on public.google_teacher_calendars
  for each row execute function public.set_updated_at();
drop trigger if exists google_student_files_updated_at on public.google_student_files;
create trigger google_student_files_updated_at before update on public.google_student_files
  for each row execute function public.set_updated_at();
drop trigger if exists google_sync_items_updated_at on public.google_sync_items;
create trigger google_sync_items_updated_at before update on public.google_sync_items
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; only the API (service role) writes.
do $$
declare t text;
begin
  foreach t in array array['google_account', 'google_teacher_calendars', 'google_student_files', 'google_sync_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_admin_read', t);
  end loop;
end $$;

-- The secret keys: migration 450's list plus the Google OAuth client secret.
create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET'
  ]);
$$;
revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

-- The refresh token: Vault 'google:refresh_token', service role only, never returned by any view.
create or replace function public.google_token_set(p_value text) returns void
  language plpgsql security definer set search_path = '' as $$
declare existing uuid;
begin
  if p_value is null or btrim(p_value) = '' or octet_length(p_value) > 4096 then
    raise exception 'invalid google token' using errcode = '22023';
  end if;
  select id into existing from vault.secrets where name = 'google:refresh_token';
  if existing is null then
    perform vault.create_secret(p_value, 'google:refresh_token', 'Google sync refresh token (docs/24)');
  else
    perform vault.update_secret(existing, p_value);
  end if;
end;
$$;

create or replace function public.google_token_read() returns text
  language sql stable security definer set search_path = '' as $$
  select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'google:refresh_token';
$$;

create or replace function public.google_token_clear() returns boolean
  language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from vault.secrets where name = 'google:refresh_token';
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke execute on function public.google_token_set(text) from public, anon, authenticated;
revoke execute on function public.google_token_read() from public, anon, authenticated;
revoke execute on function public.google_token_clear() from public, anon, authenticated;
grant execute on function public.google_token_set(text) to service_role;
grant execute on function public.google_token_read() to service_role;
grant execute on function public.google_token_clear() to service_role;

-- Default OFF and dry_run (docs/24 §4): going live is an owner action in the UI.
insert into public.settings (key, value) values
  ('google_sync_enabled', 'false'::jsonb),
  ('google_sync_mode', '"dry_run"'::jsonb),
  ('google_calendar_window_days', '60'::jsonb)
on conflict (key) do nothing;

-- MANUAL ROLLBACK (only after the code rollback):
--   select public.google_token_clear();
--   drop table public.google_sync_items, public.google_student_files, public.google_teacher_calendars, public.google_account;
--   drop function public.google_token_set(text), public.google_token_read(), public.google_token_clear();
--   drop type public.google_sync_state, public.google_sync_kind;
--   delete from public.settings where key like 'google\_%';
--   (and re-run migration 450's integration_secret_key_ok)
