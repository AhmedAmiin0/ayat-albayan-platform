-- Teacher earnings count only SUBSCRIBED students (owner request). A READ-TIME filter: no earning
-- row is deleted and the sync trigger (177) is untouched; the ledger keeps every session, this view
-- says which ones the API shows, totals and lets the admin pay (balances, session lists and the
-- oldest-first allocation all read it, so a hidden session can never be paid).
--
-- A session counts when
--   * its lesson is not a trial: the lesson has no rule, or the rule's package is not 'trial'
--     (the same rule as feedback / lessons.mapper: schedule_rules.package = 'trial'), AND
--   * at least one student on the lesson (lesson_students) has students.status = 'active'
--     (subscribed; 'trial', 'paused' and 'churned' do not count).
-- Unit twin: isCountableSession in @ab/shared.
create view public.v_teacher_countable_earnings with (security_invoker = true) as
select e.id, e.lesson_id, e.teacher_id, e.starts_at, e.minutes, e.rate, e.amount, e.paid_amount,
       e.currency, e.status, e.created_at, e.updated_at
from public.teacher_session_earnings e
join public.lessons l on l.id = e.lesson_id
where not exists (select 1 from public.schedule_rules r where r.id = l.rule_id and r.package = 'trial')
  and exists (select 1 from public.lesson_students ls
              join public.students s on s.id = ls.student_id
              where ls.lesson_id = l.id and s.status = 'active');

revoke all on public.v_teacher_countable_earnings from anon;
revoke insert, update, delete, truncate, references, trigger on public.v_teacher_countable_earnings
  from authenticated;
