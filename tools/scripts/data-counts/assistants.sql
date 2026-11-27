-- Counts the assistant rows the assistant answer schemas would refuse (docs/62 Decisions, read-only).
-- count: assistants_total
select count(*) from public.profiles where role = 'assistant';

-- count: assistants_missing_name
select count(*) from public.profiles where role = 'assistant' and full_name is null;

-- count: assistant_lessons_missing_time
select count(*)
from public.lessons l
join public.lesson_students ls on ls.lesson_id = l.id
join public.student_assistants sa on sa.student_id = ls.student_id
where l.starts_at is null or l.ends_at is null or l.status is null;
