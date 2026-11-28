-- Counts the assistant course view schema would reject (docs/62 Decisions, read-only counts).
-- count: students_required_null
select count(*) from public.students where id is null or name is null or tz is null;

-- count: students_program_unknown
select count(*) from public.students
where program::text not in ('quran', 'arabic', 'islamic_studies');

-- count: students_gender_pref_unknown
select count(*) from public.students
where teacher_gender_pref is not null and teacher_gender_pref::text not in ('male', 'female');

-- count: open_subscriptions_duration_unknown
select count(*) from public.subscriptions
where status in ('unpaid', 'active') and duration::text not in ('30', '45', '60', '90');

-- count: open_subscriptions_required_null
select count(*) from public.subscriptions
where status in ('unpaid', 'active') and (lessons_total is null or starts_on is null);

-- count: students_total
select count(*) from public.students;
