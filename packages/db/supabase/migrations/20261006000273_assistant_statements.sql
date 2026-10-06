-- Assistant monthly statements and attribution RPCs (owner, 2026-10-06). Same pattern as the teacher
-- payouts (migrations 121, 201): ONE transaction each with its audit row, service role only. Error
-- codes (P0001) for the API: assistant_not_found, invalid_month, statement_not_found,
-- invalid_transition, empty_statement, reversal_in_later_statement, student_not_found,
-- commission_exists, invalid_assistant, invalid_amount, reason_required.
--
--   statement = salary (a full month once salary_starts_on has come) + the earned commissions not yet in
--   a statement whose month (their earned_at in the assistant's tz) is <= the statement's month (so a
--   late-dated payment is not orphaned) + the unlinked adjustments with effective_month <= the month.
--   Lines are per currency; totals = {currency: {salary, commissions, adjustments, total}}.
--   generate_assistant_statement(assistant, month, actor): creates or REBUILDS the draft (idempotent);
--     an approved or paid statement is frozen ('invalid_transition').
--   approve_assistant_statement / pay_assistant_statement(.., p {paid_at, method, note, receipt_path}) /
--   unpay_assistant_statement(.., reason) / reopen_assistant_statement: draft -> approved -> paid and back.
--   add_assistant_adjustment: a manual +/- carried into the next open statement.
--   set_student_brought_by / set_students_brought_by: admin attribution, audited; null clears it.

-- (Re)fills a DRAFT statement from what is open now. Internal: callers hold the statement locked.
create or replace function public.build_assistant_statement(p_statement uuid) returns jsonb
  language plpgsql security definer set search_path = '' as $$
declare
  st record;
  t record;
  v_tz text;
  v_end date;
begin
  select * into st from public.assistant_statements where id = p_statement for update;
  if not found then
    raise exception 'statement_not_found' using errcode = 'P0001';
  end if;
  if st.status <> 'draft' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  -- A commission voided after this statement was approved and reopened is no longer in it: its
  -- pending reversal would take it out twice.
  delete from public.assistant_adjustments a
   where a.kind = 'reversal' and a.statement_id is null
     and a.commission_id in (select c.id from public.assistant_commissions c
                              where c.statement_id = st.id and c.status = 'voided');
  update public.assistant_commissions set statement_id = null where statement_id = st.id;
  update public.assistant_adjustments set statement_id = null where statement_id = st.id;
  delete from public.assistant_statement_lines where statement_id = st.id;

  select p.tz into v_tz from public.profiles p where p.id = st.assistant_id;
  v_tz := coalesce(v_tz, 'Asia/Riyadh');
  v_end := (st.month + interval '1 month' - interval '1 day')::date;
  select * into t from public.assistant_terms where assistant_id = st.assistant_id;
  if t.salary_amount is not null and t.salary_amount > 0 and t.salary_starts_on <= v_end then
    insert into public.assistant_statement_lines (statement_id, kind, amount, currency)
    values (st.id, 'salary', t.salary_amount, t.salary_currency);
  end if;

  with c as (
    update public.assistant_commissions set statement_id = st.id
     where assistant_id = st.assistant_id and status = 'earned' and statement_id is null
       and date_trunc('month', earned_at at time zone v_tz)::date <= st.month
    returning id, amount, currency)
  insert into public.assistant_statement_lines (statement_id, kind, commission_id, amount, currency)
  select st.id, 'commission', c.id, c.amount, c.currency from c;

  with a as (
    update public.assistant_adjustments set statement_id = st.id
     where assistant_id = st.assistant_id and statement_id is null and effective_month <= st.month
    returning id, amount, currency)
  insert into public.assistant_statement_lines (statement_id, kind, adjustment_id, amount, currency)
  select st.id, 'adjustment', a.id, a.amount, a.currency from a;

  update public.assistant_statements s set totals = coalesce((
    select jsonb_object_agg(x.currency, jsonb_build_object('salary', x.salary, 'commissions', x.commissions,
                                                           'adjustments', x.adjustments, 'total', x.total))
    from (select l.currency,
                 coalesce(sum(l.amount) filter (where l.kind = 'salary'), 0) as salary,
                 coalesce(sum(l.amount) filter (where l.kind = 'commission'), 0) as commissions,
                 coalesce(sum(l.amount) filter (where l.kind = 'adjustment'), 0) as adjustments,
                 sum(l.amount) as total
          from public.assistant_statement_lines l where l.statement_id = st.id group by l.currency) x),
    '{}'::jsonb)
   where s.id = st.id;
  return (select s.totals from public.assistant_statements s where s.id = st.id);
end $$;

create or replace function public.generate_assistant_statement(p_assistant uuid, p_month date, p_actor uuid)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  st record;
  v_totals jsonb;
begin
  if p_month is null or extract(day from p_month) <> 1 then
    raise exception 'invalid_month' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_assistant and p.role = 'sales') then
    raise exception 'assistant_not_found' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('assistant_statement:' || p_assistant, 0));
  insert into public.assistant_statements (assistant_id, month, created_by)
  values (p_assistant, p_month, p_actor) on conflict (assistant_id, month) do nothing;
  select * into st from public.assistant_statements where assistant_id = p_assistant and month = p_month for update;
  if st.status <> 'draft' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  v_totals := public.build_assistant_statement(st.id);
  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values (p_actor, 'assistant_statements', st.id, 'generate', jsonb_build_object('month', p_month, 'totals', v_totals));
  return jsonb_build_object('statement_id', st.id, 'totals', v_totals);
