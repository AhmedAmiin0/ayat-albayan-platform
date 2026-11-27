-- Counts the staff students answer schemas would reject (docs/62 Decisions, read-only counts).
-- count: student_list_nulls
select count(*) from public.v_student_list
where status is null or program is null or tz is null or created_at is null or has_weekly is null;

-- count: student_list_without_guardian
select count(*) from public.students s
left join public.guardians g on g.id = s.guardian_id
where g.id is null or g.name is null or g.phone_e164 is null;

-- count: teacher_options_nulls
select count(*) from public.teachers
where status = 'active' and display_name_ar is null;

-- count: students_total
select count(*) from public.students;
