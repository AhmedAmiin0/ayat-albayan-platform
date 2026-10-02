-- Payments, Phase 3 verifier fixes (R-PAY-01, R-MOB-02; rule 8).
--   * client_request_id: the id a client generates once per payment form and re-sends on every
--     retry. When a POST reached the server but its reply was lost, the retry returns the row
--     already recorded instead of booking the same money twice (as schedule_rules.client_request_id
--     does for bookings).
--   * receipt_path is unique: one uploaded receipt belongs to one payment, so updating or deleting
--     a payment can discard its object without breaking another payment's link.
alter table public.payments add column client_request_id uuid;
create unique index payments_client_request_id_key on public.payments (client_request_id)
  where client_request_id is not null;
create unique index payments_receipt_path_key on public.payments (receipt_path)
  where receipt_path is not null;
