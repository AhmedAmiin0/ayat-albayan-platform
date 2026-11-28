-- Counts the course pause view schema would reject (docs/62 Decisions, read-only counts).
-- count: course_pauses_required_null
select count(*) from public.course_pauses
where id is null or from_date is null or created_at is null;

-- count: course_pauses_total
select count(*) from public.course_pauses;
