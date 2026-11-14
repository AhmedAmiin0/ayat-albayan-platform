-- «رابط دفع» in every 2-decimal package currency (2026-11-14: a QAR link failed). docs/30.
--
-- Migration 941 allowed SAR and USD only, but the catalog prices the site's countries in SAR, AED,
-- QAR, KWD and OMR (packages/money CURRENCY_ISOS). A QAR package passed every API check, then the
-- link insert broke payment_links_currency_check (500 «تعذّر الحفظ») after the unpaid package was
-- already written. AED and QAR have 2 decimals like SAR and USD, so the amounts sent to Stripe
-- (×100) are exact. KWD and OMR (3 decimals) stay out: the API refuses them before any write
-- (400 currency_not_supported); packages/shared PAYMENT_LINK_CURRENCIES holds the same list.
--
-- Widening only: every existing row (SAR, USD) still passes, so the new check is validated at once.
-- payment_links is small; lock_timeout keeps the brief ACCESS EXCLUSIVE lock from queueing traffic.
-- Idempotent: drop if exists, then add.

set local lock_timeout = '5s';

alter table public.payment_links drop constraint if exists payment_links_currency_check;

alter table public.payment_links
  add constraint payment_links_currency_check
  check (currency in ('SAR', 'AED', 'QAR', 'USD'));

-- RLS / grants: unchanged (migration 941: RLS on; admins all, a salesperson her own links).
