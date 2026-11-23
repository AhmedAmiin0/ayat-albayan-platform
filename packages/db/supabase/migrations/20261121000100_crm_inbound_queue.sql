-- Messages a family or teacher sends to the notifications number, mirrored from the academy CRM
-- into the inbox (owner 2026-11-21: «if the user sent a message to the notification line send it
-- to chatline»; docs/19 «crm driver»). POST /webhooks/wacrm stores the CRM's message.received
-- delivery here and answers 200 at once; CrmInboundJob looks up the contact (phone, name) and the
-- message's media in the CRM, hands it to the usual inbound path, then deletes the row. A lookup
-- failure keeps the row with a later next_at (backoff): a message is never dropped.
--
-- Dedup key = the WhatsApp message id (rule 8): a re-sent delivery is a no-op insert, and the
-- inbound path itself is idempotent by messages.wa_message_id.
-- RLS on, no client policy: only the API's service role reads and writes. Times UTC.
-- Idempotent, expand-only.

set local lock_timeout = '5s';

create table if not exists public.crm_inbound_queue (
  wa_message_id text primary key,
  conversation_id text not null,
  contact_id text not null,
  content_type text not null,
  body text,
  received_at timestamptz not null,
  attempts int not null default 0,
  next_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  constraint crm_inbound_queue_ids_check check (
    char_length(wa_message_id) between 1 and 200
    and char_length(conversation_id) between 1 and 200
    and char_length(contact_id) between 1 and 200
    and char_length(content_type) between 1 and 40
    and attempts >= 0
  )
);

comment on table public.crm_inbound_queue is
  'CRM message.received deliveries waiting for their contact / media lookup (docs/19).';

-- The job reads the due rows, oldest first.
create index if not exists crm_inbound_queue_next_idx on public.crm_inbound_queue (next_at);

alter table public.crm_inbound_queue enable row level security;
revoke all on public.crm_inbound_queue from anon, authenticated;
