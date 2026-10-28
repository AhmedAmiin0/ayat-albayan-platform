-- The course pause RPCs (migration 950, docs/11 §7b). Each call is one transaction; the API (service role only)
-- calls them, then tops the resumed rules up and recomputes the package and the student (MoneyWrites).
-- Never a message: nothing is queued here (the assistant tells the family in the chat); the reminders already
-- queued for the lessons a pause takes the student out of are deleted, never sent.
--
-- course_pause_window(pause): the student's open lessons (scheduled / confirmed, not started) inside the pause's
--   Riyadh window [from_date, until_date] (open-ended: every future one) leave the course: alone on it →
--   cancelled_by_admin «إيقاف مؤقت», not chargeable (cancelled_by_admin is never counted from a package nor
--   paid to the teacher); a group lesson → only the student's lesson_students row is removed. Still-queued
--   outbound messages of those lessons to the student's guardian (reminders) are deleted.
-- course_pause_restore(pause, cutoff): undoes that for lessons starting at or after cutoff (and in the future):
--   a cancelled one back to scheduled with its chargeable flag; the student back into the group lessons it left
--   and the shared rules' lessons generated without it meanwhile.
-- course_pause_start(p): 409 codes date_in_past (from before Riyadh today), invalid_range, already_paused,
--   student_not_found. Records the rules (solo / shared), applies the window, audits, and begins it when from is
--   Riyadh today. A later from waits: its rules stay active (generation skips the student by day, migration 952)
--   and the package and the student keep their statuses until course_pause_begin runs on the from day (hourly job).
-- course_pause_begin(p): idempotent (started_at). Pauses the solo rules still active, the newest live package and
--   the student, records the before-statuses, applies the window again (lessons generated since), audits.
-- course_pause_set_until(p): extend or shorten an open pause (until ≥ Riyadh today and ≥ from, or null).
-- course_pause_resume(p): idempotent (an already resumed pause answers resumed false and changes nothing).
--   Resume day = least(p.on or Riyadh today, until + 1); days = greatest(0, resume day − from) Riyadh days, moved
--   ONCE onto the package's renews_on and the solo rules' ends_on (when set, rules started by then); rules active, the package
--   to 'unpaid' (the neutral start the API recomputes; a trial stays trial), the student to its before-status.
-- set_until and resume lock the pause, then its rules (generate_rule_lessons locks a rule, never a pause).
-- Rollback: drop the seven functions.
set local lock_timeout = '5s';

create or replace function public.course_pause_audit(p_actor uuid, p_entity text, p_id uuid, p_action text, p_data jsonb)
  returns void language sql set search_path = '' as $$
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, p_entity, p_id, p_action, p_data -> 'before', p_data -> 'after');
$$;

create or replace function public.course_pause_window(p_pause uuid) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  cp public.course_pauses;
  v_cancel uuid[];
  v_leave uuid[];
begin
  select * into cp from public.course_pauses where id = p_pause;
  with target as (
    select l.id, ls.chargeable, (select count(*) from public.lesson_students o where o.lesson_id = l.id) as n
    from public.lessons l
    join public.lesson_students ls on ls.lesson_id = l.id and ls.student_id = cp.student_id
    where l.status in ('scheduled', 'confirmed') and l.starts_at > now()
      and l.starts_at >= (cp.from_date::timestamp at time zone 'Asia/Riyadh')
      and (cp.until_date is null or l.starts_at < ((cp.until_date + 1)::timestamp at time zone 'Asia/Riyadh'))
  ), ins as (
    insert into public.course_pause_lessons (pause_id, lesson_id, kind, chargeable_before)
    select p_pause, t.id, case when t.n = 1 then 'cancelled' else 'left' end, t.chargeable from target t
    on conflict (pause_id, lesson_id) do update set kind = excluded.kind, chargeable_before = excluded.chargeable_before
    returning lesson_id, kind
  )
  select coalesce(array_agg(lesson_id) filter (where kind = 'cancelled'), '{}'),
         coalesce(array_agg(lesson_id) filter (where kind = 'left'), '{}')
    into v_cancel, v_leave from ins;
  update public.lessons l set status = 'cancelled_by_admin', cancel_reason = 'إيقاف مؤقت'
   where l.id = any(v_cancel) and l.status in ('scheduled', 'confirmed');
  update public.lesson_students set chargeable = false where lesson_id = any(v_cancel) and student_id = cp.student_id;
  delete from public.lesson_students where lesson_id = any(v_leave) and student_id = cp.student_id;
  delete from public.messages m
   where m.direction = 'outbound' and m.status = 'queued' and m.lesson_id = any(v_cancel || v_leave)
     and m.guardian_id = (select st.guardian_id from public.students st where st.id = cp.student_id);
  return jsonb_build_object('cancelled', to_jsonb(v_cancel), 'left', to_jsonb(v_leave));
