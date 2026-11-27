-- Counts the rows the family link lookup schema would refuse (docs/62 Decisions).
-- count: lesson_join_links_lesson_not_uuid
select count(*) from public.lesson_join_links l
join public.lessons s on s.id = l.lesson_id
where s.id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
