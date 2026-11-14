-- The family app's pushes (docs/50 §5 item 6): «الحلقة على وشك البدء» when a lesson's join window
-- opens (lesson_starting) and «وصل تقرير الحلقة» when its report reaches the family (report_sent), to
-- the guardian's and the student's own logins (bell row + device push). Guardians and students hold
-- notifications.push as a fixed portal grant in code (packages/catalog catalog.portal.ts): the API
-- resolves it, no role_permissions row is needed (migration 433 keeps the portal roles' rows empty).
-- Their notification rules need no row: notification_rules stores overrides only, and the catalogue
-- default is ON (bell + push); an admin turns either off in «الإشعارات».
-- Its own migration: a new enum value cannot be used in the transaction that adds it.
-- Idempotent (add value if not exists); expand-only: the previous API never writes them.
-- RLS / grants: unchanged (push_notifications keeps its policies; only the API's service role writes).
-- MANUAL ROLLBACK: none needed (Postgres cannot drop an enum value; unused, they are harmless).

alter type public.push_kind add value if not exists 'lesson_starting';
alter type public.push_kind add value if not exists 'report_sent';
