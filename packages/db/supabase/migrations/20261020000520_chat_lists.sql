-- Chat lists «القوائم» (owner 2026-10-20, docs/22): like WhatsApp Business lists, academy-wide names that
-- only ORGANISE chats. One shared set: any assistant (base role sales) or admin with inbox.lists creates,
-- renames and deletes lists and adds or removes chats; everyone sees the same lists. Teachers get none.
-- Nothing is ever sent because of a list.
--   chat_lists         a name (1–30 characters, trimmed); name_key = the name after the shared Arabic
--                      normalisation (normalizeArabic in packages/shared: tashkeel, hamza / taa marbuta /
--                      ya forms, case, spaces), unique, so «دفعة» and «دفعه» are one list. At most 30 lists.
--   chat_list_threads  a member = a chat keyed by its E.164 number (the merged inbox thread across both
--                      WhatsApp lines); a number with no message yet can be added. Deleting a list removes
--                      its memberships ONLY: never a chat, message, lead or family.
-- The API (service role) is the only writer; the admin may read both tables (RLS). Re-runnable.
create table if not exists public.chat_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30 and name = btrim(name)),
  name_key text not null unique check (char_length(name_key) >= 1),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists chat_lists_updated_at on public.chat_lists;
create trigger chat_lists_updated_at before update on public.chat_lists
  for each row execute function public.set_updated_at();

create table if not exists public.chat_list_threads (
  list_id uuid not null references public.chat_lists (id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (list_id, phone_e164)
);
-- «which lists is this chat in» (the thread header) reads by phone.
create index if not exists chat_list_threads_phone_idx on public.chat_list_threads (phone_e164);

-- GET /threads?list=: one list's chats as v_threads rows (a member with no message yet has no thread),
-- filtered in SQL, so a list of any size never travels as a phone list in the request. Service role only,
-- like v_threads.
create or replace view public.v_list_threads with (security_invoker = true) as
  select m.list_id, t.* from public.chat_list_threads m join public.v_threads t on t.phone_e164 = m.phone_e164;
revoke all on public.v_list_threads from anon, authenticated;
grant select on public.v_list_threads to service_role;

-- The 30-list cap, behind the API's own check (409 list_limit): serialised, so two creates at once
-- cannot both pass a count of 29.
create or replace function public.chat_lists_cap() returns trigger
  language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.chat_lists'));
  if (select count(*) from public.chat_lists) >= 30 then
    raise exception 'chat_lists: at most 30 lists' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists chat_lists_cap on public.chat_lists;
create trigger chat_lists_cap before insert on public.chat_lists
  for each row execute function public.chat_lists_cap();
revoke all on function public.chat_lists_cap() from public, anon, authenticated;

-- RLS: the admin reads; writes go through the API (service role) only.
alter table public.chat_lists enable row level security;
alter table public.chat_list_threads enable row level security;
drop policy if exists chat_lists_admin_read on public.chat_lists;
create policy chat_lists_admin_read on public.chat_lists for select to authenticated
  using (public.is_admin());
drop policy if exists chat_list_threads_admin_read on public.chat_list_threads;
create policy chat_list_threads_admin_read on public.chat_list_threads for select to authenticated
  using (public.is_admin());
revoke all on public.chat_lists, public.chat_list_threads from anon;
revoke insert, update, delete, truncate on public.chat_lists, public.chat_list_threads from authenticated;
