-- Counts the assistant rows the assistant answer schemas would refuse (docs/62 Decisions, read-only).
-- count: assistants_total
select count(*) from public.profiles where role = 'assistant';

-- count: assistants_missing_name
select count(*) from public.profiles where role = 'assistant' and full_name is null;

-- count: lessons_missing_time
select count(*) from public.lessons where starts_at is null or ends_at is null or status is null;
