-- Counts the rows the sales people answer schema would refuse (docs/62 Decisions, read-only).
-- count: sales_people_total
select count(*) from public.profiles where role = 'sales' and disabled_at is null;

-- count: sales_people_missing_name
select count(*) from public.profiles
where role = 'sales' and disabled_at is null and full_name is null;
