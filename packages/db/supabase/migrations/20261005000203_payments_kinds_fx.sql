-- Student payments, re-managed (owner, 2026-10-05; R-PAY-01 TODOs decided):
--   * kind: 'payment' | 'refund' («استرداد»). A refund is stored with a POSITIVE amount and counts
--     AGAINST what the package has been paid (paid = payments − refunds; dashboard revenue too).
--   * another currency: allowed when an fx rate exists. `amount` / `currency` stay in the PACKAGE
--     currency (every sum keeps working); what the family actually sent is kept in
--     original_amount / original_currency, with fx_rate = package units per 1 original unit, taken
--     from the newest stored rate at paid_at (else today's). Replaces the 400 currency_mismatch.
--   * invoice_id: a payment recorded from a booking's invoice («سجّل كدفعة») points at it instead of
--     copying the file (no double entry: one payment per invoice). Its receipt is the invoice.
-- Partial payment («مدفوع جزئيًا») is derived (0 < paid < price), the stored status enum is unchanged.
create type public.payment_kind as enum ('payment', 'refund');

alter table public.payments
  add column kind public.payment_kind not null default 'payment',
  add column original_amount numeric(12, 2) check (original_amount > 0),
  add column original_currency text check (original_currency ~ '^[A-Z]{3}$'),
  add column fx_rate numeric(18, 8) check (fx_rate > 0),
  add column invoice_id uuid references public.invoices (id) on delete set null,
  add constraint payments_original_check
    check ((original_amount is null) = (original_currency is null) and (original_amount is null) = (fx_rate is null));

create unique index payments_invoice_key on public.payments (invoice_id) where invoice_id is not null;
