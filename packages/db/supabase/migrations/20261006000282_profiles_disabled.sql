-- Disabling a login (owner, 2026-10-06). The API also bans the auth user; these columns let the
-- AuthGuard refuse a still-valid JWT within the permission cache TTL. RLS is unchanged: the guards
-- of migration 225 stay (clients cannot write role / role_id or insert / delete profiles).
alter table public.profiles
  add column if not exists disabled_at timestamptz,
  add column if not exists disabled_by uuid references auth.users (id) on delete set null,
  add column if not exists disabled_reason text check (length(disabled_reason) <= 500);
create index if not exists profiles_disabled_idx on public.profiles (disabled_at) where disabled_at is not null;
