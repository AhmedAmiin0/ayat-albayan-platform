-- Notifications are personal: a signed-in user reads only the push_notifications rows addressed to
-- them (profile_id = their own id). Migration 143 let EVERY admin read EVERY admin's rows; nothing in
-- the apps reads this table directly (the API, service role, writes and reads it), so the policy is
-- tightened without touching any client. Writes stay API-only (no write policy, grants revoked in 143).
drop policy if exists push_notifications_admin_read on public.push_notifications;
create policy push_notifications_own_read on public.push_notifications for select to authenticated
  using (profile_id = (select auth.uid()));
