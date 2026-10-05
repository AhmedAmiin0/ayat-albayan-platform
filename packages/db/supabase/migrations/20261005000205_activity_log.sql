-- Activity log (owner, 2026-10-05: "add user tracker/logger for all the actions"). One row per
-- mutating API request (POST/PUT/PATCH/DELETE) and per sign-in / sign-out, written by the API's
-- global ActivityInterceptor with the service role. Append-only: nobody updates or deletes a row;
-- only prune_activity_log() removes rows older than 180 days.
-- Never stored: request/response bodies, query strings, passwords, tokens, phone numbers, message
-- text, file contents. `route` is the route PATTERN ('/students/:id'), never the raw URL; `meta`
-- holds only small non-sensitive facts (e.g. the NAMES of the fields sent).
-- audit_log (before/after of money, merges, reports) stays as it is.
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_role text not null default 'public',
  action text not null check (length(action) between 1 and 120),
  method text not null check (method in ('POST', 'PUT', 'PATCH', 'DELETE')),
  route text not null check (length(route) <= 200),
  entity text check (length(entity) <= 60),
  entity_id text check (length(entity_id) <= 64),
  status int not null check (status between 100 and 599),
  duration_ms int not null default 0 check (duration_ms >= 0),
  ip inet,
  user_agent text check (length(user_agent) <= 200),
  meta jsonb not null default '{}'::jsonb check (pg_column_size(meta) <= 2048)
);
create index activity_log_at_idx on public.activity_log (at desc);
create index activity_log_actor_idx on public.activity_log (actor_id, at desc);
create index activity_log_entity_idx on public.activity_log (entity, entity_id, at desc);

alter table public.activity_log enable row level security;
create policy activity_log_admin_read on public.activity_log for select to authenticated
  using (public.is_admin());

-- Append-only: clients never write; the API (service role) only inserts.
revoke all on public.activity_log from anon;
revoke insert, update, delete, truncate on public.activity_log from authenticated;
revoke update, delete, truncate on public.activity_log from service_role;

-- The admin list (سجل النشاط): the actor's display name beside each row. security_invoker so the
-- table's RLS applies to the caller (a non-admin sees no rows).
create view public.v_activity_log with (security_invoker = true) as
  select a.id, a.at, a.actor_id, a.actor_role, p.full_name as actor_name, a.action, a.method,
         a.route, a.entity, a.entity_id, a.status, a.duration_ms, a.meta
  from public.activity_log a
  left join public.profiles p on p.id = a.actor_id;
revoke all on public.v_activity_log from anon;
grant select on public.v_activity_log to authenticated;

-- Retention: 180 days. Run by the API's ActivityRetentionJob (pg_cron is not used in this repo).
-- Idempotent: deleting by cutoff twice deletes nothing the second time. Security definer because
-- the service role itself has no DELETE on the table.
create function public.prune_activity_log() returns int
  language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  delete from public.activity_log where at < now() - interval '180 days';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.prune_activity_log() from public, anon, authenticated;
grant execute on function public.prune_activity_log() to service_role;
