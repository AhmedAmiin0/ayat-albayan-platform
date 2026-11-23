-- Domain events outbox (docs/57 E1, §4.4 item 1; R-NFR-07, R-MSG-02). A producer RPC calls
-- enqueue_domain_event inside its own transaction, so the event exists iff the change committed.
-- The API's EventTransport (OutboxTickerTransport today; a queue adapter would relay these rows)
-- claims due rows with a per-pass token, runs the handler and finishes the whole batch in one call:
-- done, a jittered retry (next_attempt_at), or parked after N attempts (kept with last_error,
-- never dropped). id is the dedup key (rule 8): enqueueing a known id is a no-op.
-- RLS on, no client grants: only the service role reads and writes. Times UTC.
-- Idempotent, expand-only.

set local lock_timeout = '5s';

create table if not exists public.domain_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid,
  processed_at timestamptz,
  parked_at timestamptz,
  last_error text,
  constraint domain_events_shape_check check (
    char_length(kind) between 1 and 100
    and jsonb_typeof(payload) = 'object'
    and attempts >= 0
    and char_length(coalesce(last_error, '')) <= 500
    and not (processed_at is not null and parked_at is not null)
  )
);

comment on table public.domain_events is
  'Transactional outbox of domain events (docs/57 §4.4): written by enqueue_domain_event, drained by the API.';

-- The drain: open rows by due time. Partial, so processed and parked rows never cost a tick.
create index if not exists domain_events_due_idx on public.domain_events (next_attempt_at, occurred_at)
  where processed_at is null and parked_at is null;

alter table public.domain_events enable row level security;
revoke all on public.domain_events from anon, authenticated;

create or replace function public.enqueue_domain_event(
  p_kind text, p_payload jsonb, p_id uuid default gen_random_uuid()
) returns uuid
  language sql security definer set search_path = '' as $$
  insert into public.domain_events (id, kind, payload)
  values (p_id, p_kind, coalesce(p_payload, '{}'::jsonb))
  on conflict (id) do nothing;
  select p_id;
$$;

-- A claim older than p_stale_before belongs to a worker that died mid-pass: claimed again.
create or replace function public.claim_domain_events(p_limit int, p_token uuid, p_stale_before timestamptz)
  returns setof public.domain_events
  language sql security definer set search_path = '' as $$
  update public.domain_events e set claimed_at = now(), claimed_by = p_token
  where e.id in (select c.id from public.domain_events c
                 where c.processed_at is null and c.parked_at is null and c.next_attempt_at <= now()
                   and (c.claimed_at is null or c.claimed_at < p_stale_before)
                 order by c.next_attempt_at, c.occurred_at
                 limit least(greatest(p_limit, 1), 100)
                 for update skip locked)
  returning e.*;
$$;

-- p_results: [{id, state: done|retry|parked, at, error}]. Only rows this pass still holds change,
-- so a pass whose claim went stale and was taken over cannot overwrite the newer outcome.
create or replace function public.finish_domain_events(p_token uuid, p_results jsonb) returns int
  language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.domain_events e set
    attempts = e.attempts + 1,
    processed_at = case when r.state = 'done' then now() end,
    parked_at = case when r.state = 'parked' then now() end,
    next_attempt_at = case when r.state = 'retry' then coalesce(r.at, now()) else e.next_attempt_at end,
    last_error = coalesce(left(r.error, 500), e.last_error),
    claimed_at = null, claimed_by = null
  from jsonb_to_recordset(p_results) r (id uuid, state text, at timestamptz, error text)
  where e.id = r.id and e.claimed_by = p_token and r.state in ('done', 'retry', 'parked');
  get diagnostics n = row_count;
  return n;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'enqueue_domain_event(text, jsonb, uuid)', 'claim_domain_events(int, uuid, timestamptz)',
    'finish_domain_events(uuid, jsonb)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- MANUAL ROLLBACK (only after the code rollback; no producer may call enqueue_domain_event then):
--   drop function public.finish_domain_events(uuid, jsonb), public.claim_domain_events(int, uuid, timestamptz),
--     public.enqueue_domain_event(text, jsonb, uuid);
--   drop table public.domain_events;
