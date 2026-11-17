-- Managed short links for the admin and sales (owner 2026-11-17: «a url shortener that saves the code
-- in the db and the target url and the number of allowed users and if it is user specified or not
-- and if it should be sent via whatsapp … if they are system users show me who they are, if not we
-- will require whatsapp otp», «link is many to many with the users»). docs/19 «Short links».
--
-- 1. short_links gains the managed columns. System links (kind teacher_report, classroom, feedback,
--    report_pdf) keep working exactly as now: the new columns default to an active, open link.
--    A managed link is kind 'managed' with subject = its code, a title and an expiry.
-- 2. short_link_users: the many-to-many link ↔ user list (a profile, a phone, or both), with the
--    WhatsApp send state of each row.
-- 3. short_link_visits: one row per DISTINCT visitor of a link (a signed-in profile, or a phone
--    verified by a WhatsApp code), with the person a verified phone belongs to when known.
-- 4. short_link_record_visit(): the visit write, atomic per link (row lock), so max_users holds
--    under parallel opens; a returning visitor always passes.
-- 5. login_codes: purpose and subject kind 'short_link' (the gate's WhatsApp codes reuse the
--    sign-in machinery: HMAC, expiry, attempts, per-phone limits, breaker).
-- 6. The template short_link (notifications line, not_submitted until the owner submits it) and
--    the permissions short_links.manage (admin, sales) and short_links.all (admin).
--
-- RLS on every new table with no client policy: only the API's service role reads and writes.
-- Times UTC. Idempotent, expand-only.

set local lock_timeout = '5s';

-- id: the audit rows' entity_id (audit_log.entity_id is a uuid; the code stays the key). The table
-- holds a few hundred rows: the volatile default rewrites it under the short lock timeout.
alter table public.short_links
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists title text,
  add column if not exists max_users int,
  add column if not exists audience text not null default 'anyone',
  add column if not exists send_whatsapp boolean not null default false,
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'short_links_id_key') then
    alter table public.short_links add constraint short_links_id_key unique (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'short_links_managed_check') then
    alter table public.short_links add constraint short_links_managed_check check (
      (title is null or char_length(btrim(title)) between 1 and 120)
      and (max_users is null or max_users between 1 and 10000)
      and audience in ('anyone', 'listed')
      and status in ('active', 'expired', 'revoked')
      and (kind <> 'managed' or (title is not null and expires_at is not null and subject = code))
    );
  end if;
end $$;

comment on column public.short_links.audience is
  'anyone: any signed-in user or verified phone; listed: only the rows of short_link_users.';
comment on column public.short_links.max_users is
  'Distinct visitors allowed (null = unlimited); a returning visitor always passes.';

-- The cron (expire every 15 min, purge daily) and the admin list (newest first, per owner).
create index if not exists short_links_managed_expiry_idx
  on public.short_links (expires_at) where kind = 'managed';
create index if not exists short_links_managed_owner_idx
  on public.short_links (created_by, created_at desc) where kind = 'managed';
create index if not exists short_links_managed_created_idx
  on public.short_links (created_at desc) where kind = 'managed';

create table if not exists public.short_link_users (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.short_links (code) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  added_by uuid references public.profiles (id) on delete set null,
  send_status text not null default 'not_sent'
    check (send_status in ('not_sent', 'queued', 'failed')),
  send_error text check (char_length(send_error) <= 80),
  send_attempts int not null default 0 check (send_attempts >= 0),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(profile_id, phone_e164) >= 1),
  unique (code, profile_id),
  unique (code, phone_e164)
);

comment on table public.short_link_users is
  'Who may open a managed short link (docs/19): a profile and/or an E.164 phone. Service role only.';

create index if not exists short_link_users_profile_idx
  on public.short_link_users (profile_id) where profile_id is not null;
create index if not exists short_link_users_added_by_idx
  on public.short_link_users (added_by) where added_by is not null;

create table if not exists public.short_link_visits (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.short_links (code) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  matched_profile_id uuid references public.profiles (id) on delete set null,
  matched_guardian_id uuid references public.guardians (id) on delete set null,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  opens int not null default 1 check (opens >= 1),
  check (num_nonnulls(profile_id, phone_e164) = 1),
  unique (code, profile_id),
  unique (code, phone_e164)
);

comment on table public.short_link_visits is
  'One row per distinct visitor of a managed short link (docs/19). Service role only.';

create index if not exists short_link_visits_profile_idx
  on public.short_link_visits (profile_id) where profile_id is not null;
create index if not exists short_link_visits_matched_profile_idx
  on public.short_link_visits (matched_profile_id) where matched_profile_id is not null;
create index if not exists short_link_visits_matched_guardian_idx
  on public.short_link_visits (matched_guardian_id) where matched_guardian_id is not null;

alter table public.short_link_users enable row level security;
alter table public.short_link_visits enable row level security;
revoke all on public.short_link_users from anon, authenticated;
revoke all on public.short_link_visits from anon, authenticated;
