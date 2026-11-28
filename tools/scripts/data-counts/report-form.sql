-- Rows the lesson report form answer schema would refuse (docs/62 Decisions, read-only).
-- count: report_form_lessons_status_out_of_enum
select count(*) from public.lessons
where status::text not in (
  'scheduled', 'confirmed', 'completed', 'late', 'excused', 'no_show',
  'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'
);

-- count: report_form_lessons_without_times
select count(*) from public.lessons where starts_at is null or ends_at is null;

-- count: report_form_students_program_out_of_enum
select count(*) from public.students
where program is null or program::text not in ('quran', 'arabic', 'islamic_studies');

-- count: report_form_teachers_without_name_or_tz
select count(*) from public.teachers where display_name_ar is null or tz is null;

-- count: report_form_balances_without_counts
select count(*) from public.v_subscription_balance
where lessons_total is null or lessons_used is null or remaining is null;
