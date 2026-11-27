-- Counts the rows the student link page schema would refuse (docs/62 Decisions).
-- count: student_link_students_unnamed
select count(*) from public.students s
where s.name is null
  and exists (select 1 from public.student_join_links l where l.student_id = s.id);

-- count: student_link_lessons_untimed
select count(*) from public.lessons
where status in ('scheduled', 'confirmed') and (starts_at is null or ends_at is null);
