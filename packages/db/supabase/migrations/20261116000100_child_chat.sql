-- A child's own login chats with the teacher too (owner 2026-11-16: «the child can chat normally»;
-- docs/31 §2). Replaces the 2026-10-29 rule that only the guardian, or a student who is their own
-- contact (contact_is_self), took part.
--
-- 1. can_read_channel (migration 971): a student login reads its own open channel, contact_is_self or not.
-- 2. presence_can_watch (migration 985): the teacher and the owning assistant see any student login of a
--    channel they may read, not only a self-contact one.
-- Idempotent. Writes no row.

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
                   where s.id = c.student_id and s.profile_id = (select auth.uid())))))))
$$;
revoke execute on function public.can_read_channel(uuid) from public, anon;
grant execute on function public.can_read_channel(uuid) to authenticated, service_role;

create or replace function public.presence_can_watch(p_target uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select p_target is not null and (p_target = (select auth.uid())
    or public.is_admin()
    or (public.auth_role() in ('teacher', 'sales') and exists (
      select 1 from public.students s
        join public.student_channels c on c.student_id = s.id
       where (s.guardian_id in (select g.id from public.guardians g where g.profile_id = p_target)
              or s.profile_id = p_target)
         and public.can_read_channel(c.id)))
    or (public.auth_role() in ('guardian', 'student') and exists (
      select 1 from public.students s
        join public.student_channels c on c.student_id = s.id
        join public.teachers t on t.profile_id = p_target
       where s.id in (select public.portal_student_ids())
         and t.id in (select public.channel_teacher_ids(s.id))
         and public.can_read_channel(c.id))))
$$;
revoke execute on function public.presence_can_watch(uuid) from public, anon;
grant execute on function public.presence_can_watch(uuid) to authenticated, service_role;
