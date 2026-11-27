-- Counts the rows the family link lookup schema would refuse (docs/62 Decisions).
-- The lesson id is a uuid column, so only a link that names no lesson could fail it.
-- count: lesson_join_links_without_lesson
select count(*) from public.lesson_join_links where lesson_id is null;
