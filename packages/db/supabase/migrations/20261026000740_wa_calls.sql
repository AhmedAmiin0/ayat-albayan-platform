-- WhatsApp voice calls from the academy chat number (docs/28, owner 2026-10-26: «add calls option»,
-- «make the calls option typical to whatsapp»). One row per call, written only by the API (service
-- role): the call row is persisted BEFORE any Kapso connect (biz_opaque_callback_data = id), and the
-- webhook / routes move its status forward only (packages/shared call-machine.ts). The clients read
-- through the API; the realtime publication only nudges them to re-read (no data path of its own).
--
-- Expand-only and idempotent: a new table, its policies, its publication entry and one more Vault key
-- name in integration_secret_key_ok. No existing row or setting value is read or written (the setting
-- whatsapp_calls_enabled is seeded by the API's config seeder as JSON null = its default false).

set local lock_timeout = '5s';

create table if not exists public.wa_calls (
  id uuid primary key default gen_random_uuid(),
  -- The chat number it rang on (module mode); null under legacy config (the chat line's keys).
  number_id uuid references public.wa_numbers (id) on delete set null,
  phone_e164 public.e164 not null,
  guardian_id uuid references public.guardians (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  status text not null check (status in ('connecting', 'ringing', 'accepting', 'active', 'ended')),
  end_reason text check (end_reason in ('completed', 'no_answer', 'rejected', 'cancelled', 'missed', 'declined', 'failed')),
  -- Meta's call id (wacid); null until Kapso answered our connect (outbound).
  wa_call_id text check (char_length(wa_call_id) between 1 and 200),
  offer_sdp text check (char_length(offer_sdp) <= 20000),
  answer_sdp text check (char_length(answer_sdp) <= 20000),
  -- Outbound: who placed it; inbound: null. accepted_by: who took an inbound call (first wins).
  created_by uuid references auth.users (id) on delete set null,
  accepted_by uuid references auth.users (id) on delete set null,
  -- Rule 8: a repeated tap (same staff member, same id) returns the first call, never a second connect.
  client_request_id uuid,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds >= 0),
  -- A short code (Meta / Kapso error code or ours), never a phone number or a payload.
  error_code text check (char_length(error_code) <= 80),
  updated_at timestamptz not null default now(),
  constraint wa_calls_ended_has_reason check ((status = 'ended') = (end_reason is not null))
);

create unique index if not exists wa_calls_wa_call_id_key on public.wa_calls (wa_call_id) where wa_call_id is not null;
create unique index if not exists wa_calls_request_key on public.wa_calls (created_by, client_request_id)
  where client_request_id is not null;
-- A chat's calls (merged into its log) and the calls log, newest first.
create index if not exists wa_calls_phone_started_idx on public.wa_calls (phone_e164, started_at desc);
create index if not exists wa_calls_started_idx on public.wa_calls (started_at desc);
-- The live ones (the incoming-call screen, the unanswered sweep): a handful of rows at most.
create index if not exists wa_calls_live_idx on public.wa_calls (status, started_at) where status <> 'ended';
create index if not exists wa_calls_number_id_idx on public.wa_calls (number_id) where number_id is not null;
create index if not exists wa_calls_guardian_id_idx on public.wa_calls (guardian_id) where guardian_id is not null;
create index if not exists wa_calls_lead_id_idx on public.wa_calls (lead_id) where lead_id is not null;
create index if not exists wa_calls_created_by_idx on public.wa_calls (created_by) where created_by is not null;
create index if not exists wa_calls_accepted_by_idx on public.wa_calls (accepted_by) where accepted_by is not null;

drop trigger if exists wa_calls_updated_at on public.wa_calls;
create trigger wa_calls_updated_at before update on public.wa_calls
  for each row execute function public.set_updated_at();

-- RLS (rule 9), like public.messages: the admin reads every call; a teacher (teacher mode) the calls of
-- their families' chats; a salesperson the calls of their chats. Only the API (service role) writes.
alter table public.wa_calls enable row level security;
drop policy if exists wa_calls_admin_read on public.wa_calls;
create policy wa_calls_admin_read on public.wa_calls for select to authenticated
  using ((select public.is_admin()));
drop policy if exists wa_calls_teacher_read on public.wa_calls;
create policy wa_calls_teacher_read on public.wa_calls for select to authenticated
  using (phone_e164::text in (select p.phone_e164 from public.my_thread_phones() p));
drop policy if exists wa_calls_sales_read on public.wa_calls;
create policy wa_calls_sales_read on public.wa_calls for select to authenticated
  using (phone_e164::text in (select p.phone_e164 from public.my_sales_phones() p));
revoke all on public.wa_calls from anon;
revoke insert, update, delete, truncate, references, trigger on public.wa_calls from authenticated;

-- Realtime: a changed row nudges the signed-in clients (RLS applies to what each one is told).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wa_calls'
     ) then
    alter publication supabase_realtime add table public.wa_calls;
  end if;
end
$$;

-- The TURN server's password (optional, «التكاملات» → «المكالمات الصوتية») lives in Vault: the latest list
-- (migration 640) plus CALLS_TURN_CREDENTIAL.
create or replace function public.integration_secret_key_ok(p_key text) returns boolean
  language sql immutable set search_path = '' as $$
  select p_key = any (array[
    'WA_ACCESS_TOKEN', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_CHAT_ACCESS_TOKEN', 'WA_CHAT_APP_SECRET',
    'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'EXPO_ACCESS_TOKEN', 'WEB_PUSH_VAPID_PRIVATE_KEY',
    'KAPSO_API_KEY', 'KAPSO_WEBHOOK_SECRET', 'GOOGLE_CLIENT_SECRET',
    'WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET', 'CALLS_TURN_CREDENTIAL'
  ]);
$$;

revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;
grant execute on function public.integration_secret_key_ok(text) to service_role;

-- MANUAL ROLLBACK (only after the code rollback; clear the TURN secret first):
--   select public.integration_secret_clear('CALLS_TURN_CREDENTIAL');
--   alter publication supabase_realtime drop table public.wa_calls;
--   drop table public.wa_calls;
--   (then re-run migration 640's integration_secret_key_ok)
