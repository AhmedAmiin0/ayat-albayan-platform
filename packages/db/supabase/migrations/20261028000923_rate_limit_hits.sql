-- State shared by every API copy. Sign-in rate limits (docs/09 «Two API copies + one worker»): the per-IP and
-- per-identifier buckets of the public sign-in routes (SignInLimits) were in memory per process, so two
-- copies behind the load balancer would double every budget. The per-phone send limits, counted in login_codes,
-- also get send:phone buckets here, taken before the send (two copies could each pass the count at once).
--
-- rate_limit_hits: one row per allowed hit. The bucket is a sha256 digest made by the API (never a
-- raw IP or phone number). API-only (service role): RLS on with no policy, no grant to anon / authenticated.
-- rate_limit_take: the sliding window of the old in-memory WindowCounter, race-free: each bucket is locked
-- (transaction advisory lock), counted and, when under its max, hit, in order; the first full bucket answers
-- false and the later ones are not touched (the old `a && b`). Rows older than a day are dropped, 100 per call.
--
-- wa_template_line_syncs: each WhatsApp line's last template sync result (GET /messaging/templates/lines
-- «last sync»), which was kept in the memory of the copy that ran it. API-only, as above.
--
-- Idempotent and expand-only: the previous API never reads or writes them.
-- Rollback: drop function public.rate_limit_take(text[], int[], int); drop table public.rate_limit_hits;
--           drop table public.wa_template_line_syncs;

set local lock_timeout = '5s';

create table if not exists public.rate_limit_hits (
  bucket text not null check (char_length(bucket) between 1 and 100),
  at timestamptz not null default now()
);
create index if not exists rate_limit_hits_bucket_at_idx on public.rate_limit_hits (bucket, at);
create index if not exists rate_limit_hits_at_idx on public.rate_limit_hits (at);
alter table public.rate_limit_hits enable row level security;
revoke all on table public.rate_limit_hits from anon, authenticated;
comment on table public.rate_limit_hits is
  'Sliding-window hits of the public sign-in limits (docs/30 §3), shared by every API copy. Digests only; API (service role) only.';

create or replace function public.rate_limit_take(p_buckets text[], p_maxes int[], p_window_ms int) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_since timestamptz;
  v_n int := coalesce(array_length(p_buckets, 1), 0);
begin
  if p_window_ms is null or p_window_ms <= 0 or v_n <> coalesce(array_length(p_maxes, 1), 0) then
    raise exception 'rate_limit_take: bad arguments';
  end if;
  v_since := v_now - make_interval(secs => p_window_ms / 1000.0);
  delete from public.rate_limit_hits
  where ctid = any (array(select ctid from public.rate_limit_hits where at < v_now - interval '1 day' limit 100));
  for i in 1 .. v_n loop
    perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || p_buckets[i], 0));
    if (select count(*) from public.rate_limit_hits where bucket = p_buckets[i] and at > v_since) >= p_maxes[i] then
      return false;
    end if;
    insert into public.rate_limit_hits (bucket, at) values (p_buckets[i], v_now);
  end loop;
  return true;
end
$$;

revoke all on function public.rate_limit_take(text[], int[], int) from public, anon, authenticated;
grant execute on function public.rate_limit_take(text[], int[], int) to service_role;

create table if not exists public.wa_template_line_syncs (
  line public.wa_line primary key,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  synced_at timestamptz not null default now()
);
alter table public.wa_template_line_syncs enable row level security;
revoke all on table public.wa_template_line_syncs from anon, authenticated;
comment on table public.wa_template_line_syncs is
  'Each WhatsApp line''s last template sync result (TemplateLineSync), shared by every API copy. API (service role) only.';
