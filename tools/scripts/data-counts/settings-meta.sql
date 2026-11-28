-- Counts the settings rows the settings meta answer would refuse (docs/62 Decisions, read-only).
-- The writer is a uuid column and the time a timestamptz, so only a missing time can fail.
-- count: settings_rows
select count(*) from public.settings;

-- count: settings_without_update_time
select count(*) from public.settings where updated_at is null;
