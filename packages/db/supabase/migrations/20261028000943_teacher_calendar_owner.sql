-- Per-teacher calendar handover (docs/24 «نقل تقويم معلم إلى المنصة», owner GO 2026-10-28). Who builds
-- a teacher's Google Calendar: 'script' (the old Apps Script, from the bookings sheet; the default, so
-- nothing changes on deploy) or 'platform'. A lesson is CALENDAR-MANAGED when it is platform-origin
-- (v_platform_origin_lessons, unchanged) OR its teacher's calendar_owner is 'platform' — then the
-- platform writes the events of that teacher's imported lessons too. The platform still never edits or
-- deletes an event the script made (docs/24 answer 1): the script removes its own events itself.
-- Expand-only: new columns, a new view, new functions; the two producers are replaced in place.
-- Writes: admins only (teachers_admin RLS + the guard below; the API is admin-only too); audited.

set local lock_timeout = '5s';

alter table public.teachers add column if not exists calendar_owner text not null default 'script';
alter table public.teachers add column if not exists calendar_owner_changed_at timestamptz null;
alter table public.teachers add column if not exists calendar_owner_changed_by uuid null references auth.users (id) on delete set null;

alter table public.teachers drop constraint if exists teachers_calendar_owner_check;
alter table public.teachers add constraint teachers_calendar_owner_check check (calendar_owner in ('script', 'platform'));

comment on column public.teachers.calendar_owner is
  'Who builds this teacher''s Google Calendar (docs/24): ''script'' = the old Apps Script from the bookings sheet '
  '(default); ''platform'' = the platform writes every lesson of this teacher, imported ones included.';

-- A new skip reason: an imported lesson's slot already holds the script's event (the duplicate guard).
alter table public.google_sync_items drop constraint if exists google_sync_items_skip_reason_check;
alter table public.google_sync_items add constraint google_sync_items_skip_reason_check check (skip_reason in (
  'dry_run', 'teacher_unmapped', 'student_unmapped', 'drive_unconfirmed', 'already_in_sheet', 'not_platform_origin', 'script_event_present'));

-- Only an admin (or the service role) changes the owner; the change is stamped and audited.
create or replace function public.teachers_calendar_owner_guard() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.calendar_owner is not distinct from old.calendar_owner then return new; end if;
  if (select auth.role()) = 'authenticated' and not public.is_admin() then
    raise exception 'calendar_owner_admin_only' using errcode = '42501';
  end if;
  new.calendar_owner_changed_at := now();
  -- A signed-in admin is the actor; the API (service role) passes its admin in calendar_owner_changed_by.
  if (select auth.uid()) is not null then new.calendar_owner_changed_by := (select auth.uid()); end if;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (new.calendar_owner_changed_by, 'teachers', new.id, 'calendar_owner',
          jsonb_build_object('calendar_owner', old.calendar_owner), jsonb_build_object('calendar_owner', new.calendar_owner));
  return new;
end;
$$;

drop trigger if exists teachers_calendar_owner_guard on public.teachers;
create trigger teachers_calendar_owner_guard before update of calendar_owner on public.teachers
  for each row execute function public.teachers_calendar_owner_guard();

-- Calendar-managed lessons; platform_origin says which ones the platform made (the duplicate guard
-- looks for a script event only before writing an imported one).
create or replace view public.v_calendar_managed_lessons with (security_invoker = true) as
  select l.id, l.rule_id, l.teacher_id, l.starts_at, l.ends_at, l.status,
         exists (select 1 from public.v_platform_origin_lessons v where v.id = l.id) as platform_origin
  from public.lessons l
  where exists (select 1 from public.v_platform_origin_lessons v where v.id = l.id)
     or exists (select 1 from public.teachers t where t.id = l.teacher_id and t.calendar_owner = 'platform');

revoke all on public.v_calendar_managed_lessons from anon;
revoke insert, update, delete, truncate, references, trigger on public.v_calendar_managed_lessons from authenticated;

comment on view public.v_calendar_managed_lessons is
  'Lessons whose calendar events the platform writes (docs/24): platform-origin, or taught by a teacher whose calendar_owner is platform.';

-- A calendar-managed lesson inside the window — or any lesson that already has one of our events
-- (moved out of the window, moved to a script-owned teacher, its teacher switched back to the
-- script: our own event must still go): its teacher-calendar event and its main-calendar copy.
create or replace function public.google_sync_enqueue_lesson(p_lesson_id uuid, p_changed boolean) returns int
  language sql security definer set search_path = '' as $$
  select coalesce(public.google_sync_queue(jsonb_agg(jsonb_build_object('kind', k.kind, 'subject_id', l.id, 'lesson_id', l.id)), p_changed), 0)
  from public.lessons l
  cross join (values ('teacher_event'), ('main_event')) k (kind)
  where l.id = p_lesson_id
    and ((exists (select 1 from public.v_calendar_managed_lessons m where m.id = l.id)
          and l.starts_at >= now() - interval '7 days' and l.starts_at < now() + make_interval(days => public.google_sync_window_days()))
      or exists (select 1 from public.google_sync_items i
                 where i.lesson_id = l.id and i.kind in ('teacher_event', 'main_event') and i.google_id is not null));
