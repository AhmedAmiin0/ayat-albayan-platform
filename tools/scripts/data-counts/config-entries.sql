-- Counts the settings rows the values page answer would refuse (docs/62 Decisions, read-only).
-- A written row shows its save time, a timestamptz; an unwritten one (JSON null, no writer) none.
-- count: settings_rows
select count(*) from public.settings;

-- count: settings_written_without_update_time
select count(*) from public.settings
where (value is not null and value <> 'null'::jsonb or updated_by is not null)
  and updated_at is null;

-- count: settings_with_negative_version
select count(*) from public.settings where version < 0;
