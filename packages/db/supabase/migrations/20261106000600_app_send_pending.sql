-- «أرسل عبر واتساب» confirmed by the app's echo (owner 2026-11-06, docs/19): the tap no longer
-- marks a held text sent. POST /messages/:id/app-send only opens a short pending window on the row:
--   messages.app_send_until = now() + 10 min (re-opening WhatsApp extends it).
-- While it is in the future the sender, the release of held texts and any retry never send the row.
-- The WhatsApp Business app's echo (or Kapso's status / catch-up of that message) attaches to it
-- (its wamid, sent / delivered / read) and clears the column; with no echo the window just passes
-- and the row is as it was before the tap (held with its deadline, or failed).
-- The partial index serves the attach's read: one phone's rows with a window set.
-- RLS is unchanged: no new table; messages keeps its policies. Re-runs safely.
-- ROLLBACK (manual, after the code rollback):
--   drop index if exists public.messages_app_send_idx;
--   alter table public.messages drop column if exists app_send_until;
set local lock_timeout = '5s';

alter table public.messages add column if not exists app_send_until timestamptz;

comment on column public.messages.app_send_until is
  'أرسل عبر واتساب: never sent by the platform before this instant; null = no pending app send';

create index if not exists messages_app_send_idx
  on public.messages (phone_e164, app_send_until)
  where app_send_until is not null;
