-- «بدأت الحلقة» (owner 2026-11-16): the family app's push when the teacher first enters the lesson
-- room (LiveKit participant_joined of the teacher's identity), to the student's guardian and own
-- logins; it opens the room straight in. Keyed lesson_live:lesson:<id>:<profile> (rule 8).
-- Like 20261114000300: the portal roles hold notifications.push in code (packages/catalog), the
-- catalogue default is ON (bell + push), notification_rules stores overrides only.
-- Its own migration: a new enum value cannot be used in the transaction that adds it.
-- Idempotent (add value if not exists); expand-only: the previous API never writes it.
-- RLS / grants: unchanged (push_notifications keeps its policies; only the API's service role writes).
-- MANUAL ROLLBACK: none needed (Postgres cannot drop an enum value; unused, it is harmless).

alter type public.push_kind add value if not exists 'lesson_live';
