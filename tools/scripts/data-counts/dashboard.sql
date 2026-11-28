-- Counts the rows the dashboard answer schemas would refuse (docs/62 Decisions, read-only).
-- count: dashboard_teachers_without_name
select count(*) from public.teachers where display_name_ar is null;

-- count: dashboard_unpaid_without_lessons_or_start
select count(*) from public.subscriptions
where status = 'unpaid' and (lessons_total is null or starts_on is null or currency is null);

-- Every unnamed student, a superset of those with an unpaid subscription: the runner takes one
-- table per count.
-- count: dashboard_unpaid_students_without_name
select count(*) from public.students where name is null;

-- count: dashboard_open_tasks_without_created_at
select count(*) from public.admin_tasks where done_at is null and created_at is null;
