-- Counts the rows the lesson view schema would refuse (docs/62 Decisions).
-- Ids are uuid columns and stored conflicts are read leniently by the mapper, so only
-- enum text, empty times and out-of-range weekdays could fail it.
-- count: lessons_unknown_status
select count(*) from public.lessons
where status::text not in ('scheduled', 'confirmed', 'completed', 'late', 'excused', 'no_show',
  'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled');

-- count: lessons_untimed
select count(*) from public.lessons where starts_at is null or ends_at is null;

-- count: lesson_students_unknown_attendance
select count(*) from public.lesson_students
where attendance is not null
  and attendance::text not in ('on_time', 'late', 'excused', 'absent');

-- count: lesson_reports_unknown_status
select count(*) from public.lesson_reports where status::text not in ('draft', 'submitted');

-- count: lesson_proposals_unknown_requester
select count(*) from public.lesson_proposals
where requested_by is not null and requested_by::text not in ('teacher', 'family');

-- count: schedule_rules_weekday_out_of_range
select count(*) from public.schedule_rules where not (byday <@ '{0,1,2,3,4,5,6}');

-- count: teachers_unknown_gender_or_status
select count(*) from public.teachers
where gender is null or gender::text not in ('male', 'female')
   or status::text not in ('active', 'inactive');

-- count: teachers_unknown_program
select count(*) from public.teachers
where programs is null or not (programs::text[] <@ '{quran,arabic,islamic_studies}');
