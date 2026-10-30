-- «إلغاء الاشتراك» / «تغيير المعلم» / «تغيير موعد الحلقات» from the student's profile (owner 2026-10-30).
--   * Three narrow keys, granted to the system admin and sales (the catalog's defaults, packages/shared
--     catalog.data.ts), for ANY student: subscriptions.stop, students.change_teacher, courses.reschedule.
--     Teachers, classroom assistants and families never. The admin holds every grantable key anyway and
--     gets the rows too so the seed test reads them.
--   * subscriptions.cancel_kind: 'unused' (the 10-28 «إلغاء الباقة»: nothing hangs on it) or 'stopped' (a
--     course stopped mid-way: its future lessons cancelled, its rules ended, its money kept). The guard of
--     934 still refuses an unused cancel with money / lessons / a later commission; a stopped one only needs
--     a reason and no open lesson of its course still to come (has_future_lessons), the API cancelling
--     those first. Payments, held lessons, reports and earnings are never touched; 934's freeze applies.
-- SQL test plan (local DB, begin … rollback):
--   1. a package with a payment and a held lesson: update set status = 'cancelled' → 23514 has_payments;
--      with cancel_kind = 'stopped', cancel_reason 'سفر' and no future open lesson → cancelled.
--   2. stopped with a scheduled lesson of its course tomorrow → 23514 has_future_lessons; no reason → 23514.
--   3. role_permissions holds the three keys for the system admin and sales, not teacher / assistant.
-- Rollback: re-run 934's subscription_cancel_guard; alter table public.subscriptions drop column cancel_kind;
--   delete from public.role_permissions where permission in the three keys. Idempotent.
set local lock_timeout = '5s';

alter table public.subscriptions
  add column if not exists cancel_kind text check (cancel_kind in ('unused', 'stopped'));

comment on column public.subscriptions.cancel_kind is
  'Why a cancelled package is cancelled: unused (a mistake, 2026-10-28) or stopped (course stopped, money kept, 2026-10-30).';

create or replace function public.subscription_cancel_guard() returns trigger
  language plpgsql set search_path = '' as $$
begin
  perform 1 from public.subscriptions s where s.id = new.id for update;
  if new.cancel_kind = 'stopped' then
    if coalesce(btrim(new.cancel_reason), '') = '' then
      raise exception 'reason_required: subscription %', new.id using errcode = '23514';
    end if;
    if exists (select 1 from public.lessons l join public.schedule_rules r on r.id = l.rule_id
                where r.subscription_id = new.id and l.status in ('scheduled', 'confirmed')
                  and l.starts_at > now()) then
      raise exception 'has_future_lessons: subscription %', new.id using errcode = '23514';
    end if;
    return new;
  end if;
  if coalesce((select sum(case when p.kind = 'refund' then -p.amount else p.amount end)
                 from public.payments p where p.subscription_id = new.id), 0) <> 0 then
    raise exception 'has_payments: subscription %', new.id using errcode = '23514';
  end if;
  if exists (select 1 from public.schedule_rules r where r.subscription_id = new.id and r.status = 'active')
     or exists (select 1 from public.lessons l join public.schedule_rules r on r.id = l.rule_id
                 where r.subscription_id = new.id
                   and l.status not in ('cancelled_by_teacher', 'cancelled_by_admin'))
     or exists (select 1 from public.v_subscription_balance b
                 where b.subscription_id = new.id and b.lessons_used > 0) then
    raise exception 'has_lessons: subscription %', new.id using errcode = '23514';
  end if;
  if new.price > 0 and exists (
       select 1 from public.subscriptions o
       join public.assistant_commissions c on c.subscription_id = o.id
       where o.student_id = new.student_id and o.id <> new.id and o.price > 0 and o.status <> 'cancelled'
         and (o.created_at, o.id) > (new.created_at, new.id)) then
    raise exception 'has_commission: subscription %', new.id using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.subscription_cancel_guard() from public, anon, authenticated;

insert into public.role_permissions (role_id, permission)
select r.id, k.permission
  from public.roles r
  cross join (values ('subscriptions.stop'), ('students.change_teacher'), ('courses.reschedule')) as k (permission)
 where r.is_system and r.key in ('admin', 'sales')
on conflict do nothing;
