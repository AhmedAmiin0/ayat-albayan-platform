-- Renewal commission, step 2: the rules (owner 2026-10-26). Twin of @ab/shared assistant/renewal.ts.
--   * KIND is decided by subscription ORDER, never by payment order, and never flips once a row exists: a
--     priced (price > 0) subscription is 'first' when no other priced subscription of the student was
--     created earlier (created_at, id), else 'renewal' (subscription_commission_kind). A trial (price 0)
--     never counts.
--   * 'first' keeps today's rule (migration 272): at most one per student, earned when fully paid, on or
--     after commission_starts_on and the day the student was brought (the assistant's tz). Its candidates
--     are the first subscription by order and the subscription an existing 'first' row already sits on.
--   * 'renewal': one per renewal subscription, earned when it becomes fully paid (subscription_full_at),
--     the student has brought_by, the assistant has terms, the same two days pass AND the fully paid instant
--     is on or after renewal_commission_cutoff() (no backfill). Amount: percent -> round(price x rate/100 x share/100) in
--     the subscription currency; fixed -> commission_value x share/100 in the commission currency. share =
--     settings.renewal_commission_percent (default 50), copied onto the row when earned.
--   * Each row is voided / reinstated / reversed in a statement by itself exactly as today: a late payment
--     on one subscription never touches another subscription's row.
--   * A renewal never earns on a subscription in assistant_commission_exclusions: one seen fully paid before
--     the cutoff (snapshotted here, then recorded by the evaluator; sticky, so a later paid_at edit, refund +
--     repay or price change cannot move it past the cutoff and mint one) or one whose 'first' row a student
--     merge dropped.
--   * Attribution stays students.brought_by.

set local lock_timeout = '5s';

-- The renewal cutoff, one named constant for the plan and the evaluator.
create or replace function public.renewal_commission_cutoff() returns timestamptz
  language sql immutable set search_path = '' as $$
  -- Renewals fully paid before this instant never earn (owner 2026-10-26: no backfill, so a payment edit on
  -- an older renewal cannot mint a commission): 2026-10-27 00:00 Asia/Riyadh.
  select timestamptz '2026-10-27 00:00:00+03'
$$;

-- Subscriptions that never earn a renewal commission (service role only, RLS without policies).
create table if not exists public.assistant_commission_exclusions (
  subscription_id uuid primary key references public.subscriptions (id) on delete cascade,
  reason text not null check (reason in ('paid_before_cutoff', 'student_merged')),
  created_at timestamptz not null default now()
);
alter table public.assistant_commission_exclusions enable row level security;
revoke all on public.assistant_commission_exclusions from anon, authenticated;

-- settings.renewal_commission_percent (0..100); missing, null or not a number -> 50.
create or replace function public.renewal_commission_share() returns smallint
  language sql stable set search_path = '' as $$
  select coalesce((select least(greatest(round((s.value #>> '{}')::numeric), 0), 100)
                     from public.settings s
                    where s.key = 'renewal_commission_percent' and jsonb_typeof(s.value) = 'number'), 50)::smallint
$$;

-- 'first' | 'renewal' for a priced subscription by creation order; null for a free one (or none).
create or replace function public.subscription_commission_kind(p_subscription uuid) returns text
  language sql stable set search_path = '' as $$
  select case when s.price > 0 then
           case when exists (select 1 from public.subscriptions o
                              where o.student_id = s.student_id and o.price > 0 and o.id <> s.id
                                and (o.created_at, o.id) < (s.created_at, s.id))
                then 'renewal' else 'first' end
         end
  from public.subscriptions s where s.id = p_subscription
$$;

-- What a row of `p_kind` on this subscription would earn now; no row when nothing is earned.
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

-- One row's decision (migration 272's evaluator, per row): keep while still fully paid; void when not;
-- an admin's void stays; earn / reinstate on `p_candidate` when it plans. Callers hold the student locks.
create or replace function public.settle_assistant_commission(p_kind text, p_row uuid, p_assistant uuid,
  p_brought timestamptz, p_candidate uuid, p_student uuid) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare
  c record;
  p record;
  v_stmt uuid;
  v_id uuid;
begin
  -- The statement before the commission row (lock order: statement, then commission).
  select x.statement_id into v_stmt from public.assistant_commissions x where x.id = p_row;
  if v_stmt is not null then
    perform 1 from public.assistant_statements s where s.id = v_stmt for update;
  end if;
  select * into c from public.assistant_commissions x where x.id = p_row for update;
  if c.id is not null and c.status = 'earned' then
    if c.subscription_id is not null and public.subscription_full_at(c.subscription_id) is not null then
      return c.id;
    end if;
    perform public.void_assistant_commission_row(c.id, 'payment_voided', true, null);
    select * into c from public.assistant_commissions x where x.id = p_row;
  end if;
  if c.id is not null and not c.void_auto then
    return c.id; -- an admin voided it: it stays voided
  end if;
  if p_assistant is null or p_candidate is null then
    return null;
  end if;
  select * into p from public.assistant_commission_plan(p_assistant, p_brought, p_candidate, p_kind);
  if p.subscription_id is null then
    return null;
  end if;

  if c.id is null then
    insert into public.assistant_commissions (assistant_id, student_id, subscription_id, kind, share_percent,
        commission_type, rate, base_amount, base_currency, amount, currency, earned_at)
    values (p_assistant, p_student, p.subscription_id, p_kind, p.share_percent, p.commission_type, p.rate,
            p.base_amount, p.base_currency, p.amount, p.currency, p.full_at)
    returning id into v_id;
  elsif c.assistant_id = p_assistant and c.subscription_id = p.subscription_id and exists (
      select 1 from public.assistant_adjustments a
       where a.commission_id = c.id and a.kind = 'reversal' and a.statement_id is null) then
    -- The void is undone before its reversal reached a statement: the two cancel out, the row keeps what
    -- it was earned as (amount, share) and its line in the statement it is already in.
    delete from public.assistant_adjustments
     where commission_id = c.id and kind = 'reversal' and statement_id is null;
    update public.assistant_commissions
       set status = 'earned', voided_at = null, void_reason = null, void_auto = null
     where id = c.id;
    v_id := c.id;
  else
    -- Reinstated as a new earning of the CURRENT assistant at today's terms and share; its kind never flips.
    update public.assistant_commissions
       set assistant_id = p_assistant, subscription_id = p.subscription_id, commission_type = p.commission_type,
           rate = p.rate, base_amount = p.base_amount, base_currency = p.base_currency, amount = p.amount,
           currency = p.currency, share_percent = p.share_percent, earned_at = p.full_at, status = 'earned',
           voided_at = null, void_reason = null, void_auto = null, statement_id = null
     where id = c.id;
    v_id := c.id;
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values (null, 'assistant_commissions', v_id, case when c.id is null then 'earn' else 'reinstate' end,
          jsonb_build_object('assistant_id', p_assistant, 'student_id', p_student, 'subscription_id', p.subscription_id,
                             'kind', p_kind, 'share_percent', p.share_percent, 'amount', p.amount, 'currency', p.currency));
  return v_id;
end $$;

-- After every payment insert / update / delete and a price change (the triggers of migration 272): the
-- student's 'first' row, then the 'renewal' row of this subscription. Race-safe as before: the student row
-- FOR SHARE (attribution holds it FOR UPDATE), one advisory lock per student, unique indexes behind both.
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
  if r.kind = 'renewal' or (r.id is null and public.subscription_commission_kind(p_subscription) = 'renewal') then
    v_renewal := public.settle_assistant_commission('renewal', r.id, v_assistant, v_brought, p_subscription, v_student);
  end if;
  return coalesce(v_renewal, v_first);
end $$;

-- Admin attribution (migration 273): refused while the student has ANY live commission (a 'first' or a
-- 'renewal' row) with another assistant; afterwards every priced subscription is evaluated, oldest first.
create or replace function public.set_student_brought_by(p_student uuid, p_assistant uuid, p_actor uuid,
  p_brought_at timestamptz default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s record;
  v_sub uuid;
begin
  select * into s from public.students where id = p_student for update;
  if not found then
    raise exception 'student_not_found' using errcode = 'P0001';
  end if;
  if s.brought_by is not distinct from p_assistant and (p_brought_at is null or s.brought_at = p_brought_at) then
    return jsonb_build_object('student_id', p_student, 'changed', false);
  end if;
  if s.brought_by is distinct from p_assistant and exists (
      select 1 from public.assistant_commissions c where c.student_id = p_student and c.status = 'earned') then
    raise exception 'commission_exists' using errcode = 'P0001';
  end if;
  update public.students
     set brought_by = p_assistant,
         brought_at = case when p_assistant is null then null
                           else coalesce(p_brought_at, case when s.brought_by = p_assistant then s.brought_at end, now()) end
   where id = p_student;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'students', p_student, 'brought_by',
          jsonb_build_object('brought_by', s.brought_by, 'brought_at', s.brought_at),
          jsonb_build_object('brought_by', p_assistant, 'brought_at', (select brought_at from public.students where id = p_student)));
  for v_sub in select x.id from public.subscriptions x where x.student_id = p_student and x.price > 0
               order by x.created_at, x.id loop
    perform public.evaluate_assistant_commission(v_sub);
  end loop;
  return jsonb_build_object('student_id', p_student, 'changed', true);
end $$;

-- merge_students (020) re-points every FK to students: every row moves to the kept student, except a
-- 'first' row when the kept student already has one (today's clash: reversed when frozen in a statement,
-- dropped, audited; a draft is rebuilt). Renewal rows are one per subscription and simply move.
create or replace function public.assistant_commissions_merge() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  st record;
begin
  if old.kind <> 'first' or not exists (select 1 from public.assistant_commissions x
                                         where x.student_id = new.student_id and x.kind = 'first') then
    return new;
  end if;
  select * into st from public.assistant_statements where id = old.statement_id for update;
  if old.status = 'earned' and st.id is not null and st.status <> 'draft' then
    insert into public.assistant_adjustments (assistant_id, commission_id, kind, amount, currency, reason, effective_month)
    values (old.assistant_id, old.id, 'reversal', -old.amount, old.currency, 'student_merged',
            public.assistant_next_open_month(old.assistant_id));
  end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (null, 'assistant_commissions', old.id, 'merge_dropped',
          jsonb_build_object('student_id', old.student_id, 'status', old.status, 'amount', old.amount,
                             'currency', old.currency),
          jsonb_build_object('kept_student_id', new.student_id));
  delete from public.assistant_commissions where id = old.id;
  -- Its subscription would otherwise earn again later as the kept student's renewal.
  if old.subscription_id is not null then
    insert into public.assistant_commission_exclusions (subscription_id, reason)
    values (old.subscription_id, 'student_merged') on conflict do nothing;
  end if;
  if st.id is not null and st.status = 'draft' then
    perform public.build_assistant_statement(st.id);
  end if;
  return null;
end $$;

-- One row per brought student as before (the 'first' commission in the same columns), plus how many
-- renewal commissions are earned: aggregated, never a second row per student. Columns only appended.
create or replace view public.v_assistant_students with (security_invoker = false) as
  select s.id as student_id, s.code, s.name, s.brought_by as assistant_id, s.brought_at,
         (public.student_first_paid_at(s.id) is not null) as first_subscription_paid,
         public.student_first_paid_at(s.id) as first_paid_at,
         c.id as commission_id, c.status as commission_status, c.amount as commission_amount,
         c.currency as commission_currency, c.earned_at as commission_earned_at,
         (select count(*)::int from public.assistant_commissions r
           where r.student_id = s.id and r.kind = 'renewal' and r.status = 'earned') as renewal_commission_count
  from public.students s
  left join public.assistant_commissions c on c.student_id = s.id and c.kind = 'first'
  where s.brought_by is not null
    and (not public.is_client_session() or public.is_admin()
         or (s.brought_by = auth.uid() and public.auth_role() = 'sales'));
revoke all on public.v_assistant_students from public, anon, authenticated;
grant select on public.v_assistant_students to authenticated, service_role;

-- The snapshot (no commission is written): every priced subscription without a row already fully paid
-- before the cutoff. Read-only over subscriptions and payments.
insert into public.assistant_commission_exclusions (subscription_id, reason)
select s.id, 'paid_before_cutoff' from public.subscriptions s
 where s.price > 0
   and not exists (select 1 from public.assistant_commissions c where c.subscription_id = s.id)
   and public.subscription_full_at(s.id) < public.renewal_commission_cutoff()
on conflict do nothing;

revoke execute on function public.renewal_commission_cutoff() from public, anon, authenticated;
grant execute on function public.renewal_commission_cutoff() to service_role;
revoke execute on function public.renewal_commission_share(), public.subscription_commission_kind(uuid),
  public.assistant_commission_plan(uuid, timestamptz, uuid, text),
  public.settle_assistant_commission(text, uuid, uuid, timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public.renewal_commission_share(), public.subscription_commission_kind(uuid),
  public.assistant_commission_plan(uuid, timestamptz, uuid, text),
  public.settle_assistant_commission(text, uuid, uuid, timestamptz, uuid, uuid) to service_role;
-- A trigger function: nobody calls it directly.
revoke execute on function public.assistant_commissions_merge() from public, anon, authenticated;

-- MANUAL ROLLBACK (after the code rollback): re-run the function bodies of migrations 272 (evaluate,
-- merge), 273 (set_student_brought_by) and 274 (v_assistant_students: drop view first, it lost columns),
-- then drop the five functions above and public.assistant_commission_exclusions.
