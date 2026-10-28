-- «إلغاء الباقة» (owner 2026-10-28): a package made by mistake (nothing paid, no lesson booked) is
-- cancelled, never deleted (standing rule: never delete data). Step 1 of 2:
--   * subscription_status gains 'cancelled'. ALTER TYPE … ADD VALUE cannot be used in the transaction
--     that adds it, so every reader that must skip a cancelled package is in migration 934.
--   * subscriptions.cancelled_at / cancelled_by / cancel_reason: who cancelled it, when, and why
--     (POST /subscriptions/:id/cancel, POST /sales/subscriptions/:id/cancel; audited by the API).
-- Rollback: alter table public.subscriptions drop column cancel_reason, drop column cancelled_by,
--   drop column cancelled_at; (an enum value cannot be dropped: rows are moved off it first).
alter type public.subscription_status add value if not exists 'cancelled';

alter table public.subscriptions
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles (id) on delete set null,
  add column if not exists cancel_reason text check (char_length(cancel_reason) <= 500);

-- The FK column is indexed (a profile delete scans it otherwise).
create index if not exists subscriptions_cancelled_by_idx on public.subscriptions (cancelled_by)
  where cancelled_by is not null;
