-- «عمولة التجديد» on / off (owner 2026-11-01: «dont apply the commission on renewal — toggle it off from
-- configuration»). Twin of @ab/shared assistant/renewal.ts (renewalShareNow). Expand only, idempotent.
--   * settings.renewal_commission_enabled (bool, default true: nothing changes until the owner turns it off;
--     missing, JSON null or not a boolean -> true). renewal_commission_percent is kept: it applies while on.
--   * OFF: renewal_commission_share() reads 0, so assistant_commission_plan plans no 'renewal' row (amount 0),
--     on every earn path (the payment and price triggers, set_student_brought_by, the API's evaluate after new
--     terms): all of them reach the plan through evaluate -> settle_assistant_commission. 'first' unchanged.
--   * An EARNED row stays earned (settle keeps it while fully paid before it asks the plan): no void, no
--     clawback. A row voided by a payment change (refund) is not reinstated while off; it is on the next
--     evaluation once on again. An admin's void stays. There is no pending state (earned | voided).
--   * No backfill (as the cutoff of migration 751): a renewal with no row yet evaluated while off and fully
--     paid is recorded in assistant_commission_exclusions ('renewal_off'), so turning the switch on again
--     never mints a commission for a renewal paid while it was off.
-- SQL test plan: e2e/tests/finance/assistant-renewal-commission-toggle.sql.spec.ts.

set local lock_timeout = '5s';

-- The «القيم» switch (registry default true). Service role only, like renewal_commission_share.
create or replace function public.renewal_commission_enabled() returns boolean
  language sql stable set search_path = '' as $$
  select coalesce((
    select s.value = 'true'::jsonb from public.settings s
     where s.key = 'renewal_commission_enabled' and jsonb_typeof(s.value) = 'boolean'
  ), true)
$$;

-- Migration 751's share while on; 0 while off (the plan then earns nothing: amount 0).
create or replace function public.renewal_commission_share() returns smallint
  language sql stable set search_path = '' as $$
  select case when public.renewal_commission_enabled() then
           coalesce((select least(greatest(round((s.value #>> '{}')::numeric), 0), 100)
                       from public.settings s
                      where s.key = 'renewal_commission_percent' and jsonb_typeof(s.value) = 'number'), 50)
         else 0 end::smallint
$$;

-- The third reason: fully paid while the switch was off.
alter table public.assistant_commission_exclusions
  drop constraint if exists assistant_commission_exclusions_reason_check;
alter table public.assistant_commission_exclusions
  add constraint assistant_commission_exclusions_reason_check
  check (reason in ('paid_before_cutoff', 'student_merged', 'renewal_off'));

-- Migration 751's evaluator, plus the 'renewal_off' snapshot next to the cutoff's.
create or replace function public.evaluate_assistant_commission(p_subscription uuid) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid;
  v_assistant uuid;
  v_brought timestamptz;
  f record;
  r record;
  v_candidate uuid;
  v_first uuid;
  v_renewal uuid;
begin
  select s.student_id into v_student from public.subscriptions s where s.id = p_subscription;
  if v_student is null then
    return null;
  end if;
  select st.brought_by, st.brought_at into v_assistant, v_brought
    from public.students st where st.id = v_student for share;
  if v_assistant is null and not exists (select 1 from public.assistant_commissions x where x.student_id = v_student) then
    return null; -- nobody brought this student: the common case
  end if;
  perform pg_advisory_xact_lock(hashtextextended('assistant_commission:' || v_student, 0));
  -- Every statement holding one of the student's rows, before any row (the order of build / approve / void).
  perform 1 from public.assistant_statements st
   where st.id in (select x.statement_id from public.assistant_commissions x where x.student_id = v_student)
   order by st.id for update;

  -- 'first': today's rule over its candidates (the first subscription by order unless it holds a renewal
  -- row, and the subscription the row is already on), the first fully paid of them.
  select x.id, x.subscription_id into f from public.assistant_commissions x
   where x.student_id = v_student and x.kind = 'first';
  select s.id into v_candidate
    from public.subscriptions s
    cross join lateral (select public.subscription_full_at(s.id) as at) a
   where s.student_id = v_student and a.at is not null
     and (s.id = f.subscription_id
          or (public.subscription_commission_kind(s.id) = 'first'
              and not exists (select 1 from public.assistant_commissions x
                               where x.subscription_id = s.id and x.kind = 'renewal')))
   order by a.at, s.created_at, s.id limit 1;
  v_first := public.settle_assistant_commission('first', f.id, v_assistant, v_brought, v_candidate, v_student);

  -- 'renewal': this subscription's own row; a new one only on a renewal (by order) holding no row yet.
  select x.id, x.kind into r from public.assistant_commissions x where x.subscription_id = p_subscription;
  if r.id is null and public.subscription_full_at(p_subscription) < public.renewal_commission_cutoff() then
    -- Seen fully paid before the cutoff: never a renewal commission, whatever is edited later.
    insert into public.assistant_commission_exclusions (subscription_id, reason)
    values (p_subscription, 'paid_before_cutoff') on conflict do nothing;
  end if;
  if r.id is null and not public.renewal_commission_enabled()
     and public.subscription_full_at(p_subscription) is not null
     and public.subscription_commission_kind(p_subscription) = 'renewal' then
    -- A renewal fully paid while «عمولة التجديد» is off: never a commission, even once it is on again.
    insert into public.assistant_commission_exclusions (subscription_id, reason)
    values (p_subscription, 'renewal_off') on conflict do nothing;
  end if;
  if r.kind = 'renewal' or (r.id is null and public.subscription_commission_kind(p_subscription) = 'renewal') then
    v_renewal := public.settle_assistant_commission('renewal', r.id, v_assistant, v_brought, p_subscription, v_student);
  end if;
  return coalesce(v_renewal, v_first);
end $$;

-- On (true) until the owner turns it off; an existing row is never touched.
insert into public.settings (key, value) values ('renewal_commission_enabled', 'true'::jsonb)
on conflict (key) do nothing;

revoke execute on function public.renewal_commission_enabled() from public, anon, authenticated;
grant execute on function public.renewal_commission_enabled() to service_role;

-- MANUAL ROLLBACK (after the code rollback): re-run renewal_commission_share and evaluate_assistant_commission
-- of migration 20261027000751; delete from public.assistant_commission_exclusions where reason = 'renewal_off'
-- (only if those renewals may earn again), re-add the two-reason check; drop function
-- public.renewal_commission_enabled(); delete from public.settings where key = 'renewal_commission_enabled'.
