-- fix-teacher-data.sql — one-off data fix requested by the owner (2026-10-03).
--   1. show the two students (a name that matches 0 or >1 students aborts, nothing is guessed)
--   2. تولين: status -> 'churned', active/paused schedule rules ended, FUTURE open lessons cancelled
--   3. صباح الحبيب: Tuesday removed from her rule(s) byday (empty -> rule ended), FUTURE Tuesday
--      lessons cancelled
--   4. historical 45-minute sessions (starts_at < cutover) re-priced at the teacher's rate_60
--      ("before today we paid 1 hour, not 45 minutes"); teachers with a NULL rate_60 are listed, skipped
--   5. every outstanding teacher earning is settled with ONE legacy payment per teacher
--      (record_teacher_payment, deterministic client_request_id: running it again pays nothing twice)
--
-- HOW TO RUN: psql (or any client that shows NOTICEs) against the production database as a
-- privileged role (postgres / service role). The script is ONE transaction and ends with ROLLBACK:
-- read all the output, then change the LAST line to COMMIT and run it once more.
-- Nothing is deleted: completed lessons and paid earnings are never touched; cancelled lessons keep
-- their rows (status cancelled_by_admin, as the app's «إلغاء» does) and the earning ledger follows by trigger.
-- Weekday numbering: schedule_rules.byday 0 = الأحد ... 2 = الثلاثاء ... 6 = السبت.
begin;

-- ---------------------------------------------------------------------------------------------
-- CONFIG: edit only here. Cutover = first day paid by the new rule (45 min = rate_45); sessions
-- that start before the start of that day in tz are priced as one hour.
-- ---------------------------------------------------------------------------------------------
create temp table fix_cfg on commit drop as
select date '2026-10-03' as cutover_date,
       'Asia/Riyadh'::text as tz,
       (date '2026-10-03')::timestamp at time zone 'Asia/Riyadh' as cutover_at,
       'تولين'::text as churn_name,
       'صباح الحبيب'::text as tuesday_name,
       'الزهراء حمدي'::text as notstudent_name,
       2::smallint as tuesday,
       'legacy settlement: academy confirmed all teachers paid'::text as settle_note;

create temp table fix_target (label text primary key, student_id uuid not null) on commit drop;
create temp table fix_report (step text, subject text, before_val numeric, after_val numeric, info text)
  on commit drop;

-- STEP 1: find the students (trimmed, whitespace/alef/yaa-normalised ilike on students.name).
do $$
declare
  c record;
  n int;
begin
  for c in select 'churn' as label, churn_name as needle from fix_cfg
           union all select 'tuesday', tuesday_name from fix_cfg
           union all select 'notstudent', notstudent_name from fix_cfg loop
    select count(*) into n from public.students s
     where translate(regexp_replace(trim(s.name), '\s+', ' ', 'g'), 'أإآى', 'اااي')
           ilike '%' || translate(regexp_replace(trim(c.needle), '\s+', ' ', 'g'), 'أإآى', 'اااي') || '%';
    if n <> 1 then
      raise exception 'step 1: "%" matches % students (need exactly 1) - fix the name in fix_cfg', c.needle, n;
    end if;
    insert into fix_target
    select c.label, s.id from public.students s
     where translate(regexp_replace(trim(s.name), '\s+', ' ', 'g'), 'أإآى', 'اااي')
           ilike '%' || translate(regexp_replace(trim(c.needle), '\s+', ' ', 'g'), 'أإآى', 'اااي') || '%';
  end loop;
end $$;

select t.label, s.id, s.code, s.name, s.status, tc.display_name_ar as teacher,
       (select count(*) from public.schedule_rule_students rs join public.schedule_rules r on r.id = rs.rule_id
         where rs.student_id = s.id and r.status = 'active') as active_rules,
       (select string_agg(r.byday::text, ' | ') from public.schedule_rule_students rs
         join public.schedule_rules r on r.id = rs.rule_id
         where rs.student_id = s.id and r.status = 'active') as byday_of_active_rules,
       (select count(*) from public.lesson_students ls join public.lessons l on l.id = ls.lesson_id
         where ls.student_id = s.id and l.status in ('scheduled', 'confirmed') and l.starts_at >= now()) as future_open_lessons,
       (select count(*) from public.lesson_students ls join public.lessons l on l.id = ls.lesson_id
         where ls.student_id = s.id and l.status = 'completed') as completed_lessons
from fix_target t
join public.students s on s.id = t.student_id
left join public.teachers tc on tc.id = s.teacher_id;

-- Where else does the third name (الزهراء حمدي: "not a student") exist? Guardian / lead / teacher.
select 'guardian' as kind, g.id, g.name from public.guardians g, fix_cfg c
 where translate(g.name, 'أإآى', 'اااي') ilike '%' || translate(c.notstudent_name, 'أإآى', 'اااي') || '%'
union all
select 'lead', l.id, l.name from public.leads l, fix_cfg c
 where translate(l.name, 'أإآى', 'اااي') ilike '%' || translate(c.notstudent_name, 'أإآى', 'اااي') || '%'
union all
select 'teacher', t.id, t.display_name_ar from public.teachers t, fix_cfg c
 where translate(t.display_name_ar, 'أإآى', 'اااي') ilike '%' || translate(c.notstudent_name, 'أإآى', 'اااي') || '%';

-- STEP 2: تولين and الزهراء حمدي (not a student) are no longer subscribed: churned, rules ended,
-- future open lessons cancelled. Rows are kept (lessons/reports/payments may hang off them).
-- Mirrors LessonCancelService.endRule + apply_lesson_changes: ends_on = day before today (local),
-- open lessons from the start of today cancelled as cancelled_by_admin, chargeable = false.
do $$
declare
  v_student uuid;
  r record;
  v_cut timestamptz;
  v_lessons uuid[];
  n int := 0;
begin
 for v_student in select student_id from fix_target where label in ('churn', 'notstudent') loop
  update public.students set status = 'churned' where id = v_student and status <> 'churned';
  for r in select sr.* from public.schedule_rules sr
           join public.schedule_rule_students rs on rs.rule_id = sr.id
           where rs.student_id = v_student and sr.status in ('active', 'paused') for update of sr loop
    if exists (select 1 from public.schedule_rule_students o where o.rule_id = r.id and o.student_id <> v_student) then
      raise exception 'step 2: rule % has other students; end it from the app instead', r.id;
    end if;
    v_cut := (now() at time zone r.tz)::date::timestamp at time zone r.tz;
    with open as (
      update public.lessons l set status = 'cancelled_by_admin',
             cancel_reason = 'legacy cleanup: student no longer subscribed'
       where l.rule_id = r.id and l.starts_at >= v_cut and l.status in ('scheduled', 'confirmed')
      returning l.id)
    select coalesce(array_agg(id), '{}') into v_lessons from open;
    update public.lesson_students set chargeable = false where lesson_id = any (v_lessons);
    update public.schedule_rules set status = 'ended',
           ends_on = greatest(starts_on, (now() at time zone r.tz)::date - 1) where id = r.id;
    insert into public.audit_log (entity, entity_id, action, before, after)
    values ('schedule_rules', r.id, 'cancel', jsonb_build_object('status', r.status, 'ends_on', r.ends_on),
            jsonb_build_object('reason', 'fix-teacher-data: student churned', 'cancelled', to_jsonb(v_lessons)));
    n := n + coalesce(cardinality(v_lessons), 0);
    insert into fix_report values ('2 churn', r.id::text, null, cardinality(v_lessons), 'rule ended, lessons cancelled');
  end loop;
 end loop;
  raise notice 'step 2: student churned, future lessons cancelled: %', n;
end $$;

-- STEP 3: صباح الحبيب is no longer on Tuesday: drop 2 from byday (empty -> rule ended) and cancel
-- her FUTURE open Tuesday lessons (weekday taken in the rule's tz). Other days are untouched.
do $$
declare
  v_student uuid := (select student_id from fix_target where label = 'tuesday');
  v_tue smallint := (select tuesday from fix_cfg);
  r record;
  v_lessons uuid[];
begin
  for r in select sr.* from public.schedule_rules sr
           join public.schedule_rule_students rs on rs.rule_id = sr.id
           where rs.student_id = v_student and sr.status = 'active' and v_tue = any (sr.byday)
           for update of sr loop
    if exists (select 1 from public.schedule_rule_students o where o.rule_id = r.id and o.student_id <> v_student) then
      raise exception 'step 3: rule % has other students; change it from the app instead', r.id;
    end if;
    with open as (
      update public.lessons l set status = 'cancelled_by_admin',
             cancel_reason = 'legacy cleanup: Tuesday removed from the schedule'
       where l.rule_id = r.id and l.starts_at >= now() and l.status in ('scheduled', 'confirmed')
         and extract(dow from l.starts_at at time zone r.tz) = v_tue
      returning l.id)
    select coalesce(array_agg(id), '{}') into v_lessons from open;
    update public.lesson_students set chargeable = false where lesson_id = any (v_lessons);
    if cardinality(array_remove(r.byday, v_tue)) = 0 then
      update public.schedule_rules set status = 'ended', byday = r.byday,
             ends_on = greatest(starts_on, (now() at time zone r.tz)::date - 1) where id = r.id;
    else
      update public.schedule_rules set byday = array_remove(r.byday, v_tue) where id = r.id;
    end if;
    insert into public.audit_log (entity, entity_id, action, before, after)
    values ('schedule_rules', r.id, 'update', jsonb_build_object('byday', r.byday),
            jsonb_build_object('byday', array_remove(r.byday, v_tue), 'cancelled', to_jsonb(v_lessons)));
    insert into fix_report values ('3 tuesday', r.id::text, cardinality(r.byday), cardinality(array_remove(r.byday, v_tue)),
                                   'byday length before/after; tuesday lessons cancelled: ' || cardinality(v_lessons));
  end loop;
end $$;

-- OPTIONAL (leave commented): hard-delete الزهراء حمدي's student row ONLY if she has no lessons at all.
-- Keeping the churned row is the safe default; run this separately, after reviewing step 1.
-- delete from public.schedule_rule_students where student_id = (select student_id from fix_target where label = 'notstudent');
-- delete from public.students s where s.id = (select student_id from fix_target where label = 'notstudent')
--   and not exists (select 1 from public.lesson_students ls where ls.student_id = s.id);

-- STEP 4: REPRICE historical 45-minute sessions at rate_60 (never fully paid rows; paid_amount is kept
-- and the status recomputed with earning_status). NULL rate_60 teachers are skipped and listed.
create temp table fix_before on commit drop as
select e.teacher_id, sum(e.amount - e.paid_amount) filter (where e.amount > e.paid_amount) as owed
from public.teacher_session_earnings e group by e.teacher_id;

update public.teacher_session_earnings e
   set rate = t.rate_60, amount = t.rate_60, status = public.earning_status(e.paid_amount, t.rate_60)
  from public.teachers t, fix_cfg c
 where t.id = e.teacher_id and t.rate_60 is not null
   and e.minutes = 45 and e.starts_at < c.cutover_at and e.status <> 'paid';

create temp table fix_mid on commit drop as
select e.teacher_id, sum(e.amount - e.paid_amount) filter (where e.amount > e.paid_amount) as owed
from public.teacher_session_earnings e group by e.teacher_id;

select t.display_name_ar as teacher_without_rate_60_skipped, count(*) as sessions_45_before_cutover
from public.teacher_session_earnings e
join public.teachers t on t.id = e.teacher_id, fix_cfg c
where t.rate_60 is null and e.minutes = 45 and e.starts_at < c.cutover_at and e.status <> 'paid'
group by t.display_name_ar;

-- STEP 5: SETTLE. One record_teacher_payment per teacher with something outstanding, for exactly the
-- outstanding amounts (after the re-pricing). client_request_id = md5(...)::uuid per teacher and
-- cutover: a second run finds nothing outstanding / replays and pays nothing twice.
do $$
declare
  t record;
  v_items jsonb;
  v_total numeric;
  v_note text := (select settle_note from fix_cfg);
  v_day text := (select cutover_date::text from fix_cfg);
begin
  for t in select distinct e.teacher_id from public.teacher_session_earnings e where e.amount > e.paid_amount loop
    select jsonb_agg(jsonb_build_object('earning_id', e.id, 'amount', e.amount - e.paid_amount) order by e.starts_at, e.id),
           sum(e.amount - e.paid_amount)
      into v_items, v_total
      from public.teacher_session_earnings e where e.teacher_id = t.teacher_id and e.amount > e.paid_amount;
    perform public.record_teacher_payment(jsonb_build_object(
      'teacher_id', t.teacher_id, 'actor', null, 'amount', v_total, 'method', 'other',
      'paid_at', now(), 'note', v_note, 'receipt_path', null,
      'client_request_id', md5('legacy-settlement-' || v_day || '-' || t.teacher_id)::uuid,
      'items', v_items));
    raise notice 'step 5: settled % for teacher %', v_total, t.teacher_id;
  end loop;
end $$;

-- Per-teacher outstanding before the script / after re-pricing+settlement (after must be 0).
select tc.display_name_ar as teacher,
       coalesce(b.owed, 0) as owed_before,
       coalesce(m.owed, 0) as owed_after_repricing,
       coalesce((select sum(e.amount - e.paid_amount) from public.teacher_session_earnings e
                  where e.teacher_id = tc.id and e.amount > e.paid_amount), 0) as owed_after
from public.teachers tc left join fix_before b on b.teacher_id = tc.id
left join fix_mid m on m.teacher_id = tc.id
order by 1;

select * from fix_report order by step;

-- Safety: the app view that shows «owed» must be empty now.
select count(*) as still_outstanding_rows from public.v_teacher_countable_earnings where amount > paid_amount;

-- Change the next line to COMMIT after reading the output above.
rollback;
