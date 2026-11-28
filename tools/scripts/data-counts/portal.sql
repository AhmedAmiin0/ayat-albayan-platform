-- Rows the family portal answer schemas would refuse (docs/62 C1, read-only counts).
-- count: students_portal_required_null
select count(*) from public.students where code is null or name is null or tz is null;
-- count: guardians_portal_required_null
select count(*) from public.guardians where profile_id is not null and (name is null or phone_e164 is null);
-- count: lessons_time_null
select count(*) from public.lessons where starts_at is null or ends_at is null;
-- count: lessons_status_out_of_enum
select count(*) from public.lessons where status::text not in ('scheduled', 'confirmed', 'completed', 'late', 'excused', 'no_show', 'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled');
-- count: subscriptions_package_out_of_enum
select count(*) from public.subscriptions where package is not null and package::text not in ('trial', '4', '8', '12', '16', '20', '28');
-- count: subscriptions_status_out_of_enum
select count(*) from public.subscriptions where status::text not in ('trial', 'active', 'paused', 'expired', 'unpaid', 'cancelled');
-- count: subscriptions_required_null
select count(*) from public.subscriptions where starts_on is null or status is null;
-- count: payments_portal_required_null
select count(*) from public.payments where paid_at is null or amount is null or currency is null or kind is null;
-- count: payments_kind_out_of_enum
select count(*) from public.payments where kind::text not in ('payment', 'refund');
