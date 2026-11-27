-- Counts the course change view schema would reject (docs/62 Decisions, read-only counts).
-- count: course_rules_duration_unknown
select count(*) from public.schedule_rules
where subscription_id is not null and duration_min::text not in ('30', '45', '60', '90');

-- count: course_students_required_null
select count(distinct s.id) from public.students s
join public.schedule_rule_students rs on rs.student_id = s.id
where s.code is null or s.name is null or s.tz is null;

-- count: course_rules_total
select count(*) from public.schedule_rules where subscription_id is not null;