end $$;

create or replace function public.course_pause_restore(p_pause uuid, p_cutoff timestamptz) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  cp public.course_pauses;
  v_back uuid[];
  v_joined uuid[];
begin
  select * into cp from public.course_pauses where id = p_pause;
  with back as (
    update public.lessons l set status = 'scheduled', cancel_reason = null
      from public.course_pause_lessons pl
     where pl.pause_id = p_pause and pl.kind = 'cancelled' and l.id = pl.lesson_id
       and l.status = 'cancelled_by_admin' and l.starts_at >= p_cutoff and l.starts_at > now()
    returning l.id
  ) select coalesce(array_agg(id), '{}') into v_back from back;
  update public.lesson_students ls set chargeable = pl.chargeable_before
    from public.course_pause_lessons pl
   where pl.pause_id = p_pause and pl.lesson_id = ls.lesson_id and ls.student_id = cp.student_id
     and ls.lesson_id = any(v_back);
  with joined as (
    insert into public.lesson_students (lesson_id, student_id, chargeable)
    select l.id, cp.student_id, coalesce(pl.chargeable_before, true)
    from public.lessons l
    left join public.course_pause_lessons pl on pl.pause_id = p_pause and pl.lesson_id = l.id and pl.kind = 'left'
    where l.status in ('scheduled', 'confirmed') and l.starts_at >= p_cutoff and l.starts_at > now()
      and (pl.lesson_id is not null or (l.rule_id = any(cp.shared_rule_ids) and exists (
        select 1 from public.schedule_rule_students rs where rs.rule_id = l.rule_id and rs.student_id = cp.student_id)))
    on conflict do nothing
    returning lesson_id
  ) select coalesce(array_agg(lesson_id), '{}') into v_joined from joined;
  delete from public.course_pause_lessons where pause_id = p_pause and lesson_id = any(v_back || v_joined);
  return jsonb_build_object('reopened', to_jsonb(v_back), 'rejoined', to_jsonb(v_joined));
end $$;

