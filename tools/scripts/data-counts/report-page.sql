-- Counts the submitted report rows the report page answer schema would refuse (docs/62 Decisions).
-- count: report_page_submitted
select count(*) from public.lesson_reports where status = 'submitted';

-- count: report_page_bad_public_id
select count(*) from public.lesson_reports
where status = 'submitted' and (public_id is null or public_id !~ '^[0-9a-f]{32}$');

-- count: report_page_version_not_int
select count(*) from public.lesson_reports where status = 'submitted' and version is null;

-- count: report_page_students_without_name_or_tz
select count(*) from public.lesson_reports r join public.students s on s.id = r.student_id
where r.status = 'submitted' and (s.name is null or s.tz is null);

-- count: report_page_teachers_without_name
select count(*) from public.lesson_reports r join public.teachers t on t.id = r.teacher_id
where r.status = 'submitted' and t.display_name_ar is null;

-- count: report_page_lessons_without_times
select count(*) from public.lesson_reports r join public.lessons l on l.id = r.lesson_id
where r.status = 'submitted' and (l.starts_at is null or l.ends_at is null);

