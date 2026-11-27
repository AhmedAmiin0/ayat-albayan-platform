-- Counts the teacher rows the sales teacher picker schema would refuse (docs/62 Decisions).
-- count: sales_subscribe_active_teachers_without_name
select count(*) from public.teachers
where status = 'active' and display_name_ar is null;
