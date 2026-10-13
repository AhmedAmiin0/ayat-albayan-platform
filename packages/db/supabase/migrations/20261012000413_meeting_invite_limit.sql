-- The daily limit of WhatsApp meeting invitations (R-MEET-02: 100 per staff login per day, 409
-- invite_limit) counts the login's queued rows whose dedup key starts with «meeting_invite:» (resends
-- included). This partial index keeps that count cheap. Re-runnable.
create index if not exists messages_meeting_invite_by_creator_idx on public.messages (created_by, created_at)
  where dedup_key like 'meeting_invite:%';
