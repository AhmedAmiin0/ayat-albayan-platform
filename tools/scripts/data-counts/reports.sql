-- Counts the rows the report view answer schema would refuse (docs/62 Decisions, read-only).
-- count: reports_total
select count(*) from public.lesson_reports;

-- count: reports_version_missing_or_negative
select count(*) from public.lesson_reports where version is null or version < 0;

-- count: reports_form_version_unknown
select count(*) from public.lesson_reports where form_version is null or form_version not in (1, 2);
