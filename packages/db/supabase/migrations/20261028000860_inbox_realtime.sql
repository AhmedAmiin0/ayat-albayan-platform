-- The inbox goes live over Supabase Realtime (owner 2026-10-27: «Go with your recommendation for
-- supabase»): Broadcast from the database on the PRIVATE topic 'inbox:staff' while the app is open,
-- the existing push when it is closed, a slow poll as the fallback (docs/12 §15).
--
-- A nudge, not a data path (as migration 740): the event carries the chat's phone ONLY, never a body,
-- name, direction, media or status. Clients re-read the same API routes (GET /threads, /threads/:phone)
-- sooner; the API keeps its scope and redactions. Broadcast, not postgres_changes on messages: that
-- would need a select grant on messages for authenticated and re-check RLS per subscriber per row.
--
-- 1. public.inbox_broadcast_changed(): STATEMENT-level, over the transition table, ONE realtime.send
--    per DISTINCT phone in the statement (a bulk import or a template batch does not flood), capped
--    at 200 phones (a larger batch is an import: the 60 s fallback poll covers it), sent through
--    public.inbox_live_send with public.inbox_live_payload. Wrapped in an exception block: a
--    broadcast never fails a webhook insert or a send (a warning instead).
-- 2. Triggers on public.messages: after insert (a received / sent row) and after update (a delivery
--    tick, a read mark: status and read_at, the staff unread state of v_threads). One transition-table
--    event per trigger. teacher_thread_reads (migration 164) is a teacher's own unread, and teachers
--    are not on this topic, so it gets no trigger.
-- 3. public.inbox_live_reader(): who may join — the base roles that open the staff inbox (admin,
--    sales) AND a held role carrying inbox.read (the API's ThreadsController guard; the system admin
--    holds every permission, as dbPermissionResolver), refused for a disabled profile (migration 286).
--    Both read every chat by phone (ThreadReads: SalesThreadsService filters messages, never phones),
--    so the policy is no broader than GET /threads. Teachers, families and assistants never join.
-- 4. The select policy on realtime.messages (no insert policy: clients never broadcast). The realtime
--    schema is created by the Realtime service, not by Postgres: on a stack without it (CI's e2e
--    stack) public.inbox_live_install() skips it with a notice and can be run again later.
-- Turning it off: drop the two triggers; the apps fall back to their old poll by themselves.
-- Idempotent.

-- The event's whole payload: the phone, nothing else.
create or replace function public.inbox_live_payload(p_phone text) returns jsonb
  language sql immutable set search_path = '' as $$
  select jsonb_build_object('phone', p_phone)
$$;
revoke all on function public.inbox_live_payload(text) from public, anon, authenticated;

-- One broadcast per phone. No Realtime schema (a stack without the service): nothing to send.
create or replace function public.inbox_live_send(p_phones text[]) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  v_phone text;
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then
    return;
  end if;
  foreach v_phone in array p_phones loop
    perform realtime.send(public.inbox_live_payload(v_phone), 'thread_changed', 'inbox:staff', true);
  end loop;
end $$;
revoke all on function public.inbox_live_send(text[]) from public, anon, authenticated;

create or replace function public.inbox_broadcast_changed() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_phones text[];
begin
  begin
    select array_agg(d.phone) into v_phones from (
      select distinct c.phone_e164::text as phone from changed c where c.phone_e164 is not null limit 200
    ) d;
    if v_phones is not null then
      perform public.inbox_live_send(v_phones);
    end if;
  exception when others then
    raise warning 'inbox_broadcast_changed: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end $$;
revoke all on function public.inbox_broadcast_changed() from public, anon, authenticated;

drop trigger if exists messages_inbox_live_insert on public.messages;
create trigger messages_inbox_live_insert after insert on public.messages
  referencing new table as changed
  for each statement execute function public.inbox_broadcast_changed();

drop trigger if exists messages_inbox_live_update on public.messages;
create trigger messages_inbox_live_update after update on public.messages
  referencing new table as changed
  for each statement execute function public.inbox_broadcast_changed();

create or replace function public.inbox_live_reader() returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce((
    select (r.is_system and r.key = 'admin')
      or exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission = 'inbox.read')
    from public.profiles p
    join public.roles r
      on (p.role_id is not null and r.id = p.role_id)
      or (p.role_id is null and r.is_system and r.base_role = p.role)
    where p.id = auth.uid() and p.disabled_at is null and p.role in ('admin', 'sales')
  ), false)
$$;
revoke all on function public.inbox_live_reader() from public, anon;
grant execute on function public.inbox_live_reader() to authenticated;

create or replace function public.inbox_live_install() returns boolean
  language plpgsql security definer set search_path = '' as $$
begin
  if to_regclass('realtime.messages') is null then
    raise notice 'inbox_live_install: no realtime.messages here (Realtime not running); run it again once it is';
    return false;
  end if;
  drop policy if exists inbox_staff_read on realtime.messages;
  create policy inbox_staff_read on realtime.messages for select to authenticated
    using (
      realtime.messages.extension = 'broadcast'
      and (select realtime.topic()) = 'inbox:staff'
      and (select public.inbox_live_reader())
    );
  return true;
end $$;
revoke all on function public.inbox_live_install() from public, anon, authenticated;

select public.inbox_live_install();

-- Down (manual):
--   drop policy if exists inbox_staff_read on realtime.messages;
--   drop trigger if exists messages_inbox_live_insert on public.messages;
--   drop trigger if exists messages_inbox_live_update on public.messages;
--   drop function if exists public.inbox_live_install();
--   drop function if exists public.inbox_live_reader();
--   drop function if exists public.inbox_broadcast_changed();
--   drop function if exists public.inbox_live_send(text[]);
--   drop function if exists public.inbox_live_payload(text);
