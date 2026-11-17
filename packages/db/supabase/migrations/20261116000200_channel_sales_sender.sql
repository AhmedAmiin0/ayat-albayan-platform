-- The owning assistant writes in the student chat too (owner 2026-11-16: «yes it can write also»,
-- after «all 4 will receive the message teacher guardian student and the assistant»; docs/31 §2).
--
-- channel_messages.sender_role allows 'sales' beside 'teacher', 'guardian' and 'student'. The check
-- was declared inline in migration 800, so Postgres named it channel_messages_sender_role_check.
-- packages/shared CHANNEL_SENDER_ROLES is the same list (channel-sales-sender.migration.test.ts).
--
-- Widening only: every existing row still passes, so the new check is validated at once.
-- lock_timeout keeps the brief ACCESS EXCLUSIVE lock from queueing traffic.
-- Idempotent: drop if exists, then add. Writes no row. RLS and grants: unchanged (the API, service
-- role, is the only writer; can_read_channel already lets the owning assistant read).
--
-- MANUAL ROLLBACK (only after the code rollback and once no 'sales' row is left): drop the check
-- and add it back with ('teacher', 'guardian', 'student').

set local lock_timeout = '5s';

alter table public.channel_messages drop constraint if exists channel_messages_sender_role_check;

alter table public.channel_messages
  add constraint channel_messages_sender_role_check
  check (sender_role in ('teacher', 'guardian', 'student', 'sales'));
