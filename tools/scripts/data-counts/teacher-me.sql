-- Counts the rows the teacher's own profile answer schema would refuse (docs/62 Decisions, read-only).
-- count: teachers_total
select count(*) from public.teachers;

-- count: teachers_missing_name_or_tz
select count(*) from public.teachers where display_name_ar is null or tz is null;

-- count: teachers_unknown_gender
select count(*) from public.teachers
where gender is null or gender::text not in ('male', 'female');

-- count: teachers_unknown_program
select count(*) from public.teachers
where programs is null
   or not (programs::text[] <@ array['quran', 'arabic', 'islamic_studies']);

-- count: teacher_students_missing_name_tz_or_status
select count(*) from public.students
where teacher_id is not null and (name is null or tz is null or status is null);