end $$;

create or replace function public.approve_assistant_statement(p_statement uuid, p_actor uuid)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  st record;
begin
  select * into st from public.assistant_statements where id = p_statement for update;
  if not found then
    raise exception 'statement_not_found' using errcode = 'P0001';
  end if;
  if st.status <> 'draft' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.assistant_statement_lines l where l.statement_id = p_statement) then
    raise exception 'empty_statement' using errcode = 'P0001';
  end if;
  update public.assistant_statements set status = 'approved', approved_at = now(), approved_by = p_actor
   where id = p_statement;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'assistant_statements', p_statement, 'approve', jsonb_build_object('status', 'draft'),
          jsonb_build_object('status', 'approved', 'totals', st.totals));
  return jsonb_build_object('statement_id', p_statement);
end $$;

create or replace function public.pay_assistant_statement(p_statement uuid, p_actor uuid, p jsonb)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  st record;
  v_paid_at timestamptz := coalesce(nullif(p ->> 'paid_at', '')::timestamptz, now());
begin
  select * into st from public.assistant_statements where id = p_statement for update;
  if not found then
    raise exception 'statement_not_found' using errcode = 'P0001';
  end if;
  if st.status <> 'approved' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.assistant_statements
     set status = 'paid', paid_at = v_paid_at, paid_by = p_actor,
         method = nullif(p ->> 'method', '')::public.payment_method,
         note = nullif(p ->> 'note', ''), receipt_path = nullif(p ->> 'receipt_path', '')
   where id = p_statement;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'assistant_statements', p_statement, 'pay', jsonb_build_object('status', 'approved'),
          jsonb_build_object('status', 'paid', 'paid_at', v_paid_at, 'method', p ->> 'method', 'totals', st.totals));
  return jsonb_build_object('statement_id', p_statement);
end $$;

create or replace function public.unpay_assistant_statement(p_statement uuid, p_actor uuid, p_reason text)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  st record;
begin
  select * into st from public.assistant_statements where id = p_statement for update;
  if not found then
    raise exception 'statement_not_found' using errcode = 'P0001';
  end if;
  if st.status <> 'paid' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.assistant_statements set status = 'approved', paid_at = null, paid_by = null,
         method = null, note = null, receipt_path = null
   where id = p_statement;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'assistant_statements', p_statement, 'unpay',
          jsonb_build_object('status', 'paid', 'paid_at', st.paid_at),
          jsonb_build_object('status', 'approved', 'reason', p_reason));
  return jsonb_build_object('statement_id', p_statement);
