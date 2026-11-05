-- «تم استلام دفعة» (owner 2026-11-05): when a family's payment comes in (recorded by hand, a receipt from
-- the chat, a renewal, or a Stripe payment link), the admins and the student's following assistant get a
-- bell row and a device push. Its notification rule needs no row: notification_rules stores overrides
-- only, and the catalogue default is ON (bell + push); an admin turns it off in «الإشعارات».
-- Its own migration: a new enum value cannot be used in the transaction that adds it.
-- Idempotent (add value if not exists); expand-only: the previous API never writes it.
-- RLS / grants: unchanged (push_notifications keeps its policies; only the API's service role writes).
-- MANUAL ROLLBACK: none needed (Postgres cannot drop an enum value; unused, it is harmless).

alter type public.push_kind add value if not exists 'payment_received';
