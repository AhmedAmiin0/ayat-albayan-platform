-- Counts the rows the teacher student file answer schemas would refuse (docs/62 Decisions, read-only).
-- count: lessons_total
select count(*) from public.lessons;

-- count: lessons_ending_before_start
select count(*) from public.lessons where ends_at < starts_at;

-- count: students_missing_name_or_status
select count(*) from public.students where name is null or status is null;

-- count: subscriptions_bad_course_fields
select count(*) from public.subscriptions where starts_on is null or lessons_total < 0;
