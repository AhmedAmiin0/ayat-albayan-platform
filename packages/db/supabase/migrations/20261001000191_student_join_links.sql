-- Meetings, step 2: the student's own long-lived classroom link («رابط دخول الطالب», /s/<token>).
-- One per student (POST /students/:id/join-link creates or rotates it: the hash is replaced in place,
-- so the old link dies). Only the sha256 of the token is kept, like lesson_join_links (181).
-- A join through it goes in as a guest through a lesson_join_links row tied to that student and
-- lesson (lesson_join_links.student_id), found or created once per lesson, so a removal from the
-- room («إخراج من الحلقة», classroom_blocks.join_link_id, 188) holds on every later join.
-- The API (service role) is the only writer; the admin may read the rows (never the hash).
create table public.student_join_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- merge_students (020) re-points every FK to the kept student: when the kept one already has a link,
-- skip the move, so the merged student's link goes with them (cascade) instead of failing the merge.
create function public.student_join_links_keep_one() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.student_id <> old.student_id
     and exists (select 1 from public.student_join_links where student_id = new.student_id) then
    return null;
  end if;
  return new;
end $$;
create trigger student_join_links_keep_one before update of student_id on public.student_join_links
  for each row execute function public.student_join_links_keep_one();

alter table public.student_join_links enable row level security;
create policy student_join_links_admin_read on public.student_join_links for select
  to authenticated using (public.is_admin());
revoke all on public.student_join_links from anon;
revoke all on public.student_join_links from authenticated;
grant select (id, student_id, revoked_at, created_by, created_at)
  on public.student_join_links to authenticated;

-- The per-lesson guest link a student-link join goes through: one per (lesson, student). No ON DELETE
-- action: a student with lessons cannot be deleted anyway (lesson_students), and clear:demo stays strict.
alter table public.lesson_join_links
  add column student_id uuid references public.students (id);
create unique index lesson_join_links_student_uidx on public.lesson_join_links (lesson_id, student_id)
  where student_id is not null;
grant select (student_id) on public.lesson_join_links to authenticated;