create or replace function public.course_pause_begin(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  cp public.course_pauses;
  st public.students;
  sub public.subscriptions;
  v_window jsonb;
begin
  select * into cp from public.course_pauses where id = (p ->> 'pause_id')::uuid for update;
  if cp.id is null then raise exception 'pause_not_found' using errcode = 'P0001'; end if;
  if cp.started_at is not null or cp.resumed_at is not null then
    return jsonb_build_object('id', cp.id, 'student_id', cp.student_id, 'started', false);
  end if;
  select * into st from public.students where id = cp.student_id for update;
  perform 1 from public.schedule_rules r where r.id = any(cp.rule_ids || cp.shared_rule_ids) order by r.id for update;
  select * into sub from public.subscriptions s where s.student_id = st.id and s.status <> 'cancelled'
   order by s.starts_on desc, s.created_at desc, s.id desc limit 1;
  update public.schedule_rules set status = 'paused' where id = any(cp.rule_ids) and status = 'active';
  update public.course_pauses set started_at = now(), subscription_id = sub.id, subscription_status_before = sub.status,
         student_status_before = st.status where id = cp.id;
  v_window := public.course_pause_window(cp.id);
  if sub.id is not null and sub.status <> 'paused' then
    update public.subscriptions set status = 'paused' where id = sub.id;
    perform public.course_pause_audit(v_actor, 'subscriptions', sub.id, 'update', jsonb_build_object(
      'before', jsonb_build_object('status', sub.status), 'after', jsonb_build_object('status', 'paused', 'via', 'course_pause')));
  end if;
  if st.status <> 'paused' then
    update public.students set status = 'paused' where id = st.id;
    perform public.course_pause_audit(v_actor, 'students', st.id, 'status_change', jsonb_build_object(
      'before', jsonb_build_object('status', st.status), 'after', jsonb_build_object('status', 'paused', 'via', 'course_pause')));
  end if;
  perform public.course_pause_audit(v_actor, 'course_pauses', cp.id, 'begin', jsonb_build_object('after', v_window));
  return jsonb_build_object('id', cp.id, 'student_id', cp.student_id, 'started', true) || v_window;
end $$;

create or replace function public.course_pause_start(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  v_from date := (p ->> 'from_date')::date;
  v_until date := (p ->> 'until_date')::date;
  st public.students;
  v_rules uuid[];
  v_shared uuid[];
  v_id uuid;
  v_window jsonb;
  v_begin jsonb := '{}';
begin
  select * into st from public.students where id = (p ->> 'student_id')::uuid for update;
  if st.id is null then raise exception 'student_not_found' using errcode = 'P0001'; end if;
  if v_from < (now() at time zone 'Asia/Riyadh')::date then raise exception 'date_in_past' using errcode = 'P0001'; end if;
  if v_until < v_from then raise exception 'invalid_range' using errcode = 'P0001'; end if;
  if exists (select 1 from public.course_pauses c where c.student_id = st.id and c.resumed_at is null) then
    raise exception 'already_paused' using errcode = 'P0001';
  end if;
  -- Rule row locks serialise with generate_rule_lessons (it locks the rule first).
  perform 1 from public.schedule_rules r
   where r.status = 'active' and r.id in (select rs.rule_id from public.schedule_rule_students rs where rs.student_id = st.id)
   order by r.id for update;
  with mine as (
    select r.id, (select count(*) from public.schedule_rule_students o where o.rule_id = r.id) as n
    from public.schedule_rules r
    join public.schedule_rule_students rs on rs.rule_id = r.id and rs.student_id = st.id
    where r.status = 'active' and (r.ends_on is null or r.ends_on >= v_from)
  ) select coalesce(array_agg(id) filter (where n = 1), '{}'), coalesce(array_agg(id) filter (where n > 1), '{}')
      into v_rules, v_shared from mine;
  insert into public.course_pauses (student_id, rule_ids, shared_rule_ids, from_date, until_date, reason,
                                    student_status_before, created_by)
  values (st.id, v_rules, v_shared, v_from, v_until, nullif(btrim(p ->> 'reason'), ''), st.status, v_actor)
  returning id into v_id;
  v_window := public.course_pause_window(v_id);
  perform public.course_pause_audit(v_actor, 'course_pauses', v_id, 'create', jsonb_build_object('after',
    jsonb_build_object('student_id', st.id, 'from', v_from, 'until', v_until, 'rule_ids', to_jsonb(v_rules),
                       'shared_rule_ids', to_jsonb(v_shared)) || v_window));
  if v_from <= (now() at time zone 'Asia/Riyadh')::date then
    v_begin := public.course_pause_begin(jsonb_build_object('pause_id', v_id, 'actor', v_actor));
  end if;
  return jsonb_build_object('id', v_id, 'student_id', st.id, 'started', coalesce((v_begin ->> 'started')::boolean, false),
    'cancelled', to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(v_window -> 'cancelled', '[]') || coalesce(v_begin -> 'cancelled', '[]')) x)),
    'left', to_jsonb(array(select distinct x from jsonb_array_elements_text(coalesce(v_window -> 'left', '[]') || coalesce(v_begin -> 'left', '[]')) x)));
end $$;

