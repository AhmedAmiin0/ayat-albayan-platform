-- Counts the rows the GET /sales/students/:id answer schema would refuse (docs/62 Decisions,
-- read-only).
-- count: sales_student_without_name_status_or_program
select count(*) from public.students
where name is null or status is null or program is null;

-- count: sales_student_active_rules_bad_duration
select count(*) from public.schedule_rules
where status = 'active' and (duration_min is null or duration_min < 0);

-- count: sales_student_subscriptions_negative_used
select count(*) from public.v_subscription_balance where lessons_used < 0 or lessons_used is null;

