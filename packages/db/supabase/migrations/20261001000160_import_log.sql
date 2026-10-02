-- Import log for tools/migrate (R-MIG-01, R-MIG-02; rule 8). One import_runs row per `apply`;
-- import_items maps each imported record's natural key to the row it became, so re-running an
-- import updates or skips instead of inserting twice. Written only by tools/migrate over a direct
-- Postgres connection (bypasses RLS); admins may read it.
create type public.import_run_status as enum ('running', 'succeeded', 'failed');

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  target text not null check (target in ('local', 'staging', 'production')),
  status public.import_run_status not null default 'running',
  -- Source fingerprints: { zip, zip_sha256, crm_cursor } — no personal data.
  sources jsonb not null default '{}'::jsonb,
  -- { entity: { create, update, skip, adopt, reject, review } }
  counts jsonb not null default '{}'::jsonb,
  git_sha text,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (status = 'running' or finished_at is not null)
);
create index import_runs_started_idx on public.import_runs (started_at desc);

create table public.import_items (
  id uuid primary key default gen_random_uuid(),
  -- tools/migrate EntityName: target table name, or 'report_pdfs' for Storage objects.
  entity text not null,
  -- tools/migrate/src/keys.ts; stable across runs.
  natural_key text not null,
  target_table text not null,
  -- The row it became. null for link tables keyed by their parents (lesson_students …) and for
  -- Storage objects (target_path holds the object path).
  target_id uuid,
  target_path text,
  -- sha256 of the planned record; equal hash on the next run = skip.
  payload_hash text not null,
  -- { source, tab, row, file? } of the winning source row.
  source_ref jsonb not null default '{}'::jsonb,
  first_run_id uuid not null references public.import_runs (id),
  last_run_id uuid not null references public.import_runs (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity, natural_key)
);
create index import_items_target_idx on public.import_items (target_table, target_id);
create index import_items_last_run_idx on public.import_items (last_run_id);
create trigger import_items_updated_at before update on public.import_items
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; nobody writes through the API roles.
alter table public.import_runs enable row level security;
alter table public.import_items enable row level security;
create policy import_runs_admin_read on public.import_runs for select to authenticated
  using (public.is_admin());
create policy import_items_admin_read on public.import_items for select to authenticated
  using (public.is_admin());

revoke all on public.import_runs, public.import_items from anon;
revoke insert, update, delete, truncate, references, trigger on public.import_runs,
  public.import_items from authenticated;
