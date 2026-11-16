-- The student chat upgrade (docs/31 §2): photos, PDFs and voice notes, replies, read ticks and a
-- send that is safe to repeat.
--
-- 1. channel_messages gains
--    kind ('text' | 'photo' | 'pdf' | 'voice'; existing rows are text), the file (attachment_path in
--    the channel-media bucket, its type, size, name, a voice note's length), the reply (reply_to_id
--    and a snapshot of the quoted message taken at send time: deleting the original keeps it) and
--    client_id (the sending app's id per send: unique per sender and channel, so a resend finds the
--    stored row). The body may be empty when a file is attached; the cap stays 2000.
-- 2. channel_mark_read(channel, profile, at): a read mark only ever moves forward (a late request
--    with an older instant never makes read messages unread again). Service role only.
-- 3. Bucket channel-media ({channel_id}/{uuid}.{ext}, private): images and voice notes up to
--    10 MiB (the API checks the per-type cap), PDFs up to 15 MiB. Read: whoever may read the
--    channel (can_read_channel); no client writes (the API signs every upload).
-- 4. An index to find a message's bell rows (push_notifications kind channel_message, dedup key
--    channel_message:{message_id}:{profile_id}) when the message is edited or deleted.
--
-- Expand only: new nullable or defaulted columns, one relaxed check validated apart, new indexes on
-- a small table, one function, one bucket, one storage policy. Idempotent. Writes no row but the
-- bucket. lock_timeout keeps the brief ACCESS EXCLUSIVE locks from queueing traffic.
--
-- MANUAL ROLLBACK (only after the code rollback and once no file or empty body is left): drop the
--   new columns, indexes, constraints, channel_mark_read, can_read_channel_media, the policy
--   storage_channel_media_read and the bucket; add back check (char_length(body) between 1 and 2000).

set local lock_timeout = '5s';

alter table public.channel_messages
  add column if not exists kind text not null default 'text',
  add column if not exists attachment_path text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size integer,
  add column if not exists attachment_name text,
  add column if not exists attachment_duration_ms integer,
  add column if not exists reply_to_id uuid references public.channel_messages (id) on delete set null,
  add column if not exists quote_body text,
  add column if not exists quote_kind text,
  add column if not exists quote_sender_name text,
  add column if not exists quote_sender_role text,
  add column if not exists client_id uuid;

alter table public.channel_messages drop constraint if exists channel_messages_kind_check;
alter table public.channel_messages add constraint channel_messages_kind_check
  check (kind in ('text', 'photo', 'pdf', 'voice')
    and (quote_kind is null or quote_kind in ('text', 'photo', 'pdf', 'voice'))) not valid;
alter table public.channel_messages validate constraint channel_messages_kind_check;

-- A file message has its whole file; a text message none.
alter table public.channel_messages drop constraint if exists channel_messages_attachment_check;
alter table public.channel_messages add constraint channel_messages_attachment_check
  check ((kind = 'text') = (attachment_path is null)
    and (attachment_path is null or (attachment_mime is not null and attachment_name is not null
      and attachment_size between 1 and 15728640))
    and (attachment_duration_ms is null or attachment_duration_ms >= 0)) not valid;
alter table public.channel_messages validate constraint channel_messages_attachment_check;

-- Migration 800's inline check (named by Postgres) gives way to: 0..2000, empty only with a file.
alter table public.channel_messages drop constraint if exists channel_messages_body_check;
alter table public.channel_messages add constraint channel_messages_body_check
  check (char_length(body) between 0 and 2000 and (body <> '' or attachment_path is not null))
  not valid;
alter table public.channel_messages validate constraint channel_messages_body_check;

create unique index if not exists channel_messages_client_idx
  on public.channel_messages (channel_id, sender_profile_id, client_id) where client_id is not null;
-- The FK's own index (on delete set null looks the replies up).
create index if not exists channel_messages_reply_idx
  on public.channel_messages (reply_to_id) where reply_to_id is not null;

create or replace function public.channel_mark_read(p_channel uuid, p_profile uuid, p_at timestamptz)
  returns void language sql set search_path = '' as $$
  insert into public.channel_reads as r (channel_id, profile_id, last_read_at)
  values (p_channel, p_profile, p_at)
  on conflict (channel_id, profile_id)
  do update set last_read_at = greatest(r.last_read_at, excluded.last_read_at)
$$;
revoke execute on function public.channel_mark_read(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.channel_mark_read(uuid, uuid, timestamptz) to service_role;

create index if not exists push_notifications_channel_subject_idx
  on public.push_notifications (dedup_key text_pattern_ops) where kind = 'channel_message';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('channel-media', 'channel-media', false, 15728640,
   array['image/jpeg', 'image/png', 'application/pdf',
         'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Compares text, so a malformed object name never makes the policy throw.
create or replace function public.can_read_channel_media(p_name text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_channels c
    where c.id::text = split_part(p_name, '/', 1) and public.can_read_channel(c.id))
$$;
revoke execute on function public.can_read_channel_media(text) from public, anon;
grant execute on function public.can_read_channel_media(text) to authenticated, service_role;

drop policy if exists storage_channel_media_read on storage.objects;
create policy storage_channel_media_read on storage.objects for select to authenticated
  using (bucket_id = 'channel-media' and public.can_read_channel_media(name));