$$;

-- The daily reconcile and «زامن الآن»: every calendar-managed lesson in the window (a lesson skipped
-- for 'script_event_present' is tried again here, so it heals once the script stopped), plus any lesson
-- no longer managed that still has one of our events (a teacher switched back while sync was off).
create or replace function public.google_sync_reconcile() returns int
  language plpgsql security definer set search_path = '' as $$
declare n int := 0; l record;
begin
  if not public.google_sync_on() then return 0; end if;
  for l in select v.id from public.v_calendar_managed_lessons v
           where v.starts_at >= now() - interval '1 day'
             and v.starts_at < now() + make_interval(days => public.google_sync_window_days())
           union
           select distinct i.lesson_id from public.google_sync_items i
           where i.lesson_id is not null and i.google_id is not null and i.kind in ('teacher_event', 'main_event')
             and not exists (select 1 from public.v_calendar_managed_lessons m where m.id = i.lesson_id) loop
    n := n + public.google_sync_enqueue_lesson(l.id, false);
  end loop;
  return n;
end;
$$;

-- A teacher's owner changed: their open lessons ahead (to write or to drop) and every lesson of theirs
-- that has one of our events (to drop when no longer managed). p_changed = false: an event someone
-- deleted in Google stays gone; an unchanged one is a content-hash no-op. A row a worker holds is
-- marked dirty so it runs again with the new owner.
create or replace function public.google_sync_enqueue_teacher(p_teacher_id uuid) returns int
  language plpgsql security definer set search_path = '' as $$
declare n int := 0; l record;
begin
  if not public.google_sync_on() then return 0; end if;
  update public.google_sync_items g set dirty = true
  from public.lessons x
  where g.lesson_id = x.id and x.teacher_id = p_teacher_id and g.kind in ('teacher_event', 'main_event')
    and g.state = 'pending' and g.claim_token is not null;
  for l in select x.id from public.lessons x
           where x.teacher_id = p_teacher_id
             and ((x.starts_at >= now() and x.status not in ('cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'))
               or exists (select 1 from public.google_sync_items i
                          where i.lesson_id = x.id and i.kind in ('teacher_event', 'main_event') and i.google_id is not null)) loop
    n := n + public.google_sync_enqueue_lesson(l.id, false);
  end loop;
  return n;
end;
$$;

create or replace function public.google_sync_teachers_trg() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.google_sync_enqueue_teacher(new.id);
  return null;
end;
$$;

drop trigger if exists teachers_google_sync_owner on public.teachers;
create trigger teachers_google_sync_owner after update of calendar_owner on public.teachers
  for each row when (old.calendar_owner is distinct from new.calendar_owner)
  execute function public.google_sync_teachers_trg();

-- The admin teacher page's status line: this teacher's calendar events the platform wrote, and the
-- lessons the duplicate guard held back because the script's event is still there.
create or replace function public.google_teacher_calendar_counts(p_teacher_id uuid)
  returns table (managed int, script_event_present int)
  language sql stable security definer set search_path = '' as $$
  -- Held back: only lessons still ahead (the reconcile's window) of a teacher still handed over.
  select (count(*) filter (where g.state = 'synced' and g.google_id is not null))::int,
         (count(*) filter (where g.state = 'skipped' and g.skip_reason = 'script_event_present'
                             and l.starts_at >= now() - interval '1 day' and t.calendar_owner = 'platform'))::int
  from public.google_sync_items g
  join public.lessons l on l.id = g.lesson_id
  join public.teachers t on t.id = l.teacher_id
  where g.kind = 'teacher_event' and l.teacher_id = p_teacher_id;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'teachers_calendar_owner_guard()', 'google_sync_enqueue_lesson(uuid, boolean)', 'google_sync_reconcile()',
    'google_sync_enqueue_teacher(uuid)', 'google_sync_teachers_trg()', 'google_teacher_calendar_counts(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- MANUAL ROLLBACK (only after the code rollback; every teacher back to the script first):
--   drop trigger teachers_google_sync_owner on public.teachers; drop trigger teachers_calendar_owner_guard on public.teachers;
--   re-run google_sync_enqueue_lesson / google_sync_reconcile from 20261022000611_google_sync_outbox.sql;
--   drop function public.google_teacher_calendar_counts(uuid), public.google_sync_teachers_trg(), public.google_sync_enqueue_teacher(uuid),
--     public.teachers_calendar_owner_guard();
--   drop view public.v_calendar_managed_lessons;
--   alter table public.teachers drop column calendar_owner_changed_by, drop column calendar_owner_changed_at, drop column calendar_owner;
