-- One assistant seat per student chat (owner 2026-11-16: «any assistant can subscribe to the chating
-- channel but only 1» and «who brought the student have the priority»; docs/31 §2).
--
-- 1. student_channels.assistant_id: the one assistant (a sales profile) in the chat. Null = free.
--    A deleted profile frees it (on delete set null); a profile that is no longer sales counts as
--    free in the API (stale). The seat is NOT ownership: it grants no money, lead or commission scope.
-- 2. Backfill: every channel without a seat gets the student's bringer (students.brought_by), when
--    that profile is still sales.
-- 3. open_student_channel(): a new student's channel starts with its bringer in the seat (the BEFORE
--    INSERT guard of migration 270 has already set brought_by from a sales creator).
-- 4. can_read_channel: the sales branch reads the seat (assistant_id = the caller) instead of sales
--    ownership (my_sales_student_ids). presence_can_watch calls can_read_channel: unchanged.
-- Taking and leaving the seat is the API's (service role, a conditional update); no client writes.
-- Idempotent. RLS and grants: unchanged.
--
-- MANUAL ROLLBACK (only after the code rollback): re-run the can_read_channel of
-- 20261116000100_child_chat and the open_student_channel of 20261028000800, then
-- alter table public.student_channels drop column assistant_id.

set local lock_timeout = '5s';

alter table public.student_channels
  add column if not exists assistant_id uuid references public.profiles (id) on delete set null;

-- A profile delete and «the chats she holds» look rows up by it; most channels have no seat.
create index if not exists student_channels_assistant_idx on public.student_channels (assistant_id)
  where assistant_id is not null;

update public.student_channels c
   set assistant_id = s.brought_by
  from public.students s
  join public.profiles p on p.id = s.brought_by and p.role = 'sales'
 where s.id = c.student_id
   and c.assistant_id is null;

create or replace function public.open_student_channel() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.student_channels (student_id, assistant_id)
  values (new.id, (select p.id from public.profiles p where p.id = new.brought_by and p.role = 'sales'))
  on conflict (student_id) do nothing;
  return new;
end $$;
revoke execute on function public.open_student_channel() from public, anon, authenticated;

create or replace function public.can_read_channel(p_channel uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.student_channels c
    where c.id = p_channel
      and (public.is_admin()
        or (public.auth_role() = 'sales' and c.assistant_id = (select auth.uid()))
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
