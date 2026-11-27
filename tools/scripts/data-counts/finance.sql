-- Rows of public.expenses that the expense answer schema would refuse (docs/62 C1).
-- count: expenses_required_null
select count(*) from expenses where month is null or category is null or amount is null or currency is null or created_at is null or recurring is null or is_draft is null;
-- count: expenses_method_out_of_enum
select count(*) from expenses where method is not null and method::text not in ('bank', 'wallet', 'cash', 'other');
-- count: expense_categories_required_null
select count(*) from expense_categories where key is null or label_ar is null or active is null;
