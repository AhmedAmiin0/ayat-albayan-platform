-- Student channel opens after the subscription (docs/31 §2, owner 2026-10-29: «chat between teacher and
-- student will be using socket it will not use whatsapp» and «Assistant assigns the student to the teacher
-- when the student take the trial and decided to subscribe so he can start chatting with the teacher»).
--
-- 1. channel_is_open(student): the student has subscribed (status past the trial: not new, trial or
--    pending_subscription; a payment moves a trial student to active) AND has an assigned teacher
--    (students.teacher_id). Never during the trial, never at registration.
-- 2. can_read_channel (RLS, also what Realtime checks for each subscriber):
--    monitors (admin, the owning assistant) read always; a teacher only an OPEN channel of a current
--    student (channel_teacher_ids); the family only an OPEN channel and only the guardian's login, or the
--    student's own login when the student is their own contact (contact_is_self). A child's own login
--    reads nothing (the stricter choice).
-- 3. teacher_channel_student_ids: open channels only (the teacher's list).
-- 4. Realtime: channel_messages joins the supabase_realtime publication (postgres_changes, RLS applies to
--    what each subscriber is told). Guarded: a stack without Realtime has no publication.
-- Idempotent. Writes no row.

create or replace function public.channel_is_open(p_student_id uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s
     where s.id = p_student_id and s.teacher_id is not null
       and s.status not in ('new', 'trial', 'pending_subscription'))
$$;
revoke execute on function public.channel_is_open(uuid) from public, anon;
grant execute on function public.channel_is_open(uuid) to authenticated, service_role;

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
            or (public.auth_role() = 'guardian' and c.student_id in (select public.portal_student_ids()))
            or (public.auth_role() = 'student' and exists (
                  select 1 from public.students s
                   where s.id = c.student_id and s.profile_id = (select auth.uid()) and s.contact_is_self))))))
$$;
revoke execute on function public.can_read_channel(uuid) from public, anon;
grant execute on function public.can_read_channel(uuid) to authenticated, service_role;

create or replace function public.teacher_channel_student_ids(p_teacher_id uuid) returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select x.id from (
    select s.id from public.students s where s.teacher_id = p_teacher_id
    union
    select ls.student_id from public.lessons l
      join public.lesson_students ls on ls.lesson_id = l.id
     where l.teacher_id = p_teacher_id and l.status in ('scheduled', 'confirmed') and l.ends_at >= now()
       and l.starts_at < now() + interval '1 day'
  ) x
  where public.channel_is_open(x.id)
$$;
revoke execute on function public.teacher_channel_student_ids(uuid) from public, anon, authenticated;
grant execute on function public.teacher_channel_student_ids(uuid) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channel_messages'
     ) then
    alter publication supabase_realtime add table public.channel_messages;
  end if;
end
$$;

-- MANUAL ROLLBACK (only after the code rollback): alter publication supabase_realtime drop table
--   public.channel_messages; re-run the can_read_channel and teacher_channel_student_ids bodies of
--   migration 20261028000800; drop function public.channel_is_open(uuid).
