-- The family's side of the student chat follows settings.family_chat_enabled in the database too
-- (docs/50 §2: «all chat in app is turned off by default from the config»; docs/31 §2).
--
-- The API already answers 403 family_chat_off on every family route while the switch is off, but
-- RLS still let a guardian or student login read the channel directly (Realtime).
-- can_read_channel (latest body: 20261116000100_child_chat.sql) now gates its guardian and
-- student branches on the switch: jsonb true only; a missing row is off (the settings default).
-- The teacher, owning assistant and admin branches are unchanged. presence_can_watch reads
-- can_read_channel, so a family login also stops seeing the teacher's presence while it is off.
--
-- Idempotent (create or replace). Writes no row. Grants unchanged.
-- MANUAL ROLLBACK: re-create can_read_channel from 20261116000100_child_chat.sql.

create or replace function public.can_read_channel(p_channel uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_channels c
    where c.id = p_channel
      and (public.is_admin()
        or (public.auth_role() = 'sales' and c.student_id in (select public.my_sales_student_ids()))
        or (public.channel_is_open(c.student_id)
          and ((public.auth_role() = 'teacher'
                and public.my_teacher_id() in (select public.channel_teacher_ids(c.student_id)))
            or (coalesce((select s.value = 'true'::jsonb from public.settings s
                           where s.key = 'family_chat_enabled'), false)
              and ((public.auth_role() = 'guardian'
                    and c.student_id in (select public.portal_student_ids()))
                or (public.auth_role() = 'student' and exists (
                      select 1 from public.students s
                       where s.id = c.student_id and s.profile_id = (select auth.uid())))))))))
$$;
revoke execute on function public.can_read_channel(uuid) from public, anon;
grant execute on function public.can_read_channel(uuid) to authenticated, service_role;
