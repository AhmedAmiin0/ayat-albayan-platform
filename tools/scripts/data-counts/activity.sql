-- Counts the activity log rows the activity page schema would refuse (docs/62 Decisions, read-only).
-- Every column is not null and checked by the table; only a meta that is not an object can differ,
-- and the repo already answers {} for it. Only an object contains the empty object.
-- count: activity_log_rows
select count(*) from public.activity_log;

-- count: activity_log_meta_not_object
select count(*) from public.activity_log where not (meta @> '{}');