create or replace function public.course_pause_set_until(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  v_until date := (p ->> 'until_date')::date;
  cp public.course_pauses;
  v_restore jsonb := '{}';
  v_window jsonb;
begin
  select * into cp from public.course_pauses where id = (p ->> 'pause_id')::uuid for update;
  if cp.id is null or cp.resumed_at is not null then raise exception 'pause_not_open' using errcode = 'P0001'; end if;
  perform 1 from public.schedule_rules r where r.id = any(cp.rule_ids || cp.shared_rule_ids) order by r.id for update;
  if v_until < greatest(cp.from_date, (now() at time zone 'Asia/Riyadh')::date) then
    raise exception 'invalid_range' using errcode = 'P0001';
  end if;
  update public.course_pauses set until_date = v_until where id = cp.id;
  if v_until is not null then
    v_restore := public.course_pause_restore(cp.id, ((v_until + 1)::timestamp at time zone 'Asia/Riyadh'));
  end if;
  v_window := public.course_pause_window(cp.id);
  perform public.course_pause_audit(v_actor, 'course_pauses', cp.id, 'update', jsonb_build_object(
    'before', jsonb_build_object('until', cp.until_date),
    'after', jsonb_build_object('until', v_until) || v_window || v_restore));
  return jsonb_build_object('id', cp.id, 'student_id', cp.student_id) || v_window || v_restore;
end $$;

create or replace function public.course_pause_resume(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  cp public.course_pauses;
  v_on date;
  v_days int;
  v_restore jsonb;
  v_rules uuid[];
begin
  select * into cp from public.course_pauses where id = (p ->> 'pause_id')::uuid for update;
  if cp.id is null then raise exception 'pause_not_found' using errcode = 'P0001'; end if;
  if cp.resumed_at is not null then
    return jsonb_build_object('id', cp.id, 'student_id', cp.student_id, 'resumed', false, 'days', cp.extended_days);
  end if;
  perform 1 from public.schedule_rules r where r.id = any(cp.rule_ids || cp.shared_rule_ids) order by r.id for update;
  v_on := least(coalesce((p ->> 'on')::date, (now() at time zone 'Asia/Riyadh')::date), cp.until_date + 1);
  v_days := greatest(0, v_on - cp.from_date);
  v_restore := public.course_pause_restore(cp.id, (v_on::timestamp at time zone 'Asia/Riyadh'));
  with back as (
    update public.schedule_rules r set status = 'active',
           ends_on = case when r.starts_on <= v_on then r.ends_on + v_days else r.ends_on end
     where r.id = any(cp.rule_ids) and r.status in ('paused', 'active')
    returning r.id
  ) select coalesce(array_agg(id), '{}') into v_rules from back;
  update public.subscriptions s
     set renews_on = s.renews_on + v_days,
         status = case when s.status <> 'paused' then s.status
                       when cp.subscription_status_before = 'trial' then 'trial' else 'unpaid' end
   where s.id = cp.subscription_id and s.status <> 'cancelled';
  update public.students set status = cp.student_status_before where id = cp.student_id and status = 'paused';
  update public.course_pauses set resumed_at = now(), resumed_by = v_actor, extended_days = v_days where id = cp.id;
  perform public.course_pause_audit(v_actor, 'course_pauses', cp.id, 'resume', jsonb_build_object('after',
    jsonb_build_object('on', v_on, 'days', v_days, 'rule_ids', to_jsonb(v_rules)) || v_restore));
  if cp.student_status_before <> 'paused' then
    perform public.course_pause_audit(v_actor, 'students', cp.student_id, 'status_change', jsonb_build_object(
      'before', jsonb_build_object('status', 'paused'),
      'after', jsonb_build_object('status', cp.student_status_before, 'via', 'course_resume')));
  end if;
  return jsonb_build_object('id', cp.id, 'student_id', cp.student_id, 'resumed', true, 'on', v_on, 'days', v_days,
                            'rule_ids', to_jsonb(v_rules)) || v_restore;
end $$;

revoke execute on function public.course_pause_audit(uuid, text, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.course_pause_window(uuid) from public, anon, authenticated;
revoke execute on function public.course_pause_restore(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.course_pause_begin(jsonb) from public, anon, authenticated;
revoke execute on function public.course_pause_start(jsonb) from public, anon, authenticated;
revoke execute on function public.course_pause_set_until(jsonb) from public, anon, authenticated;
revoke execute on function public.course_pause_resume(jsonb) from public, anon, authenticated;
grant execute on function public.course_pause_begin(jsonb) to service_role;
grant execute on function public.course_pause_start(jsonb) to service_role;
grant execute on function public.course_pause_set_until(jsonb) to service_role;
grant execute on function public.course_pause_resume(jsonb) to service_role;
-- The helpers run inside the service-role calls above (they are not security definer).
grant execute on function public.course_pause_audit(uuid, text, uuid, text, jsonb) to service_role;
grant execute on function public.course_pause_window(uuid) to service_role;
grant execute on function public.course_pause_restore(uuid, timestamptz) to service_role;
