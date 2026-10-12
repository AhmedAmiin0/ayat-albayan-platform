-- The notification bell and browser push (owner 2026-10-12: «add notification bell and push
-- notifications to the web»; R-NOT-01, R-NOT-02, docs/03).
--
-- 1. push_notifications.read_at: the bell's unread state. The API (service role) stamps it for the
--    caller's own rows only (POST /me/notifications/read); clients still never write the table.
-- 2. public.web_push_subscriptions: one row per browser that allowed notifications (the Push API's
--    PushSubscription: endpoint + its two keys). Written by the API only (PUT/DELETE /me/web-push);
--    a user reads only their own rows. The endpoint host is allow-listed in the API (SSRF guard).
-- 3. integration_secret_key_ok: + WEB_PUSH_VAPID_PRIVATE_KEY (Vault), every earlier key kept.
-- 4. notifications.push for the teacher, the classroom assistant and sales (the bell is in every
--    staff portal; it was the admin's alone).
--
-- Idempotent: safe to run twice. Expand-only: the previous API and apps ignore the new column/table.

set local lock_timeout = '5s';

alter table public.push_notifications add column if not exists read_at timestamptz;

comment on column public.push_notifications.read_at is
  'When the recipient read it in the bell (web or app); null = unread. Stamped by the API only.';

-- The bell's badge counts a profile's unread rows on every poll.
create index if not exists push_notifications_unread_idx on public.push_notifications (profile_id)
  where read_at is null;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique
    check (endpoint ~ '^https://' and char_length(endpoint) <= 2048),
  -- PushSubscription.toJSON().keys: P-256 public key (65 bytes) and auth secret (16 bytes), base64url.
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}$'),
  created_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_profile_idx on public.web_push_subscriptions (profile_id);

-- RLS (rule 9): a user reads only their own browsers; only the API (service role) writes.
alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon;
revoke insert, update, delete, truncate, references, trigger on public.web_push_subscriptions
  from authenticated;
drop policy if exists web_push_subscriptions_own_read on public.web_push_subscriptions;
create policy web_push_subscriptions_own_read on public.web_push_subscriptions for select to authenticated
  using (profile_id = (select auth.uid()));

-- The secret keys (packages/shared/src/integrations/keys.ts): migration 310's list plus the VAPID
-- private key. Anything else is refused.
create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

insert into public.role_permissions (role_id, permission)
select r.id, 'notifications.push' from public.roles r where r.is_system and r.key in ('teacher', 'assistant', 'sales')
on conflict do nothing;

-- MANUAL ROLLBACK (only after the code rollback):
--   delete from public.role_permissions rp using public.roles r
--     where rp.role_id = r.id and r.is_system and r.key <> 'admin' and rp.permission = 'notifications.push';
--   drop table public.web_push_subscriptions;
--   drop index public.push_notifications_unread_idx;
--   alter table public.push_notifications drop column read_at;
--   (and re-run migration 310's integration_secret_key_ok)
