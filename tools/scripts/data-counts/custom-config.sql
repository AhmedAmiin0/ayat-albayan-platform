-- Counts the custom value rows the admin list answer would refuse (docs/62 Decisions).
-- The time is a non-null timestamptz and the saver a uuid, so both counts after the first are 0.
-- count: custom_rows
select count(*) from public.custom_config;

-- count: custom_rows_without_update_time
select count(*) from public.custom_config where updated_at is null;
