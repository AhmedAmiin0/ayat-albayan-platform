-- Two bell/push kinds (R-NOT-01, R-NOT-03): new_student (a teacher's new booking) and meeting_invite
-- (an internal meeting). Alone in this migration on purpose: a new enum value cannot be used in the
-- transaction that adds it, so only later migrations and the API use them. Idempotent.

alter type public.push_kind add value if not exists 'new_student';
alter type public.push_kind add value if not exists 'meeting_invite';
