-- Google sync outbox producers (docs/24 §2.2, §3). Only PLATFORM-ORIGIN lessons are mirrored: the
-- 2026-10-02 import recorded every row it created in public.import_items, and a lesson is
-- platform-origin iff its id is NOT an imported `lessons` target AND its rule (when set) is NOT an
-- imported `schedule_rules` target — later occurrences of an imported rule belong to a sheet booking
-- the old script already mirrors. Only reports submitted in the platform are exported.
--
-- Producers are triggers, so every path that books, moves, cancels or re-renders queues its items:
-- one row per (kind, subject), re-queued (never duplicated) on each change (rule 8). Nothing is
-- queued while settings.google_sync_enabled is false. The worker claims due rows with a token.
-- Idempotent: safe to run twice.

set local lock_timeout = '5s';

create or replace view public.v_platform_origin_lessons with (security_invoker = true) as
  select l.id, l.rule_id, l.teacher_id, l.starts_at, l.ends_at, l.status
  from public.lessons l
  where not exists (select 1 from public.import_items i where i.target_table = 'lessons' and i.target_id = l.id)
    and not exists (select 1 from public.import_items i where i.target_table = 'schedule_rules' and i.target_id = l.rule_id);

revoke all on public.v_platform_origin_lessons from anon;
revoke insert, update, delete, truncate, references, trigger on public.v_platform_origin_lessons from authenticated;

comment on view public.v_platform_origin_lessons is
  'Lessons that originated in the platform (docs/24 §2.2): not imported, and not generated from an imported rule.';

create or replace function public.is_platform_origin_lesson(p_lesson_id uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.v_platform_origin_lessons v where v.id = p_lesson_id);
$$;

create or replace function public.is_platform_report(p_report_id uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lesson_reports r where r.id = p_report_id)
    and not exists (select 1 from public.import_items i where i.target_table = 'lesson_reports' and i.target_id = p_report_id);
$$;

create or replace function public.google_sync_on() returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce((select s.value = 'true'::jsonb from public.settings s where s.key = 'google_sync_enabled'), false);
$$;

