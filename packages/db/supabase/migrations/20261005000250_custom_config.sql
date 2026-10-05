-- Custom config (owner request 2026-10-05): free-form admin entries beside the typed settings, and
-- an activity-log retention that reads settings.activity_retention_days instead of a fixed 180.
-- Idempotent: safe to run twice.

create table if not exists public.custom_config (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  value jsonb not null check (octet_length(value::text) <= 8192),
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

drop trigger if exists custom_config_updated_at on public.custom_config;
create trigger custom_config_updated_at before update on public.custom_config
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; the API (service role) writes, like public.settings. Nothing is
-- readable directly by anyone else; public entries are served by the API's GET /settings/public
-- (service role), which whitelists is_public itself.
alter table public.custom_config enable row level security;
revoke all on public.custom_config from anon;
drop policy if exists custom_config_admin_read on public.custom_config;
create policy custom_config_admin_read on public.custom_config for select to authenticated
  using (public.is_admin());
drop policy if exists custom_config_admin_write on public.custom_config;

-- Retention: settings.activity_retention_days (default 180 when the row is missing or malformed,
-- the old fixed value). Same contract as before: deleting by cutoff twice deletes nothing the
-- second time.
create or replace function public.prune_activity_log() returns int
  language plpgsql security definer set search_path = '' as $$
declare
  n int;
  days int := 180;
  stored jsonb;
begin
  select value into stored from public.settings where key = 'activity_retention_days';
  if stored is not null and jsonb_typeof(stored) = 'number' and (stored #>> '{}') ~ '^[1-9][0-9]{0,3}$' then
    days := (stored #>> '{}')::int;
  end if;
  delete from public.activity_log where at < now() - make_interval(days => days);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.prune_activity_log() from public, anon, authenticated;
grant execute on function public.prune_activity_log() to service_role;
