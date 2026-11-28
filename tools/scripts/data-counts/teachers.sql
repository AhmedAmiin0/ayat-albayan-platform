-- Counts the teacher view schemas would reject (docs/62 Decisions, read-only counts).
-- count: teachers_status_unknown
select count(*) from public.teachers where status::text not in ('active', 'inactive');

-- count: teachers_gender_unknown
select count(*) from public.teachers where gender::text not in ('male', 'female');

-- count: teachers_total
select count(*) from teachers;
