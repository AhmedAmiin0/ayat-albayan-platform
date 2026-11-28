-- Counts the trial history schema would reject (docs/62 Decisions, read-only counts).
-- count: students_status_or_tz_null
select count(*) from public.students where status is null or tz is null;

-- count: students_gender_pref_unknown
select count(*) from public.students
where teacher_gender_pref is not null and teacher_gender_pref::text not in ('male', 'female');

-- count: teachers_name_null
select count(*) from public.teachers where display_name_ar is null;

-- count: lessons_created_at_null
select count(*) from public.lessons where created_at is null;

-- count: students_total
select count(*) from public.students;
