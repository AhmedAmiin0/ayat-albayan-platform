-- Subscribe from the chat, verifier fix (R-SUB-01; rule 8).
--   * client_request_id: the id a subscribe form (web dialog, mobile screen) generates once and
--     re-sends on every retry. When a POST /subscriptions reached the server but its reply was lost
--     (a proxy 502/504, a dropped connection, two devices), the retry returns the package already
--     created instead of a second one that doubles the lessons and halves the amount shown as owed.
--     Same pattern as payments.client_request_id (migration 132).
alter table public.subscriptions add column client_request_id uuid;
create unique index subscriptions_client_request_id_key on public.subscriptions (client_request_id)
  where client_request_id is not null;