end $$;

-- approved -> draft (calculate again before approving). Refused while a reversal of one of its
-- commissions already sits in a later statement: rebuilding would take that commission out twice.
create or replace function public.reopen_assistant_statement(p_statement uuid, p_actor uuid)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  st record;
begin
  select * into st from public.assistant_statements where id = p_statement for update;
  if not found then
    raise exception 'statement_not_found' using errcode = 'P0001';
  end if;
  if st.status <> 'approved' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.assistant_adjustments a
             join public.assistant_commissions c on c.id = a.commission_id
             where c.statement_id = p_statement and a.kind = 'reversal' and a.statement_id is not null) then
    raise exception 'reversal_in_later_statement' using errcode = 'P0001';
  end if;
  update public.assistant_statements set status = 'draft', approved_at = null, approved_by = null
   where id = p_statement;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'assistant_statements', p_statement, 'reopen', jsonb_build_object('status', 'approved'),
          jsonb_build_object('status', 'draft'));
  return jsonb_build_object('statement_id', p_statement);
end $$;

create or replace function public.add_assistant_adjustment(p_assistant uuid, p_amount numeric, p_currency text,
  p_reason text, p_actor uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = p_assistant and p.role = 'sales') then
    raise exception 'assistant_not_found' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount = 0 or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  insert into public.assistant_adjustments (assistant_id, kind, amount, currency, reason, effective_month, created_by)
  values (p_assistant, 'manual', round(p_amount, 2), p_currency, p_reason,
          public.assistant_next_open_month(p_assistant), p_actor)
  returning id into v_id;
  insert into public.audit_log (actor_id, entity, entity_id, action, after)
  values (p_actor, 'assistant_adjustments', v_id, 'create',
          jsonb_build_object('assistant_id', p_assistant, 'amount', p_amount, 'currency', p_currency, 'reason', p_reason));
  return v_id;
end $$;

-- Admin attribution. p_assistant null clears it. p_brought_at null = now (or unchanged when the same
-- assistant). Refused while the student has a live commission with another assistant: void it first.
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
  select id into v_sub from public.subscriptions where student_id = p_student order by created_at limit 1;
  if v_sub is not null then
    perform public.evaluate_assistant_commission(v_sub);
  end if;
  return jsonb_build_object('student_id', p_student, 'changed', true);
end $$;

create or replace function public.set_students_brought_by(p_students uuid[], p_assistant uuid, p_actor uuid,
  p_brought_at timestamptz default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_changed int := 0;
begin
  foreach v_id in array (select array_agg(distinct x order by x) from unnest(p_students) x) loop
    if (public.set_student_brought_by(v_id, p_assistant, p_actor, p_brought_at) ->> 'changed')::boolean then
      v_changed := v_changed + 1;
    end if;
  end loop;
  return jsonb_build_object('changed', v_changed);
end $$;

revoke execute on function public.build_assistant_statement(uuid),
  public.generate_assistant_statement(uuid, date, uuid), public.approve_assistant_statement(uuid, uuid),
  public.pay_assistant_statement(uuid, uuid, jsonb), public.unpay_assistant_statement(uuid, uuid, text),
  public.reopen_assistant_statement(uuid, uuid),
  public.add_assistant_adjustment(uuid, numeric, text, text, uuid),
  public.set_student_brought_by(uuid, uuid, uuid, timestamptz),
  public.set_students_brought_by(uuid[], uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.build_assistant_statement(uuid),
  public.generate_assistant_statement(uuid, date, uuid), public.approve_assistant_statement(uuid, uuid),
  public.pay_assistant_statement(uuid, uuid, jsonb), public.unpay_assistant_statement(uuid, uuid, text),
  public.reopen_assistant_statement(uuid, uuid),
  public.add_assistant_adjustment(uuid, numeric, text, text, uuid),
  public.set_student_brought_by(uuid, uuid, uuid, timestamptz),
  public.set_students_brought_by(uuid[], uuid, uuid, timestamptz) to service_role;
