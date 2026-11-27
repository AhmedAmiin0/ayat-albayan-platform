-- Counts the rows the sales teacher overview answer schema would refuse (docs/62 Decisions, read-only).
-- count: overview_active_rules_total
select count(*) from public.schedule_rules where status = 'active';

-- count: overview_active_rules_bad_duration
select count(*) from public.schedule_rules
where status = 'active' and (duration_min is null or duration_min < 0);

-- count: overview_lessons_total
select count(*) from public.lessons;

-- count: overview_lessons_missing_status_or_start
select count(*) from public.lessons where status is null or starts_at is null;

-- count: overview_students_missing_name
select count(*) from public.students where name is null;
