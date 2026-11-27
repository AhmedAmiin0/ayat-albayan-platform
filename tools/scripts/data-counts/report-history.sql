-- Counts the rows the report history, pending and sent-list answer schemas would refuse
-- (docs/62 Decisions, read-only).
-- count: history_submitted_total
select count(*) from public.lesson_reports where status = 'submitted';

-- count: history_submitted_version_missing_or_negative
select count(*) from public.lesson_reports
where status = 'submitted' and (version is null or version < 0);

-- count: history_lessons_without_start
select count(*) from public.lessons where starts_at is null;

-- count: history_teachers_without_name
select count(*) from public.teachers where display_name_ar is null;

-- count: history_students_without_code_or_name
select count(*) from public.students where code is null or name is null;
