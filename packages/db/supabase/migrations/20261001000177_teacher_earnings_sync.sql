-- Per-session teacher earnings, part 2: the ledger follows the lesson.
-- sync_lesson_earning(lesson) is the ONLY writer of teacher_session_earnings. A trigger on
-- lessons runs it after any change of status / start / end / teacher, so every path (state
-- machine RPCs, report submit, «عدّل الوقت» edit_lesson_time, jobs) is covered with no API code.
--   paid statuses : completed, plus late / no_show when settings payout_count_late /
--                   payout_count_no_show are true (the same rule as the monthly payouts).
--   minutes       : round((ends_at - starts_at) in minutes); a length outside 30/45/60/90 or a
--                   teacher without that rate earns no row (as payouts: skipped, never rounded).
--   rate          : the teacher's rate when the row is created; kept while minutes and teacher
--                   are unchanged; a corrected length takes the CURRENT rate of the new length.
--   follows the lesson until fully paid: 'earned' rows are rewritten or deleted when the lesson
--                   stops being paid; 'partially_paid' rows follow minutes / amount (status is
--                   recomputed, so a shrink to ≤ what was paid becomes 'paid'); teacher and
--                   lesson-time are kept. 'paid' rows are frozen. A row with payments is never
--                   deleted (the money left): an admin fixes it by hand.
-- SQL tests: e2e/tests/teacher-earnings.sql.spec.ts (begin … rollback), mirrored in
-- packages/shared/src/money/earnings.plan.ts (unit-tested).

create function public.sync_lesson_earning(p_lesson uuid) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  l record;
  e record;
  v_paid_status boolean;
  v_min int;
  v_rate numeric;
  v_items numeric;
  v_amount numeric;
  v_status public.teacher_earning_status;
  v_has boolean;
begin
  select id, teacher_id, status, starts_at, ends_at into l from public.lessons where id = p_lesson;
  if not found then return; end if;

  select * into e from public.teacher_session_earnings where lesson_id = p_lesson for update;
  v_has := found;

  v_paid_status := l.status = 'completed'
    or (l.status = 'late' and exists (
          select 1 from public.settings s where s.key = 'payout_count_late' and s.value = 'true'::jsonb))
    or (l.status = 'no_show' and exists (
          select 1 from public.settings s where s.key = 'payout_count_no_show' and s.value = 'true'::jsonb));

  v_min := round(extract(epoch from (l.ends_at - l.starts_at)) / 60)::int;
  if v_min not in (30, 45, 60, 90) then v_min := null; end if;

  v_rate := case when v_min is null then null else
    (select case v_min when 30 then t.rate_30 when 45 then t.rate_45
                       when 60 then t.rate_60 else t.rate_90 end
       from public.teachers t where t.id = l.teacher_id) end;

  if not v_has then
    if v_paid_status and v_rate is not null then
      insert into public.teacher_session_earnings (lesson_id, teacher_id, starts_at, minutes, rate, amount)
      values (l.id, l.teacher_id, l.starts_at, v_min, v_rate, v_rate)
      on conflict (lesson_id) do nothing;
    end if;
    return;
  end if;

  if e.status = 'paid' then return; end if;
  select coalesce(sum(i.amount), 0) into v_items
    from public.teacher_payment_items i where i.earning_id = e.id;

  if not (v_paid_status and v_rate is not null) then
    if v_items = 0 then delete from public.teacher_session_earnings where id = e.id; end if;
    return;
  end if;

  -- Rate frozen while the length and the teacher stay; a corrected length re-prices.
  if v_min = e.minutes and l.teacher_id = e.teacher_id then v_rate := e.rate; end if;
  v_amount := v_rate;
  v_status := case when v_items >= v_amount and v_items > 0 then 'paid'
                   when v_items > 0 then 'partially_paid' else 'earned' end;
  update public.teacher_session_earnings
     set minutes = v_min, rate = v_rate, amount = v_amount, status = v_status,
         teacher_id = case when v_items = 0 then l.teacher_id else e.teacher_id end,
         starts_at = case when v_items = 0 then l.starts_at else e.starts_at end
   where id = e.id;
end $$;

create function public.lessons_sync_earning() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.sync_lesson_earning(new.id);
  return null;
end $$;

create trigger lessons_sync_earning after insert or update of status, starts_at, ends_at, teacher_id
  on public.lessons for each row execute function public.lessons_sync_earning();

revoke execute on function public.sync_lesson_earning(uuid), public.lessons_sync_earning() from public, anon, authenticated;
grant execute on function public.sync_lesson_earning(uuid) to service_role;

-- Backfill (idempotent: re-running changes nothing, the unique lesson_id and the sync rules hold).
select public.sync_lesson_earning(l.id)
  from public.lessons l
 where l.status in ('completed', 'late', 'no_show');
