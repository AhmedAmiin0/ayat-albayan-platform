-- Counts the rows the sales teachers and subscription history schemas would refuse
-- (docs/62 Decisions, read-only).
-- count: sales_teachers_without_name_gender_or_programs
select count(*) from public.teachers
where display_name_ar is null or gender is null or programs is null;

-- count: sales_teacher_students_without_name_status_or_program
select count(*) from public.students
where teacher_id is not null and (name is null or status is null or program is null);

-- count: sales_history_subscriptions_unknown_package_or_status
select count(*) from public.subscriptions
where status is null or starts_on is null or lessons_total is null or lessons_total < 0
  or (package is not null and package::text not in ('trial', '4', '8', '12', '16', '20', '28'));

-- count: sales_history_payments_missing_fields
select count(*) from public.payments
where subscription_id is not null
  and (paid_at is null or kind is null or amount is null or currency is null);
