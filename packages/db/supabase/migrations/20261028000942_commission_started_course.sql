-- «If the course already started so dont give commission» (owner 2026-10-28). Twin of @ab/shared
-- assistant/started.ts (subscriptionAlreadyStarted), used by planOn for both kinds.
--   * A subscription ALREADY STARTED when its starts_on is earlier than the Asia/Riyadh calendar day of its
--     created_at, OR its lessons_used_before > 0 (subscription_already_started). Every way a package is made
--     (admin, the sales «اشتراك» / bank transfer with alreadyStarted, the Stripe payment link) lands here.
--   * assistant_commission_plan returns no row for it, 'first' or 'renewal': nothing is earned or reinstated
--     on it. Same-day and future starts are unchanged.
--   * subscription_commission_kind is untouched: a started first package still counts as the first by order,
--     so the next package is a renewal.
--   * No existing row is touched: settle_assistant_commission keeps an earned row while it is fully paid
--     before it ever asks the plan, so this rule never voids one. Nothing is backfilled or rewritten.
-- Idempotent (create or replace); assistant_commission_plan keeps its signature and grants (migration 751).

set local lock_timeout = '5s';

-- True when the course started before the package was recorded; null for an unknown id.
create or replace function public.subscription_already_started(p_subscription uuid) returns boolean
  language sql stable set search_path = '' as $$
  select s.starts_on < (s.created_at at time zone 'Asia/Riyadh')::date or s.lessons_used_before > 0
  from public.subscriptions s where s.id = p_subscription
$$;

-- Migration 751's plan, plus the started check right after the price check.
create or replace function public.assistant_commission_plan(p_assistant uuid, p_brought timestamptz,
  p_subscription uuid, p_kind text)
  returns table (subscription_id uuid, full_at timestamptz, commission_type public.assistant_commission_type,
                 rate numeric, base_amount numeric, base_currency text, amount numeric, currency text,
                 share_percent smallint)
  language plpgsql stable set search_path = '' as $$
declare
  s record;
  t record;
  v_at timestamptz;
  v_tz text;
  v_day date;
  v_share smallint;
  v_amount numeric(12, 2);
  v_currency text;
begin
  select x.id, x.price, x.currency into s from public.subscriptions x where x.id = p_subscription;
  if s.id is null or not (s.price > 0) then
    return;
  end if;
  if public.subscription_already_started(s.id) then
    return; -- the course started before it was recorded: no commission of either kind (owner 2026-10-28)
  end if;
  v_at := public.subscription_full_at(s.id);
  if v_at is null then
    return;
  end if;
  select a.commission_type, a.commission_value, a.commission_currency, a.commission_starts_on into t
    from public.assistant_terms a where a.assistant_id = p_assistant and a.commission_type is not null;
  if not found then
    return;
  end if;
  select coalesce(p.tz, 'Asia/Riyadh') into v_tz from public.profiles p where p.id = p_assistant;
  v_tz := coalesce(v_tz, 'Asia/Riyadh');
  v_day := (v_at at time zone v_tz)::date;
  if v_day < t.commission_starts_on or v_day < (p_brought at time zone v_tz)::date then
    return; -- no retroactive commission: before the terms began, or before the student was brought
  end if;
  if p_kind = 'renewal' then
    if v_at < public.renewal_commission_cutoff() or exists (
        select 1 from public.assistant_commission_exclusions e where e.subscription_id = s.id) then
      return;
    end if;
    v_share := public.renewal_commission_share();
  else
    v_share := 100;
  end if;
  if t.commission_type = 'percent' then
    v_amount := round(s.price * t.commission_value / 100 * v_share / 100, 2);
    v_currency := s.currency;
  else
    v_amount := round(t.commission_value * v_share / 100, 2);
    v_currency := t.commission_currency;
  end if;
  if v_amount <= 0 then
    return;
  end if;
  return query select s.id, v_at, t.commission_type, t.commission_value::numeric, s.price::numeric, s.currency,
                      v_amount::numeric, v_currency, v_share;
end $$;

revoke execute on function public.subscription_already_started(uuid) from public, anon, authenticated;
grant execute on function public.subscription_already_started(uuid) to service_role;

-- MANUAL ROLLBACK (after the code rollback): re-run assistant_commission_plan of migration 20261027000751,
-- then drop function public.subscription_already_started(uuid).
