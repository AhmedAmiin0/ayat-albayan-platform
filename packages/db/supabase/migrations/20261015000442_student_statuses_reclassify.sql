-- Owner 2026-10-15 (R-STU-05, docs/18): ONE-TIME deterministic reclassification of today's `trial`
-- students into the new pipeline. Nothing is deleted; every other student is left as it is.
-- A trial lesson: its rule's package = 'trial' (platform), or an imported one (rule_id null, not
-- instant, not a makeup, the student's row not chargeable: tools/migrate marks a trial so).
-- The imported marker is best effort: the Sheets kept no other trace of a trial lesson.
--   * trial + an attended trial lesson (completed or late, the student not absent / excused on it)
--     + no positive payment (kind payment, amount > 0) → pending_subscription «بانتظار الاشتراك»;
--   * trial + no platform trial lesson booked (any lesson status) and none attended → new «جديد»
--     (an imported no_show / excused trial still → new);
--   * every other trial student stays trial.
-- One audit_log row per changed student (actor null, action status_change, reason
-- statuses_2026_10_15), in the same statement. Re-running it changes nothing: it only reads `trial` rows.
with trial_lessons as (
  select ls.student_id, l.status, ls.attendance, r.package = 'trial' as platform
    from public.lesson_students ls
    join public.lessons l on l.id = ls.lesson_id
    left join public.schedule_rules r on r.id = l.rule_id
   where r.package = 'trial'
      or (l.rule_id is null and not l.instant and l.makeup_of_id is null and not ls.chargeable)
),
facts as (
  select s.id,
    exists (
      select 1 from trial_lessons t where t.student_id = s.id and t.platform
    ) as platform_trial,
    exists (
      select 1 from trial_lessons t
       where t.student_id = s.id
         and t.status in ('completed', 'late')
         and coalesce(t.attendance::text, 'on_time') not in ('absent', 'excused')
    ) as attended,
    exists (
      select 1 from public.payments p
        join public.subscriptions sub on sub.id = p.subscription_id
       where sub.student_id = s.id and p.kind = 'payment' and p.amount > 0
    ) as paid
  from public.students s
  where s.status = 'trial'
),
target as (
  select f.id,
    case
      when f.attended and not f.paid then 'pending_subscription'
      when not (f.platform_trial or f.attended) then 'new'
    end::public.student_status as to_status
  from facts f
),
changed as (
  update public.students s set status = t.to_status
    from target t
   where s.id = t.id and t.to_status is not null and s.status = 'trial'
  returning s.id, s.status
)
insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
select null, 'students', c.id, 'status_change',
  jsonb_build_object('status', 'trial'),
  jsonb_build_object('status', c.status, 'from', 'trial', 'to', c.status, 'reason', 'statuses_2026_10_15')
from changed c;

-- MANUAL ROLLBACK (only after the code rollback; restores exactly the rows this migration moved):
--   update public.students s set status = 'trial' from public.audit_log a
--    where a.entity = 'students' and a.entity_id = s.id and a.action = 'status_change'
--      and a.after ->> 'reason' = 'statuses_2026_10_15' and s.status::text = a.after ->> 'status';
