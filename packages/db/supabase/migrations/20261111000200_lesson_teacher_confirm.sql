-- docs/46 C4 (owner D1, 2026-11-11): the teacher's «سأحضر» = "I will attend". Stored apart from the
-- family / admin confirmation: it NEVER changes lessons.status and works whether
-- lesson_confirmation_required is on or off. The API (service role) is the only writer; RLS on
-- lessons is unchanged (client roles have no DML on lessons, migration 110).

alter table public.lessons
  add column if not exists teacher_confirmed_at timestamptz,
  add column if not exists teacher_confirmed_by uuid references auth.users (id) on delete set null;

comment on column public.lessons.teacher_confirmed_at is
  'docs/46 D1: the teacher said she will attend; cleared when the lesson moves. Not a status.';

-- One atomic write: the lesson must be hers (p_teacher), open and not started yet; already
-- confirmed = unchanged (idempotent). Returns the outcome so the API maps 403 / 409 itself:
-- 'ok' | 'not_found' | 'not_owner' | 'closed' | 'started'. Audited in the same transaction.
create or replace function public.teacher_confirm_lesson(p_lesson uuid, p_teacher uuid, p_actor uuid)
  returns text language plpgsql set search_path = '' as $$
declare
  v public.lessons%rowtype;
begin
  select * into v from public.lessons where id = p_lesson for update;
  if not found then return 'not_found'; end if;
  if v.teacher_id <> p_teacher then return 'not_owner'; end if;
  if v.status not in ('scheduled', 'confirmed') then return 'closed'; end if;
  if v.starts_at <= now() then return 'started'; end if;
  if v.teacher_confirmed_at is not null then return 'ok'; end if;
  update public.lessons
     set teacher_confirmed_at = now(), teacher_confirmed_by = p_actor
   where id = p_lesson;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, 'lessons', p_lesson, 'teacher_confirm',
          jsonb_build_object('status', v.status),
          jsonb_build_object('status', v.status, 'teacher_confirmed', true));
  return 'ok';
end $$;

revoke execute on function public.teacher_confirm_lesson(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.teacher_confirm_lesson(uuid, uuid, uuid) to service_role;

-- The time-edit function (latest: 20261001000175), unchanged except: a lesson that MOVES clears
-- the teacher's «سأحضر» exactly as it clears the family's confirmed_at (she confirmed the old time).

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
         confirmed_by = case when v_moved and l.status = 'confirmed' then null else l.confirmed_by end,
         teacher_confirmed_at = case when v_moved then null else l.teacher_confirmed_at end,
         teacher_confirmed_by = case when v_moved then null else l.teacher_confirmed_by end
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
     where lesson_id = v_id and status = 'submitted' and pdf_status in ('ready', 'failed', 'rendering');
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
