-- Counts the integration rows the integration settings answer would refuse (docs/62 Decisions).
-- Only registry keys are answered, and a time is a non-null timestamptz (Vault's is too).
-- count: integration_rows
select count(*) from public.integration_config;

-- count: integration_rows_without_update_time
select count(*) from public.integration_config where updated_at is null;

