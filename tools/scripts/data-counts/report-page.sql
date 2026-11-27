-- Counts the rows the report page answer schema would refuse (docs/62 Decisions, read-only).
-- count: report_page_submitted
select count(*) from public.lesson_reports where status = 'submitted';

-- count: report_page_bad_public_id
select count(*) from public.lesson_reports
where status = 'submitted' and (public_id is null or public_id !~ '^[0-9a-f]{32}$');

-- count: report_page_version_missing
select count(*) from public.lesson_reports where status = 'submitted' and version is null;

-- count: report_page_students_without_name_or_tz
select count(*) from public.students where name is null or tz is null;

-- count: report_page_teachers_without_name
select count(*) from public.teachers where display_name_ar is null;

-- count: report_page_lessons_without_times
select count(*) from public.lessons where starts_at is null or ends_at is null;
