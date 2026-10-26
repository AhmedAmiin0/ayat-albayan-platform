-- Family accounts (docs/30 §4): WhatsApp AUTHENTICATION templates (the sign-in code, `account_code`).
-- Its own migration: a new enum value cannot be used in the transaction that adds it (migration 772 does).
--
-- Expand-only and idempotent. MANUAL ROLLBACK: none needed (an unused enum value is harmless; Postgres
-- cannot drop one without recreating the type).

alter type public.template_category add value if not exists 'authentication';
