-- Counts the rows the student link page schema would refuse (docs/62 Decisions).
-- Every unnamed student, a superset of those with a join link: the runner takes one table per
-- count.
-- count: student_link_students_unnamed
select count(*) from public.students where name is null;

-- count: student_link_lessons_untimed
select count(*) from public.lessons
where status in ('scheduled', 'confirmed') and (starts_at is null or ends_at is null);
