-- Counts the people edit view schemas would reject (docs/62 Decisions, read-only counts).
-- count: students_gender_unknown
select count(*) from public.students
where gender::text not in ('male', 'female') or teacher_gender_pref::text not in ('male', 'female');

-- count: students_total
select count(*) from public.students;

-- count: guardians_total
select count(*) from public.guardians;
