-- Counts the rows the sales academy day and live schemas would refuse (docs/62 Decisions).
-- count: sales_academy_day_lessons_untimed
select count(*) from public.lessons
where starts_at is null or ends_at is null;

-- count: sales_academy_day_lessons_unknown_status
select count(*) from public.lessons
where status::text not in ('scheduled', 'confirmed', 'completed', 'late', 'excused',
  'no_show', 'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled');

-- count: sales_academy_day_teachers_without_name
select count(*) from public.teachers
where display_name_ar is null;

-- count: sales_academy_day_students_without_name
select count(*) from public.students
where name is null;
