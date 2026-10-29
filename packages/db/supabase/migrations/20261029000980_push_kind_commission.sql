-- «محفظتي» (owner 2026-10-29): the assistant's bell row when a commission is earned («عمولة جديدة»), to the
-- assistant who brought the student (students.brought_by). Bell only: no WhatsApp, no push.
-- Its own migration: a new enum value cannot be used in the transaction that adds it.
-- Idempotent (add value if not exists); expand-only: the previous API never writes it.

alter type public.push_kind add value if not exists 'commission_earned';
