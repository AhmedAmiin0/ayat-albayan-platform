-- «عدّل الوقت» (R-SCH-11): edit ONE lesson's time in place (same row, report, payments).
--   * lessons.time_edited_at / time_edit_reason / time_edit_was {starts_at, ends_at}: what the
--     lesson showed before the last edit. The full trail is audit_log (entity lessons, time_edit).
--   * lessons.local_date is frozen at insert: a moved generated lesson keeps holding its original
--     slot, so the daily job never regenerates the old date (only generation / rule-projection /
--     the migration tool read it). ponytail: if an admin overrides onto another generated start of
--     the same rule, lessons_rule_starts_uidx raises 23505 (409 slot_taken) or drops that
--     occurrence later; the conflict check flags the overlap first.
--   * public.edit_lesson_time(p): one transaction, service_role only. Payload:
--     {actor, lesson_id, from:{status,starts_at,ends_at}, to:{starts_at,ends_at}, reason,
--      override_reason, retime_open, refresh_pdf, messages[], audit}.
-- SQL test plan (e2e/tests/edit-time.sql.spec.ts, begin … rollback):
--   1. a stale `from` raises stale_time (P0001).
--   2. after moving a generated lesson to another day, generate_rule_lessons for the old date
--      returns 0 rows.
--   3. retime_open: queued reminder rows expire, their dedup keys (and the push keys) are freed,
--      the new confirmation is queued and not expired.
--   4. a confirmed lesson moved to a new start becomes scheduled (confirmed_at cleared).
--   5. refresh_pdf: a ready report goes back to pending.
--   6. a pending proposal for exactly the new start is approved; another one stays pending.

alter table public.lessons
  add column time_edited_at timestamptz,
  add column time_edit_reason text,
  add column time_edit_was jsonb;

drop trigger lessons_local_date on public.lessons;
create trigger lessons_local_date before insert or update of rule_id on public.lessons
  for each row execute function public.lessons_set_local_date();

create or replace function public.edit_lesson_time(p jsonb) returns void
  language plpgsql set search_path = '' as $$
declare
  v_actor uuid := (p ->> 'actor')::uuid;
  v_id uuid := (p ->> 'lesson_id')::uuid;
  v_status public.lesson_status := (p #>> '{from,status}')::public.lesson_status;
  v_from_start timestamptz := (p #>> '{from,starts_at}')::timestamptz;
  v_from_end timestamptz := (p #>> '{from,ends_at}')::timestamptz;
  v_to_start timestamptz := (p #>> '{to,starts_at}')::timestamptz;
  v_to_end timestamptz := (p #>> '{to,ends_at}')::timestamptz;
  v_moved boolean := v_to_start <> v_from_start;
begin
  -- Compare-and-set: two admins (or a status change meanwhile) never overwrite each other.
  -- The guardian confirmed the OLD time, so a confirmed lesson that moves goes back to scheduled
  -- (a direct update: the state machine gets no new edge).
  update public.lessons l
     set starts_at = v_to_start,
         ends_at = v_to_end,
         time_edited_at = now(),
         time_edit_reason = nullif(p ->> 'reason', ''),
         time_edit_was = jsonb_build_object('starts_at', v_from_start, 'ends_at', v_from_end),
         conflicts = null,
         override_reason = coalesce(nullif(p ->> 'override_reason', ''), l.override_reason),
         status = case when v_moved and l.status = 'confirmed'
                       then 'scheduled'::public.lesson_status else l.status end,
         confirmed_at = case when v_moved and l.status = 'confirmed' then null else l.confirmed_at end,
         confirmed_by = case when v_moved and l.status = 'confirmed' then null else l.confirmed_by end
   where l.id = v_id and l.status = v_status and l.starts_at = v_from_start
     and l.ends_at = v_from_end;
  if not found then
    raise exception 'stale_time' using errcode = 'P0001';
  end if;

  -- An open lesson with a new start: nothing queued with the old time may still go out, and the
  -- reminder / needs-confirmation keys are freed so the jobs notify again for the new time.
  -- (A uuid suffix, not the time: A→B→A→B must not collide with an earlier freed key.)
  if coalesce((p ->> 'retime_open')::boolean, false) then
    update public.messages set expires_at = now()
     where lesson_id = v_id and status = 'queued'
       and dedup_key ~ '^(booking_confirmation|lesson_reminder|lesson_reminder_24h|teacher_lesson_reminder):';
    update public.messages set dedup_key = dedup_key || ':old:' || gen_random_uuid()::text
     where lesson_id = v_id
       and dedup_key ~ '^(booking_confirmation|lesson_reminder|lesson_reminder_24h|teacher_lesson_reminder):';
    update public.push_notifications set dedup_key = dedup_key || ':old:' || gen_random_uuid()::text
     where dedup_key like 'lesson_needs_confirmation:' || v_id::text || ':%';
  end if;

  -- A held lesson with a new start or length: the PDF is re-rendered by the 60 s job (its header
  -- reads the lesson live). report_ready stays deduped per report: the guardian is not re-sent it.
  if coalesce((p ->> 'refresh_pdf')::boolean, false) then
    update public.lesson_reports set pdf_status = 'pending', pdf_error = null
     where lesson_id = v_id and status = 'submitted' and pdf_status in ('ready', 'failed');
  end if;

  insert into public.messages (direction, phone_e164, guardian_id, lesson_id, template_key,
                               template_params, status, dedup_key, scheduled_for, created_by)
  select 'outbound', m.phone_e164, m.guardian_id, m.lesson_id, m.template_key,
         m.template_params, 'queued', m.dedup_key, now(), v_actor
  from jsonb_to_recordset(coalesce(p -> 'messages', '[]'::jsonb)) as m(
    phone_e164 text, guardian_id uuid, lesson_id uuid, template_key text,
    template_params jsonb, dedup_key text)
  on conflict (dedup_key) do nothing;

  -- The teacher already proposed exactly this start: the edit answers it.
  update public.lesson_proposals
     set status = 'approved', decided_by = v_actor, decided_at = now(), new_lesson_id = v_id
   where lesson_id = v_id and status = 'pending' and proposed_starts_at = v_to_start;

  if p ? 'audit' then
    insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    select v_actor, a.entity, a.entity_id, a.action, a.before, a.after
    from jsonb_to_record(p -> 'audit') as a(entity text, entity_id uuid, action text,
                                            before jsonb, after jsonb);
  end if;
end $$;

revoke execute on function public.edit_lesson_time(jsonb) from public, anon, authenticated;
grant execute on function public.edit_lesson_time(jsonb) to service_role;
