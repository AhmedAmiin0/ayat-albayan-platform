-- The last good WhatsApp line check (docs/23 §3 phase 1, docs/23a §E H2): «افحص الخطوط» used to be
-- forgotten on reload, so a number was shown only after a live Meta call. The API (service role)
-- keeps, per line, the display number and verified name of the last check whose phone call
-- succeeded; «ماذا يُرسل ومتى» shows it without calling Meta. Ids, names and numbers only: never a
-- token or secret. Touches no setting: sending stays exactly as it was (fail-closed, docs/23).
-- Idempotent: safe to run twice.

create table if not exists public.wa_line_health (
  line public.wa_line primary key,
  display_phone_e164 text check (display_phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  verified_name text check (char_length(verified_name) <= 200),
  checked_at timestamptz not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists wa_line_health_updated_at on public.wa_line_health;
create trigger wa_line_health_updated_at before update on public.wa_line_health
  for each row execute function public.set_updated_at();

-- RLS (rule 9): admins read; only the API (service role) writes, like public.integration_config.
alter table public.wa_line_health enable row level security;
drop policy if exists wa_line_health_admin_read on public.wa_line_health;
create policy wa_line_health_admin_read on public.wa_line_health for select to authenticated
  using (public.is_admin());
revoke all on public.wa_line_health from anon;
revoke insert, update, delete, truncate on public.wa_line_health from authenticated;
