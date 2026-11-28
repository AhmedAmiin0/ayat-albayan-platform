-- Counts the student rows the registration check answer schema would refuse (docs/62 Decisions, read-only).
-- count: registration_students_total
select count(*) from public.students;

-- count: registration_students_missing_name_or_status
select count(*) from public.students where name is null or status is null;

