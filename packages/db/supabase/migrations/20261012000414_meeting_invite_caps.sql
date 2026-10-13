-- Race-safe meeting invitation caps (R-MEET-02, review 2026-10-13). The API checks both limits
-- first (fast, friendly answers); these BEFORE INSERT triggers make them hold under concurrent
-- requests too. Each takes a transaction-scoped advisory lock on its key (the meeting, the login),
-- so two inserts for the same key count one after the other. The API maps both errors:
-- too_many_invitees → 400, invite_limit → 409 (the same codes as the fast checks). Re-runnable.

-- At most 30 invitees per meeting that are not cancelled.
create or replace function public.meeting_invitees_cap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('meeting_invitees:' || new.meeting_id::text, 0));
  if (
    select count(*) from public.meeting_invitees
    where meeting_id = new.meeting_id and status <> 'cancelled'
  ) >= 30 then
    raise exception 'too_many_invitees' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists meeting_invitees_cap on public.meeting_invitees;
create trigger meeting_invitees_cap
  before insert on public.meeting_invitees
  for each row execute function public.meeting_invitees_cap();

-- At most 100 WhatsApp meeting invitations (dedup_key 'meeting_invite:%', resends included) per
-- created_by per rolling day. A retried row (its dedup_key already queued) is not a new one: the
-- upsert ignores it, so it never trips the cap.
create or replace function public.meeting_invite_daily_cap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.created_by is null or new.dedup_key is null or new.dedup_key not like 'meeting_invite:%' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('meeting_invite_daily:' || new.created_by::text, 0));
  if exists (select 1 from public.messages where dedup_key = new.dedup_key) then
    return new;
  end if;
  if (
    select count(*) from public.messages
    where created_by = new.created_by
      and dedup_key like 'meeting_invite:%'
      and created_at >= now() - interval '1 day'
  ) >= 100 then
    raise exception 'invite_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists meeting_invite_daily_cap on public.messages;
create trigger meeting_invite_daily_cap
  before insert on public.messages
  for each row execute function public.meeting_invite_daily_cap();

revoke all on function public.meeting_invitees_cap() from public, anon, authenticated;
revoke all on function public.meeting_invite_daily_cap() from public, anon, authenticated;
