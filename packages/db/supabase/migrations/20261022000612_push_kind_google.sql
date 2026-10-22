-- The bell's Google sync alert (docs/24 §3): an admin-only bell row when the Google link expired
-- (invalid_grant) or a teacher has no mapped calendar. Bell only: no WhatsApp, no push.
-- Its own migration: a new enum value cannot be used in the transaction that adds it.
-- Idempotent (add value if not exists); expand-only: the previous API never writes it.

alter type public.push_kind add value if not exists 'google_sync_alert';
