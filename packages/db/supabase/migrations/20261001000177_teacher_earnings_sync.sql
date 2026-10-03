-- Keeps teacher_session_earnings equal to the lessons (migration 176). One function decides:
--   counted  = status completed, or late / no_show when settings payout_count_late /
--              payout_count_no_show are true (the same rule as the monthly payout), the length is
--              30/45/60/90 and the teacher has a rate for it. Anything else is not counted.
--   counted, no earning yet       → insert (rate = the teacher's rate now, then frozen).
--   counted, not fully paid       → follow the lesson: teacher, start, length (a corrected length
--                                   re-prices with the rate for the new length; the same length
--                                   keeps the frozen rate); status recomputed from paid_amount.
--   counted, fully paid           → frozen: a correction after the money went out changes nothing.
--   not counted, nothing paid     → the earning is deleted.
--   not counted, partly paid      → amount is cut to what was paid (status paid): money out stays.
create function public.earning_status(p_paid numeric, p_amount numeric)
  returns public.teacher_earning_status language sql immutable set search_path = '' as $$
  select (case when p_paid >= p_amount then 'paid'
               when p_paid > 0 then 'partially_paid'
               else 'earned' end)::public.teacher_earning_status
$$;

create function public.sync_teacher_earning(p_lesson uuid) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  l record;
  e record;
  v_counts boolean;
  v_minutes int;
  v_rate numeric;
begin
  select id, teacher_id, status, starts_at, ends_at into l from public.lessons where id = p_lesson;
  if not found then
    return; -- deleted: its unpaid earning went with it (on delete cascade)
  end if;
  select * into e from public.teacher_session_earnings where lesson_id = p_lesson for update;

  v_counts := l.status = 'completed'
    or (l.status = 'late' and coalesce((select s.value = 'true'::jsonb from public.settings s
                                         where s.key = 'payout_count_late'), false))
    or (l.status = 'no_show' and coalesce((select s.value = 'true'::jsonb from public.settings s
                                            where s.key = 'payout_count_no_show'), false));
  v_minutes := round(extract(epoch from (l.ends_at - l.starts_at)) / 60)::int;
  if v_counts and v_minutes in (30, 45, 60, 90) then
    if e.id is not null and e.minutes = v_minutes and e.teacher_id = l.teacher_id then
      v_rate := e.rate;
    else
      select case v_minutes when 30 then t.rate_30 when 45 then t.rate_45
                            when 60 then t.rate_60 else t.rate_90 end
        into v_rate from public.teachers t where t.id = l.teacher_id;
    end if;
  end if;

  if v_rate is not null then
    if e.id is null then
      insert into public.teacher_session_earnings (lesson_id, teacher_id, starts_at, minutes, rate, amount)
      values (l.id, l.teacher_id, l.starts_at, v_minutes, v_rate, v_rate);
    elsif e.status <> 'paid' then
      update public.teacher_session_earnings
         set teacher_id = l.teacher_id, starts_at = l.starts_at, minutes = v_minutes,
             rate = v_rate, amount = v_rate, status = public.earning_status(e.paid_amount, v_rate)
       where id = e.id;
    end if;
  elsif e.id is not null then
    if e.paid_amount = 0 then
      delete from public.teacher_session_earnings where id = e.id;
    elsif e.status <> 'paid' then
      update public.teacher_session_earnings set amount = e.paid_amount, status = 'paid' where id = e.id;
    end if;
  end if;
end $$;

create function public.lessons_sync_earning() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.sync_teacher_earning(new.id);
  return null;
end $$;

create trigger lessons_sync_earning after insert or update of status, starts_at, ends_at, teacher_id
  on public.lessons for each row execute function public.lessons_sync_earning();

-- Re-runs the rule for a teacher (or everyone): after a rate is set, after the owner flips
-- payout_count_late / payout_count_no_show, and for the backfill (migration 179). Idempotent.
create function public.resync_teacher_earnings(p_teacher uuid default null) returns int
  language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select l.id from public.lessons l
    where (p_teacher is null or l.teacher_id = p_teacher)
      and (l.status in ('completed', 'late', 'no_show')
           or exists (select 1 from public.teacher_session_earnings e where e.lesson_id = l.id))
    order by l.starts_at
  loop
    perform public.sync_teacher_earning(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

create function public.teachers_resync_earnings() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.resync_teacher_earnings(new.id);
  return null;
end $$;

create trigger teachers_resync_earnings after update of rate_30, rate_45, rate_60, rate_90
  on public.teachers for each row execute function public.teachers_resync_earnings();

revoke execute on function public.sync_teacher_earning(uuid), public.lessons_sync_earning(),
  public.resync_teacher_earnings(uuid), public.teachers_resync_earnings()
  from public, anon, authenticated;
grant execute on function public.resync_teacher_earnings(uuid) to service_role;
