-- Counts the rows the GET /sales/money/family answer schema would refuse (docs/62 Decisions,
-- read-only).
-- count: sales_family_students_without_name_or_status
select count(*) from public.students where name is null or status is null;
