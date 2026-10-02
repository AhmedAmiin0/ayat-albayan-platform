-- Teacher mode (R-TCH-03, R-MSG-05, R-AUTH-01): which threads a teacher sees, who sent a row,
-- and the teacher's own read marks. The API (service role) is the writer; RLS is defence in depth.

-- Who sent an outbound row from the inbox: a teacher (null = the academy or a system job).
-- messages.created_by points at auth.users, which PostgREST cannot embed as a teacher name.
alter table public.messages
  add column sent_by_teacher_id uuid references public.teachers (id) on delete set null;
create index messages_sent_by_teacher_idx on public.messages (sent_by_teacher_id)
  where sent_by_teacher_id is not null;

-- A teacher's threads: guardians of students assigned to them, guardians of students on their
-- lessons from the last 90 days on (future lessons included), and their own chat with the academy.
-- One source of truth for the API (service role) and RLS. Plain text rows so PostgREST returns
-- [{ phone_e164 }] unambiguously.
create function public.teacher_thread_phones(p_teacher_id uuid)
  returns table (phone_e164 text)
  language sql stable security definer set search_path = '' as $$
  select g.phone_e164::text from public.students s
    join public.guardians g on g.id = s.guardian_id
   where s.teacher_id = p_teacher_id
  union
  select g.phone_e164::text from public.lessons l
    join public.lesson_students ls on ls.lesson_id = l.id
    join public.students s on s.id = ls.student_id
    join public.guardians g on g.id = s.guardian_id
   where l.teacher_id = p_teacher_id and l.starts_at >= now() - interval '90 days'
  union
  select t.phone_e164::text from public.teachers t
   where t.id = p_teacher_id and t.phone_e164 is not null
$$;
revoke execute on function public.teacher_thread_phones(uuid) from public, anon, authenticated;
grant execute on function public.teacher_thread_phones(uuid) to service_role;

-- The signed-in teacher's own scope (empty for anyone without a teachers row).
create function public.my_thread_phones()
  returns table (phone_e164 text)
  language sql stable security definer set search_path = '' as $$
  select p.phone_e164 from public.teacher_thread_phones(public.my_teacher_id()) p
$$;
revoke execute on function public.my_thread_phones() from public, anon;
grant execute on function public.my_thread_phones() to authenticated;

create policy messages_teacher_read on public.messages for select to authenticated
  using (phone_e164::text in (select p.phone_e164 from public.my_thread_phones() p));

-- Teacher unread, separate from the admin's (messages.read_at stays the admin's v_threads count).
create table public.teacher_thread_reads (
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  phone_e164 public.e164 not null,
  read_at timestamptz not null,
  primary key (teacher_id, phone_e164)
);
alter table public.teacher_thread_reads enable row level security;
create policy teacher_thread_reads_self on public.teacher_thread_reads for select to authenticated
  using (teacher_id = (select public.my_teacher_id()));
create policy teacher_thread_reads_admin on public.teacher_thread_reads for select to authenticated
  using (public.is_admin());
-- Client roles read through RLS only; the API (service role) writes (rule 9, as migration 110).
revoke all on public.teacher_thread_reads from anon;
revoke insert, update, delete, truncate, references, trigger on public.teacher_thread_reads
  from authenticated;

-- Inbound rows after the teacher last opened the thread; never opened → only the last 24 h count.
-- p_phones is text[] (not e164[]) so PostgREST passes a plain JSON array of strings.
create function public.teacher_unread(p_teacher_id uuid, p_phones text[])
  returns table (phone_e164 text, unread int)
  language sql stable set search_path = '' as $$
  select m.phone_e164::text, count(*)::int from public.messages m
  left join public.teacher_thread_reads r
    on r.teacher_id = p_teacher_id and r.phone_e164 = m.phone_e164
  where m.direction = 'inbound' and m.phone_e164::text = any (p_phones)
    and m.created_at > coalesce(r.read_at, now() - interval '24 hours')
  group by m.phone_e164
$$;
revoke execute on function public.teacher_unread(uuid, text[]) from public, anon, authenticated;
grant execute on function public.teacher_unread(uuid, text[]) to service_role;
