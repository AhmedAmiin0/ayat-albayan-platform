-- In-house short links (owner 2026-11-05: «make an in-house URL shortener instead of Vercel»). The
-- platform no longer sends the old Vercel redirector; GET <API>/r/<code> answers 302 to target_url.
-- Only the API (service role) reads and writes: RLS on, no client policy, no grant to anon /
-- authenticated. The API refuses any target that is not https on our own web / API origins or Google
-- Meet (no open redirect). One row per (kind, subject): a second issue for the same lesson keeps its
-- code and refreshes the target (idempotent). Times UTC; expires_at null = never.
-- Expand-only, idempotent.
-- MANUAL ROLLBACK: drop table if exists public.short_links;

set local lock_timeout = '5s';

create table if not exists public.short_links (
  code text primary key check (code ~ '^[A-Za-z0-9]{8,32}$'),
  target_url text not null check (target_url ~ '^https://' and char_length(target_url) <= 2048),
  kind text not null check (kind ~ '^[a-z_]{1,40}$'),
  subject text not null check (char_length(subject) between 1 and 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (kind, subject)
);

comment on table public.short_links is
  'In-house short links (docs/19): GET /r/<code> → 302 target_url. Service role only.';

alter table public.short_links enable row level security;
revoke all on public.short_links from anon, authenticated;
