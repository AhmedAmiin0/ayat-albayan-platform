-- Which device each Expo push ticket went to (R-MOB-01). Expo answers a send with one ticket per
-- message; about 15 minutes later its receipt says whether FCM / APNs took it. A device FCM no
-- longer knows gets an ok ticket and then a DeviceNotRegistered receipt that names no token, so the
-- receipts job could not tell which device to drop and the API kept pushing to it for days. The API
-- now stores ticket id -> token here for the tickets still in ticket_ids, and the receipts job
-- deletes that token's push_device_sessions binding (migration 700's release trigger then takes the
-- token off the profile), as the ticket path already does.
--
-- A constant default: metadata only, no table rewrite. No CHECK (it would scan the table under an
-- ACCESS EXCLUSIVE lock): the API parses the value with zod. RLS and grants unchanged: a user reads
-- only their own rows (migration 185), the same exposure as push_device_sessions_own_read; only the
-- service role writes.
--
-- Idempotent, expand-only: the previous API ignores the column.

set local lock_timeout = '5s';

alter table public.push_notifications
  add column if not exists ticket_tokens jsonb not null default '{}'::jsonb;

comment on column public.push_notifications.ticket_tokens is
  'Expo ticket id to the push token it went to, for the tickets still in ticket_ids: a receipt names no token.';

-- MANUAL ROLLBACK (only after the code rollback):
--   alter table public.push_notifications drop column ticket_tokens;
