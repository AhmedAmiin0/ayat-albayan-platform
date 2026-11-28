-- Counts the availability and time-off view schemas would reject (docs/62 Decisions, read-only).
-- count: availability_weekday_outside_week
select count(*) from public.teacher_availability where weekday < 0 or weekday > 6;

-- count: availability_total
select count(*) from public.teacher_availability;

-- count: time_off_total
select count(*) from public.teacher_time_off;
