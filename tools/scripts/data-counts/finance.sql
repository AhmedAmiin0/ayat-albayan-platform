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
