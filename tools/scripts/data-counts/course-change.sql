-- Counts the course change view schema would reject (docs/62 Decisions, read-only counts).
-- count: course_rules_duration_unknown
select count(*) from public.schedule_rules
where subscription_id is not null and duration_min::text not in ('30', '45', '60', '90');

-- count: students_required_null
select count(*) from public.students where code is null or name is null or tz is null;

-- count: course_rules_total
select count(*) from public.schedule_rules where subscription_id is not null;
