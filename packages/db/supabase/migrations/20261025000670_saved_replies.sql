-- «الردود السريعة» saved replies (owner 2026-10-25: «i want to add quick replies for assistants and
-- admins»). Named saved_replies: `quick reply` is WhatsApp's interactive reply buttons elsewhere.
--   owner_profile_id null  a SHARED reply: every inbox user (the admin, assistants = base role sales)
--                          reads it; only holders of saved_replies.manage (migration 671) write it.
--   owner_profile_id set   a PERSONAL reply «ردودي»: read and written by its owner only.
-- A reply = title (1–60) + body (1–4096, the WhatsApp text limit) with {name} / {student} / {assistant}
-- placeholders filled on the client, + an optional image or PDF in wa-media at saved/{actor}/{uuid}.{ext}
-- (the chat's own bucket and types). Nothing is ever sent from this table: the composer sends through
-- the existing session path. The API (service role) does the writes and the storage cleanup; the
-- policies below are the same rules for any direct read or write. Expand-only, re-runnable.

set local lock_timeout = '5s';

create table if not exists public.saved_replies (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60 and title = btrim(title)),
  body text not null check (char_length(body) between 1 and 4096),
  attachment_path text check (attachment_path is null or attachment_path like 'saved/%'),
  attachment_mime text check (attachment_mime is null or attachment_mime in ('image/jpeg', 'image/png', 'application/pdf')),
  attachment_name text check (attachment_name is null or char_length(btrim(attachment_name)) between 1 and 200),
  attachment_size integer check (attachment_size is null or attachment_size > 0),
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The four attachment columns are all set or all empty.
  constraint saved_replies_attachment_whole check (num_nonnulls(attachment_path, attachment_mime, attachment_name, attachment_size) in (0, 4))
);

-- Both lists read «by position, then title»: the shared one (owner null) and one person's.
create index if not exists saved_replies_list_idx on public.saved_replies (owner_profile_id, position, title);

drop trigger if exists saved_replies_updated_at on public.saved_replies;
create trigger saved_replies_updated_at before update on public.saved_replies
  for each row execute function public.set_updated_at();

-- May the caller use the inbox's saved replies at all? The admin and assistants (base role sales),
-- enabled logins only (auth_role() is null for a disabled one, migration 286).
create or replace function public.saved_replies_reader() returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() in ('admin', 'sales'), false)
$$;

-- May the caller write the SHARED list? The system admin always (it holds every grantable key), else a
-- reader whose role (profiles.role_id, or the system role of its base role) grants saved_replies.manage.
create or replace function public.saved_replies_manager() returns boolean
  language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.saved_replies_reader() and exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id or (p.role_id is null and r.is_system and r.key = p.role::text)
    join public.role_permissions rp on rp.role_id = r.id and rp.permission = 'saved_replies.manage'
    where p.id = (select auth.uid())
  ))
$$;
revoke execute on function public.saved_replies_reader(), public.saved_replies_manager() from public, anon;
grant execute on function public.saved_replies_reader(), public.saved_replies_manager() to authenticated, service_role;

alter table public.saved_replies enable row level security;

drop policy if exists saved_replies_read on public.saved_replies;
create policy saved_replies_read on public.saved_replies for select to authenticated
  using (
    (owner_profile_id is null and (select public.saved_replies_reader()))
    or owner_profile_id = (select auth.uid())
  );

drop policy if exists saved_replies_insert on public.saved_replies;
create policy saved_replies_insert on public.saved_replies for insert to authenticated
  with check (
    (owner_profile_id is null and (select public.saved_replies_manager()))
    or (owner_profile_id = (select auth.uid()) and (select public.saved_replies_reader()))
  );

drop policy if exists saved_replies_update on public.saved_replies;
create policy saved_replies_update on public.saved_replies for update to authenticated
  using (
    (owner_profile_id is null and (select public.saved_replies_manager()))
    or owner_profile_id = (select auth.uid())
  )
  with check (
    (owner_profile_id is null and (select public.saved_replies_manager()))
    or (owner_profile_id = (select auth.uid()) and (select public.saved_replies_reader()))
  );

drop policy if exists saved_replies_delete on public.saved_replies;
create policy saved_replies_delete on public.saved_replies for delete to authenticated
  using (
    (owner_profile_id is null and (select public.saved_replies_manager()))
    or owner_profile_id = (select auth.uid())
  );

revoke all on public.saved_replies from anon;
revoke truncate on public.saved_replies from authenticated;
grant select, insert, update, delete on public.saved_replies to authenticated;
grant all on public.saved_replies to service_role;

-- MANUAL ROLLBACK (only after the code rollback; delete the wa-media saved/ objects first):
--   drop table public.saved_replies;
--   drop function public.saved_replies_manager(); drop function public.saved_replies_reader();
