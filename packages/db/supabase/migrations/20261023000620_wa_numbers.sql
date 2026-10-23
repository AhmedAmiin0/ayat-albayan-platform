-- Numbers as records (docs/23 §3 phase 3, owner answers 2026-10-22). A WhatsApp number becomes a row:
-- any number of rows; `purpose` (the existing wa_line enum) is a preset / default ROLE, never a limit.
-- Module mode (settings.comms_source = 'module') sends each role's traffic from that role's default
-- enabled number; per-template routing is phase 5. Credentials live in Vault (migration 621), never in
-- the row. Expand only: NO row is inserted here and NO secret is copied (only the admin's «استيراد
-- الإعداد الحالي» does that). Touches no sending switch: messaging_enabled, auto_messages_enabled,
-- crm_cutover_done and the allow-list are not read or written. Idempotent.

set local lock_timeout = '5s';

create table if not exists public.wa_numbers (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  purpose public.wa_line not null,
  provider text not null default 'meta' check (provider in ('meta', 'kapso')),
  phone_number_id text not null check (phone_number_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  waba_id text check (waba_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  app_id text check (app_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  -- Cached from the last good check of THIS phone_number_id (docs/23a §E H2, #134 item 9).
  display_phone_e164 text check (display_phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  enabled boolean not null default false,
  is_default boolean not null default false,
  -- The last check's facts (status, quality, gaps by name, error count): never a token or secret.
  health jsonb check (health is null or jsonb_typeof(health) = 'object'),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- One row per Meta phone number (the webhook names a number by this id).
create unique index if not exists wa_numbers_phone_number_id_key on public.wa_numbers (phone_number_id);
-- At most one live default per role; any number of other rows (spares, disabled, non-default).
create unique index if not exists wa_numbers_default_per_purpose on public.wa_numbers (purpose)
  where is_default and enabled;

drop trigger if exists wa_numbers_updated_at on public.wa_numbers;
create trigger wa_numbers_updated_at before update on public.wa_numbers
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; only the API (service role) writes, like every messaging table.
alter table public.wa_numbers enable row level security;
drop policy if exists wa_numbers_admin_read on public.wa_numbers;
create policy wa_numbers_admin_read on public.wa_numbers for select to authenticated
  using (public.is_admin());
revoke all on public.wa_numbers from anon;
revoke insert, update, delete, truncate, references, trigger on public.wa_numbers from authenticated;

-- The number a row went out from (audit, per-number stats): set by the API worker at claim when known
-- (module mode); null for every older row and while comms_source = legacy.
alter table public.messages add column if not exists number_id uuid references public.wa_numbers (id) on delete set null;
create index if not exists messages_number_id_idx on public.messages (number_id) where number_id is not null;

-- #134 item 9: the kept line check names the phone_number_id it checked, so a swapped number no longer
-- shows the old phone (the API shows a row only while it matches the line's current id).
alter table public.wa_line_health add column if not exists phone_number_id text
  check (phone_number_id ~ '^[A-Za-z0-9_-]{1,64}$');

-- Where the line config comes from (docs/23 §2e step 5). Default legacy; an unknown, missing or malformed
-- value reads as legacy (the registry default). Only POST /admin/communications/source writes it.
insert into public.settings (key, value) values ('comms_source', '"legacy"'::jsonb)
on conflict (key) do nothing;

-- «الأرقام»: the new grantable permission numbers.manage, for the system admin (who holds every grantable
-- key in the API anyway; the row is for readers, like every earlier seed). Reading needs settings.read.
insert into public.role_permissions (role_id, permission)
select r.id, 'numbers.manage' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;

-- MANUAL ROLLBACK (only after the code rollback; run 621's rollback first):
--   delete from public.role_permissions where permission = 'numbers.manage';
--   delete from public.settings where key = 'comms_source';
--   alter table public.wa_line_health drop column phone_number_id;
--   alter table public.messages drop column number_id;
--   drop table public.wa_numbers;
