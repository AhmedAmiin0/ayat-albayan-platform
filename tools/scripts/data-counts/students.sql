-- Counts the staff students answer schemas would reject (docs/62 Decisions, read-only counts).
-- count: student_list_nulls
select count(*) from public.v_student_list
where status is null or program is null or tz is null or created_at is null or has_weekly is null;

-- count: guardian_name_or_phone_null
select count(*) from public.guardians where name is null or phone_e164 is null;

-- count: teacher_options_nulls
select count(*) from public.teachers where status = 'active' and display_name_ar is null;

-- count: students_total
select count(*) from public.students;
