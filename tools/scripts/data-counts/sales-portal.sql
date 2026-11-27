-- Counts the rows the sales portal answer schemas would refuse (docs/62 Decisions, read-only).
-- count: portal_subscriptions_total
select count(*) from public.subscriptions;

-- count: portal_subscriptions_bad_lessons_total
select count(*) from public.subscriptions where lessons_total is null or lessons_total < 0;

-- count: portal_subscriptions_missing_status_or_start
select count(*) from public.subscriptions where status is null or starts_on is null;

-- count: portal_lessons_missing_status_or_times
select count(*) from public.lessons where status is null or starts_at is null or ends_at is null;
