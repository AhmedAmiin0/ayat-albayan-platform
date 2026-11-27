-- Counts the rows the sales all-students page schema would refuse (docs/62 Decisions, read-only).
-- count: sales_students_without_name_status_or_program
select count(*) from public.students
where name is null or status is null or program is null;

-- count: sales_students_packages_unknown_size_status_or_start
select count(*) from public.subscriptions
where status is null or starts_on is null or created_at is null
  or lessons_total is null or lessons_total < 0
  or (package is not null and package::text not in ('trial', '4', '8', '12', '16', '20', '28'));

-- count: sales_students_balances_negative_or_fractional_used
select count(*) from public.v_subscription_balance
where lessons_used < 0 or lessons_used <> trunc(lessons_used)
  or remaining <> trunc(remaining);
