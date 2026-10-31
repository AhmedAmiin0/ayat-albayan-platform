-- Edit and delete messages (owner 2026-10-30: «also add edit and delete message ability»).
-- WhatsApp's Cloud API (so Kapso and the CRM drivers too) cannot edit or revoke a sent message; only the
-- WhatsApp Business app can. So:
-- 1. In-app channel (migration 800): the sender edits their own text (15 min) and deletes their own
--    message for everyone (48 h); an admin deletes any (moderation). channel_messages gains edited_at,
--    deleted_at and deleted_by. The API stores the text being replaced or deleted in
--    channel_message_edits (audit, admin read only) and a deleted message's body becomes '-' (the body
--    check stays 1..2000; the API never serves a deleted body).
-- 2. channel_summaries also returns last_deleted, so a thread preview shows «تم حذف هذه الرسالة» once its
--    newest message is deleted. Unread counts are unchanged (an edit or a delete never moves them).
--    Dropped and created again in one transaction: the return type gains a column.
-- 3. WhatsApp chats: «حذف من المنصة» hides a message for staff only; messages gains hidden_at and
--    hidden_by. Nothing is sent to WhatsApp. v_threads is untouched (previews and unread counts stay).
--    The update fires the inbox broadcast (migration 860): open inboxes re-read the chat at once.
-- Expand only: new nullable columns, one new table (RLS on), one function re-created. No data changes.
-- Idempotent.

alter table public.channel_messages add column if not exists edited_at timestamptz;
alter table public.channel_messages add column if not exists deleted_at timestamptz;
alter table public.channel_messages
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null;

create table if not exists public.channel_message_edits (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.channel_messages (id) on delete cascade,
  kind text not null check (kind in ('edit', 'delete')),
  previous_body text not null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists channel_message_edits_message_idx
  on public.channel_message_edits (message_id, created_at);
create index if not exists channel_message_edits_actor_idx
  on public.channel_message_edits (actor_profile_id) where actor_profile_id is not null;

alter table public.channel_message_edits enable row level security;
drop policy if exists channel_message_edits_admin_read on public.channel_message_edits;
create policy channel_message_edits_admin_read on public.channel_message_edits for select to authenticated
  using ((select public.is_admin()));
revoke all on public.channel_message_edits from anon;
revoke insert, update, delete, truncate, references, trigger on public.channel_message_edits from authenticated;

alter table public.messages add column if not exists hidden_at timestamptz;
alter table public.messages
  add column if not exists hidden_by uuid references public.profiles (id) on delete set null;
create index if not exists messages_hidden_by_idx on public.messages (hidden_by) where hidden_by is not null;

drop function if exists public.channel_summaries(uuid, uuid[], text[]);
create function public.channel_summaries(p_profile uuid, p_student_ids uuid[], p_count_roles text[])
  returns table (student_id uuid, channel_id uuid, unread int, last_body text, last_role text,
                 last_at timestamptz, last_deleted boolean)
  language sql stable security definer set search_path = '' as $$
  select c.student_id, c.id,
    (select count(*)::int from public.channel_messages m
      where m.channel_id = c.id and m.sender_profile_id is distinct from p_profile
        and m.sender_role = any(p_count_roles)
        and m.created_at > coalesce((select r.last_read_at from public.channel_reads r
                                      where r.channel_id = c.id and r.profile_id = p_profile), '-infinity')),
    l.body, l.sender_role, l.created_at, l.deleted_at is not null
  from public.student_channels c
  left join lateral (select m.body, m.sender_role, m.created_at, m.deleted_at from public.channel_messages m
                      where m.channel_id = c.id order by m.created_at desc limit 1) l on true
  where c.student_id = any(p_student_ids)
$$;
revoke execute on function public.channel_summaries(uuid, uuid[], text[]) from public, anon, authenticated;
grant execute on function public.channel_summaries(uuid, uuid[], text[]) to service_role;

-- MANUAL ROLLBACK (only after the code rollback): drop table public.channel_message_edits;
--   alter table public.channel_messages drop column edited_at, drop column deleted_at, drop column deleted_by;
--   alter table public.messages drop column hidden_at, drop column hidden_by;
--   re-create channel_summaries from migration 800.
