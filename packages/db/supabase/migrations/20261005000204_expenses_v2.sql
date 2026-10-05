-- Expenses, re-managed (owner, 2026-10-05; R-RPT-02, issue E4):
--   * categories become a table the admin can extend (expense_categories); the 5 old enum values
--     are kept as keys and rent, salaries, platform_fees, marketing_tools are added. expenses.category
--     stays a text key (FK, on update cascade), so existing rows keep their category as-is.
--   * paid_on (the day it was paid; month stays the accounting month), vendor, method, and a
--     receipt in the private receipts bucket (receipts/expenses/{uuid}.{ext}, signed upload).
--   * «تكرار شهري»: recurring = true; create_recurring_expense_drafts(month) copies every recurring
--     expense of the month before into `month` as a DRAFT (is_draft), once per chain:
--     unique (template_id, month) (rule 8). A draft is not counted until the admin confirms it.
create table public.expense_categories (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label_ar text not null check (length(trim(label_ar)) > 0),
  label_en text,
  sort int not null default 100,
  active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
insert into public.expense_categories (key, label_ar, label_en, sort) values
  ('ads', 'إعلانات', 'Ads', 10),
  ('content', 'محتوى', 'Content', 20),
  ('tools', 'أدوات واشتراكات', 'Tools & subscriptions', 30),
  ('operations', 'تشغيل', 'Operations', 40),
  ('rent', 'إيجار', 'Rent', 50),
  ('salaries', 'رواتب', 'Salaries', 60),
  ('platform_fees', 'رسوم المنصات', 'Platform fees', 70),
  ('marketing_tools', 'أدوات تسويق', 'Marketing tools', 80),
  ('other', 'أخرى', 'Other', 999)
on conflict (key) do nothing;

alter table public.expenses alter column category type text using category::text;
alter table public.expenses add constraint expenses_category_fkey foreign key (category)
  references public.expense_categories (key) on update cascade;
drop type public.expense_category;

alter table public.expenses
  add column paid_on date,
  add column vendor text check (vendor is null or length(vendor) <= 200),
  add column method public.payment_method,
  add column receipt_path text unique,
  add column recurring boolean not null default false,
  add column is_draft boolean not null default false,
  add column template_id uuid references public.expenses (id) on delete set null;
update public.expenses set paid_on = month where paid_on is null;
create unique index expenses_template_month_key on public.expenses (template_id, month)
  where template_id is not null;
create index expenses_category_idx on public.expenses (category, month);

create function public.create_recurring_expense_drafts(p_month date) returns int
  language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  insert into public.expenses (month, category, amount, currency, note, vendor, method, recurring,
                               is_draft, template_id, paid_on, created_by)
  select p_month, e.category, e.amount, e.currency, e.note, e.vendor, e.method, true,
         true, coalesce(e.template_id, e.id), null, e.created_by
  from public.expenses e
  where e.recurring and e.month = (p_month - interval '1 month')::date
  on conflict (template_id, month) where template_id is not null do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

alter table public.expense_categories enable row level security;
create policy expense_categories_admin on public.expense_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.expense_categories from anon;
revoke insert, update, delete, truncate, references, trigger on public.expense_categories from authenticated;
revoke execute on function public.create_recurring_expense_drafts(date) from public, anon, authenticated;
grant execute on function public.create_recurring_expense_drafts(date) to service_role;
