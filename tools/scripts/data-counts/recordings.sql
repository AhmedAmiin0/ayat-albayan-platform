-- Counts the room recording rows the recording answer schema would refuse (docs/62 Decisions).
-- count: recordings_listed
select count(*) from public.lesson_recordings where status <> 'deleted';

-- count: recordings_missing_start
select count(*) from public.lesson_recordings where status <> 'deleted' and started_at is null;

