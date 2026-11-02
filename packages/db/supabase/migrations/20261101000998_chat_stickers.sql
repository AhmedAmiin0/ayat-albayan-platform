-- Stickers and GIFs in the chat (owner 2026-11-01: «add stickers and GIFs», like WhatsApp).
--   * public.sticker_favourites: each staff member's favourite stickers («أضف إلى المفضلة» on a
--     sticker bubble). One row per (profile, sticker_key): the key is WhatsApp's sha256 of the file
--     («sha:…», the same sticker across its messages) or «msg:<message id>»; message_id is the
--     message holding the file today (its chat signs it; deleting the message drops the row).
--     RLS on: a signed-in user reads and writes only their own rows; the API uses the service role.
--   * messages_sticker_idx: the panel's «الأحدث» reads the newest WebP messages of every chat.
--   * integration_secret_key_ok: re-created with the full list, GIPHY_API_KEY added (Vault name
--     integration:GIPHY_API_KEY, «التكاملات» › GIPHY). Unset = the GIF tab says an admin must add it.
-- Expand only. Idempotent. Writes no row.

set local lock_timeout = '5s';

create table if not exists public.sticker_favourites (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  sticker_key text not null check (sticker_key ~ '^(sha|msg):[A-Za-z0-9+/=_-]{1,200}$'),
  message_id uuid not null references public.messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, sticker_key)
);
create index if not exists sticker_favourites_message_idx on public.sticker_favourites (message_id);
alter table public.sticker_favourites enable row level security;
revoke all on public.sticker_favourites from anon;
revoke all on public.sticker_favourites from authenticated;
grant select, insert, update, delete on public.sticker_favourites to authenticated, service_role;

drop policy if exists sticker_favourites_own on public.sticker_favourites;
create policy sticker_favourites_own on public.sticker_favourites
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create index if not exists messages_sticker_idx on public.messages (created_at desc)
  where media_mime = 'image/webp';

create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET',
    'WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET', 'CALLS_TURN_SECRET',
    'STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET', 'GIPHY_API_KEY'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

-- MANUAL ROLLBACK (only after the code rollback):
--   drop table if exists public.sticker_favourites;
--   drop index if exists public.messages_sticker_idx;
--   select public.integration_secret_clear('GIPHY_API_KEY');
--   then re-create integration_secret_key_ok as in 20261101000997_stripe_integrations.sql.