-- settings.google_calendar_window_days (7..180, default 60).
create or replace function public.google_sync_window_days() returns int
  language sql stable security definer set search_path = '' as $$
  select coalesce((select least(greatest((s.value #>> '{}')::int, 7), 180) from public.settings s
                   where s.key = 'google_calendar_window_days' and jsonb_typeof(s.value) = 'number'), 60);
$$;

-- Queue (kind, subject) rows. p_changed = the subject itself changed: re-queue even a `gone` row
-- (its google_id dropped, so a new object is made). Otherwise (the daily reconcile) a gone row
-- stays gone and only synced / failed / skipped rows are re-queued; the worker's content hash
-- turns an unchanged one into a no-op. A pending row is left alone. Returns the rows queued.
create or replace function public.google_sync_queue(p_items jsonb, p_changed boolean) returns int
  language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  -- Held by a worker right now: never reset under it (its finish records the Google id), mark it dirty.
  if p_changed then
    update public.google_sync_items g set dirty = true
    from jsonb_array_elements(p_items) x
    where g.kind = (x->>'kind')::public.google_sync_kind and g.subject_id = (x->>'subject_id')::uuid
      and g.state = 'pending' and g.claim_token is not null;
  end if;
  insert into public.google_sync_items as g (kind, subject_id, lesson_id, report_id, student_id)
  select (x->>'kind')::public.google_sync_kind, (x->>'subject_id')::uuid, (x->>'lesson_id')::uuid,
         (x->>'report_id')::uuid, (x->>'student_id')::uuid
  from jsonb_array_elements(p_items) x
  on conflict (kind, subject_id) do update set
    state = 'pending', attempts = 0, next_attempt_at = now(), last_error = null, skip_reason = null,
    claimed_at = null, claim_token = null, planned = null,
    lesson_id = coalesce(excluded.lesson_id, g.lesson_id), report_id = coalesce(excluded.report_id, g.report_id),
    google_id = case when g.state = 'gone' then null else g.google_id end,
    content_hash = case when p_changed then null else g.content_hash end
  where g.state <> 'pending' and (p_changed or g.state <> 'gone');
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A platform-origin lesson inside the window — or one that already has an event (moved out of the
-- window, its old event must still go): its teacher-calendar event and its main-calendar copy.
create or replace function public.google_sync_enqueue_lesson(p_lesson_id uuid, p_changed boolean) returns int
  language sql security definer set search_path = '' as $$
  select coalesce(public.google_sync_queue(jsonb_agg(jsonb_build_object('kind', k.kind, 'subject_id', l.id, 'lesson_id', l.id)), p_changed), 0)
  from public.v_platform_origin_lessons l
  cross join (values ('teacher_event'), ('main_event')) k (kind)
  where l.id = p_lesson_id
    and ((l.starts_at >= now() - interval '7 days' and l.starts_at < now() + make_interval(days => public.google_sync_window_days()))
      or exists (select 1 from public.google_sync_items i where i.lesson_id = l.id and i.google_id is not null));
$$;

-- A platform report whose PDF is ready: the PDF, its attendance row, the student's summary row.
create or replace function public.google_sync_enqueue_report(p_report_id uuid) returns int
  language sql security definer set search_path = '' as $$
  select coalesce(public.google_sync_queue(jsonb_agg(x.item), true), 0)
  from public.lesson_reports r
  cross join lateral (values
    (jsonb_build_object('kind', 'report_pdf', 'subject_id', r.id, 'report_id', r.id, 'lesson_id', r.lesson_id, 'student_id', r.student_id)),
    (jsonb_build_object('kind', 'attendance_row', 'subject_id', r.id, 'report_id', r.id, 'lesson_id', r.lesson_id, 'student_id', r.student_id)),
    (jsonb_build_object('kind', 'summary_row', 'subject_id', r.student_id, 'report_id', r.id, 'student_id', r.student_id))
  ) x (item)
  where r.id = p_report_id and r.status = 'submitted' and r.pdf_status = 'ready' and public.is_platform_report(r.id);
$$;

-- The daily reconcile (05:00 Riyadh) and «زامن الآن»: every platform-origin lesson in the window.
create or replace function public.google_sync_reconcile() returns int
  language plpgsql security definer set search_path = '' as $$
declare n int := 0; l record;
begin
  if not public.google_sync_on() then return 0; end if;
  for l in select v.id from public.v_platform_origin_lessons v
           where v.starts_at >= now() - interval '1 day'
             and v.starts_at < now() + make_interval(days => public.google_sync_window_days()) loop
    n := n + public.google_sync_enqueue_lesson(l.id, false);
  end loop;
  return n;
end;
$$;

create or replace function public.google_sync_lessons_trg() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if public.google_sync_on() then perform public.google_sync_enqueue_lesson(new.id, true); end if;
  return null;
end;
$$;

create or replace function public.google_sync_reports_trg() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if public.google_sync_on() then perform public.google_sync_enqueue_report(new.id); end if;
  return null;
end;
$$;

drop trigger if exists lessons_google_sync_insert on public.lessons;
create trigger lessons_google_sync_insert after insert on public.lessons
  for each row execute function public.google_sync_lessons_trg();
drop trigger if exists lessons_google_sync_update on public.lessons;
create trigger lessons_google_sync_update after update of starts_at, ends_at, status, teacher_id, meeting_link on public.lessons
  for each row when (old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at
    or old.status is distinct from new.status or old.teacher_id is distinct from new.teacher_id
    or old.meeting_link is distinct from new.meeting_link)
  execute function public.google_sync_lessons_trg();
drop trigger if exists lesson_reports_google_sync on public.lesson_reports;
create trigger lesson_reports_google_sync after update of pdf_status on public.lesson_reports
  for each row when (new.pdf_status = 'ready' and old.pdf_status is distinct from new.pdf_status)
  execute function public.google_sync_reports_trg();

-- The worker's claim: due pending rows, oldest first (a report's PDF before its rows), with a token.
create or replace function public.google_sync_claim(p_limit int, p_stale_before timestamptz) returns setof public.google_sync_items
  language sql security definer set search_path = '' as $$
  update public.google_sync_items g set claimed_at = now(), claim_token = gen_random_uuid(), dirty = false
  where g.id in (select c.id from public.google_sync_items c
                 where c.state = 'pending' and c.next_attempt_at <= now()
                   and (c.claimed_at is null or c.claimed_at < p_stale_before)
                 order by c.next_attempt_at, c.kind, c.created_at
                 limit least(greatest(p_limit, 1), 100)
                 for update skip locked)
  returning g.*;
$$;

-- Re-queue the rows skipped for one reason (a mapping confirmed, dry_run → live). Returns the count.
create or replace function public.google_sync_requeue(p_reason text) returns int
  language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.google_sync_items set state = 'pending', attempts = 0, next_attempt_at = now(),
    skip_reason = null, claimed_at = null, claim_token = null, planned = null, dirty = false
  where state = 'skipped' and skip_reason = p_reason;
  get diagnostics n = row_count;
  return n;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'is_platform_origin_lesson(uuid)', 'is_platform_report(uuid)', 'google_sync_on()', 'google_sync_window_days()',
    'google_sync_queue(jsonb, boolean)', 'google_sync_enqueue_lesson(uuid, boolean)', 'google_sync_enqueue_report(uuid)',
    'google_sync_reconcile()', 'google_sync_lessons_trg()', 'google_sync_reports_trg()',
    'google_sync_claim(int, timestamptz)', 'google_sync_requeue(text)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- MANUAL ROLLBACK (only after the code rollback):
--   drop trigger lessons_google_sync_insert on public.lessons; drop trigger lessons_google_sync_update on public.lessons;
--   drop trigger lesson_reports_google_sync on public.lesson_reports;
--   drop function public.google_sync_claim(int, timestamptz), public.google_sync_requeue(text), public.google_sync_reconcile(),
--     public.google_sync_enqueue_report(uuid), public.google_sync_enqueue_lesson(uuid, boolean), public.google_sync_queue(jsonb, boolean),
--     public.google_sync_lessons_trg(), public.google_sync_reports_trg(), public.google_sync_window_days(), public.google_sync_on(),
--     public.is_platform_report(uuid), public.is_platform_origin_lesson(uuid);
--   drop view public.v_platform_origin_lessons;
