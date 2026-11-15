-- «رابط دفع» in every package currency (2026-11-14: a QAR link failed). docs/30.
--
-- Migration 941 allowed SAR and USD only, but the catalog prices the site's countries in SAR, AED,
-- QAR, KWD and OMR, and everyone else in USD (packages/money CURRENCY_ISOS). A QAR package passed
-- every API check, then the link insert broke payment_links_currency_check (500 «تعذّر الحفظ»)
-- after the unpaid package was already written. The check now holds every catalog currency; the
-- API sends KWD / OMR to Stripe in thousandths (packages/shared toStripeAmount) and refuses any
-- other currency before a write (400 currency_not_supported). packages/shared
-- PAYMENT_LINK_CURRENCIES is the same list (payment-links-currencies.migration.test.ts pins it).
--
-- Widening only: every existing row (SAR, USD) still passes, so the new check is validated at once.
-- payment_links is small; lock_timeout keeps the brief ACCESS EXCLUSIVE lock from queueing traffic.
-- Idempotent: drop if exists, then add.

set local lock_timeout = '5s';

alter table public.payment_links drop constraint if exists payment_links_currency_check;

alter table public.payment_links
  add constraint payment_links_currency_check
  check (currency in ('SAR', 'AED', 'QAR', 'KWD', 'OMR', 'USD'));

-- RLS / grants: unchanged (migration 941: RLS on; admins all, a salesperson her own links).
