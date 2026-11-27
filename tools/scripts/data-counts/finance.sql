-- Rows of public.expenses that the expense answer schema would refuse (docs/62 C1).
-- count: expenses_required_null
select count(*) from expenses where month is null or category is null or amount is null or currency is null or created_at is null or recurring is null or is_draft is null;
-- count: expenses_method_out_of_enum
select count(*) from expenses where method is not null and method::text not in ('bank', 'wallet', 'cash', 'other', 'card');
-- count: expense_categories_required_null
select count(*) from expense_categories where key is null or label_ar is null or active is null;
-- Rows the teacher earnings answer schemas would refuse (docs/62 C1).
-- count: teacher_payments_method_out_of_enum
select count(*) from teacher_payments where method::text not in ('bank', 'wallet', 'cash', 'other', 'card');
-- Rows the teacher payout answer schema would refuse (docs/62 C1).
-- count: teacher_payouts_required_null
select count(*) from teacher_payouts where month is null or lessons_count is null or amount is null or status is null;
-- count: teacher_payouts_status_out_of_enum
select count(*) from teacher_payouts where status::text not in ('draft', 'approved', 'paid');
-- count: teacher_payouts_method_out_of_enum
select count(*) from teacher_payouts where method is not null and method::text not in ('bank', 'wallet', 'cash', 'other', 'card');
-- Rows the payment answer schemas would refuse (docs/62 C1).
-- count: payments_required_null
select count(*) from payments where subscription_id is null or amount is null or currency is null or method is null or paid_at is null or created_at is null or kind is null;
-- count: payments_method_out_of_enum
select count(*) from payments where method::text not in ('bank', 'wallet', 'cash', 'other', 'card');
-- count: payments_kind_out_of_enum
select count(*) from payments where kind::text not in ('payment', 'refund');
-- Rows the assistant pay admin answer schemas would refuse (docs/62 C1).
-- count: assistant_commissions_required_null
select count(*) from assistant_commissions where assistant_id is null or student_id is null or share_percent is null or rate is null or base_amount is null or base_currency is null or amount is null or currency is null or earned_at is null;
-- count: assistant_commissions_type_out_of_enum
select count(*) from assistant_commissions where commission_type is null or commission_type::text not in ('percent', 'fixed');
-- count: assistant_commissions_status_out_of_enum
select count(*) from assistant_commissions where status is null or status::text not in ('earned', 'voided');
-- count: assistant_terms_type_out_of_enum
select count(*) from assistant_terms where commission_type is not null and commission_type::text not in ('percent', 'fixed');
-- Rows the assistant statement answer schema would refuse (docs/62 C1).
-- count: assistant_statements_required_null
select count(*) from assistant_statements where assistant_id is null or month is null or status is null;
-- count: assistant_statements_status_out_of_enum
select count(*) from assistant_statements where status::text not in ('draft', 'approved', 'paid');
-- count: assistant_statements_method_out_of_enum
select count(*) from assistant_statements where method is not null and method::text not in ('bank', 'wallet', 'cash', 'other', 'card');
-- Rows the subscription answer schema would refuse (docs/62 C1).
-- count: subscriptions_required_null
select count(*) from subscriptions where student_id is null or duration is null or lessons_total is null or price is null or currency is null or price_source is null or starts_on is null or status is null or created_at is null;
-- count: subscriptions_price_source_not_object
select count(*) from subscriptions where not (price_source @> '{}');
-- count: subscriptions_duration_out_of_enum
select count(*) from subscriptions where duration not in (30, 45, 60, 90);
-- count: subscriptions_package_out_of_enum
select count(*) from subscriptions where package is not null and package::text not in ('trial', '4', '8', '12', '16', '20', '28');
