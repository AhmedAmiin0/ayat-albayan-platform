-- A dedicated calls number (docs/28 §10, owner 2026-10-27 «oke add the second number»): wa_numbers.purpose
-- (the wa_line enum) gains `calls`, a number that only carries WhatsApp calls and never sends a regular
-- message. Alone in this migration on purpose: a new enum value cannot be used in the transaction that adds
-- it, so only migration 941 and the API use it. Expand only: no row is written. Idempotent.

alter type public.wa_line add value if not exists 'calls';

-- MANUAL ROLLBACK: none needed (an unused enum value is harmless; Postgres cannot drop one).
