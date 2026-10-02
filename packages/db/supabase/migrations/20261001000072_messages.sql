-- WhatsApp message log + outbound queue. R-SCH-06 (queued booking confirmation), R-LES-02,
-- R-MSG-01..03 (sender, webhook and reminders arrive in Phase 4).
-- dedup_key makes every queued send idempotent (rule 8), e.g. `booking_confirmation:{lesson_id}`.
create type public.message_direction as enum ('inbound', 'outbound');
create type public.message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  direction public.message_direction not null,
  channel text not null default 'whatsapp',
  phone_e164 public.e164 not null,
  lead_id uuid references public.leads (id) on delete set null,
  guardian_id uuid references public.guardians (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  -- Meta template name (message_templates.key) and its positional params, e.g.
  -- {"1": "سهيلة", "2": "الأحد 4 أكتوبر 17:00", "button": "abc-defg-hij"}.
  template_key text,
  template_params jsonb,
  body text,
  wa_message_id text unique,
  status public.message_status not null default 'queued',
  error_code text,
  error_text text,
  dedup_key text unique,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  check (template_key is not null or body is not null)
);
create index messages_queue_idx on public.messages (status, scheduled_for);
create index messages_lead_idx on public.messages (lead_id, created_at desc);
create index messages_guardian_idx on public.messages (guardian_id, created_at desc);
create index messages_lesson_idx on public.messages (lesson_id);

-- RLS (rule 9): admins read; only the API (service role, bypasses RLS) writes.
alter table public.messages enable row level security;
create policy messages_admin_read on public.messages for select to authenticated
  using (public.is_admin());
