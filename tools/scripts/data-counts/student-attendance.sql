-- Counts the rows the student attendance table schema would refuse (docs/62 Decisions).
-- count: student_attendance_lessons_untimed
select count(*) from public.lessons
where starts_at is null or ends_at is null;

-- count: student_attendance_lessons_negative_duration
select count(*) from public.lessons
where ends_at < starts_at;

-- count: student_attendance_lessons_unknown_status
select count(*) from public.lessons
where status::text not in ('scheduled', 'confirmed', 'completed', 'late', 'excused',
  'no_show', 'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled');

-- count: student_attendance_unknown_attendance
select count(*) from public.lesson_students
where attendance is not null
  and attendance::text not in ('on_time', 'late', 'excused', 'absent');
