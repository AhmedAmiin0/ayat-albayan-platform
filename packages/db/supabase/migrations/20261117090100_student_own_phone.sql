-- A student's own WhatsApp number (owner 2026-11-17: «student can also using phone number and otp», phone first,
-- «app code + password» the other option). The number is one more public.guardian_phones row, tagged with the
-- student (student_id), never a column on students:
--   * the phone primary key keeps ONE account per number, atomically, across a family's main number, its second
--     number and every child's own number (a clash is 23505 guardian_phones_pkey, already 409 in the API);
--   * teachers never read it: students_teacher_read (migration 003) exposes the whole students row to a teacher,
--     guardian_phones has admin + family-assistant reads only and no PostgREST writes (migration 973).
-- Family sign-in (POST /auth/code/*) looks any number up in guardian_phones: a student's own number opens the
-- student's login, a main or second number the guardian's; the code goes to that number.
--   * «not is_primary» no longer means «the family's second number»: one_second, the main-number mirror and
--     remove_family_phone now leave student rows alone, and so do the student / guardian profile readers and
--     «تعديل البيانات» in the API. The chat, ownership and search readers (v_threads, my_sales_phones,
--     students_chat_list_auto, familyOfPhone, sales-family, sales-ownership, family-search) keep treating it as
--     a number of the family, on purpose: the child's chat is the family's.
--   * set_student_phone (service role, the staff «تعديل البيانات» PATCH) sets, moves or removes the number with its
--     audit row in one transaction. guardian_phones_second still refuses a teacher's number ('teacher_number') and
--     joins «مشترك» for an active family; teachers_not_family_number already refuses any non-primary number.
--   * A number that stops opening a login signs that login out (public.revoke_user_sessions, migration 285): a
--     student's number moved or removed (set_student_phone), a family's second number removed (remove_family_phone).
--   * The number follows its student to another family (students_phone_follow). merge_students (020) re-points
--     this FK like every other (guardian_phones_student_moved): the merged student's number moves to the kept
--     student and the kept student's family only while the kept one has none; else it is dropped with the merged
--     row. Audited either way ('student_phone'). «تحويل إلى ولي أمر» drops it with the row (the API's snapshot
--     keeps it).
-- RLS: unchanged. guardian_phones keeps RLS on, the admin and the family's assistant read, insert / update / delete
-- stay revoked from authenticated at table level (the new column included). Idempotent.
-- SQL test plan (local DB, begin … rollback):
--   a. set_student_phone with a free number → one row (student_id set, not primary) + one audit_log row
--      'student_phone'; again with the same number → false and nothing new; with null → the row gone, true.
--   b. the family's main number, its second number or a sibling's number → 23505 guardian_phones_pkey.
--   c. a teacher's number → 'teacher_number' (P0001).
--   d. update the guardian's main number to its child's own number → 23505 guardian_phones_pkey.
--   e. remove_family_phone on the child's number → 'phone_not_found'.
--   f. a family with a second number AND a child's number → guardian_phones_one_second holds (no 23505).
--   g. update students.guardian_id to another family → the row's guardian_id follows.
--   h. delete the student → the row is gone.
--   i. as an authenticated teacher of that student: select from guardian_phones → 0 rows; insert → permission
--      denied. An unknown student → 'student_not_found'.
--   j. merge_students(kept, merged) where only the merged student (another family) has a number → the row names
--      the kept student and the kept student's family, one 'student_phone' audit row on the kept student.
--   k. merge_students where both have a number → the merge commits; the kept student's number stays, the merged
--      one's is gone, one 'student_phone' audit row on the merged student.
--   l. a student with a login: set_student_phone moving or removing the number → its auth.sessions gone; a first
--      set leaves them. remove_family_phone on a family with a login → the guardian login's sessions gone.
--   m. insert a teacher, or update a teacher's phone, to a child's own number → 'family_number' (23505).
--   n. link_family_phone on a lead whose number is a child's own number → 'number_taken' for another family's
--      student code; false and the lead converted for a code of the same family.
--   o. set_student_phone for a family with an active child → the number is in the 'subscribed' list («مشترك»).

set local lock_timeout = '5s';

-- 1. The student's own number: at most one per student (the unique index also serves the cascade).
alter table public.guardian_phones
  add column if not exists student_id uuid
    constraint guardian_phones_student_id_key unique
    constraint guardian_phones_student_id_fkey references public.students (id) on delete cascade;
comment on column public.guardian_phones.student_id is
  'The student whose own WhatsApp this is (sign-in, owner 2026-11-17); null = a family number (main or second).';

alter table public.guardian_phones drop constraint if exists guardian_phones_student_not_primary;
alter table public.guardian_phones add constraint guardian_phones_student_not_primary
  check (student_id is null or not is_primary) not valid;
alter table public.guardian_phones validate constraint guardian_phones_student_not_primary;

-- 2. One SECOND number per family, same index name (the API's link-family error reads it).
drop index if exists public.guardian_phones_one_second;
create unique index guardian_phones_one_second on public.guardian_phones (guardian_id) where not is_primary and student_id is null;

-- 3. The main number, mirrored as in 973; the delete never takes a child's own number (that write is a 23505).
create or replace function public.guardians_phone_mirror() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guardian_phones
   where guardian_id = new.id and (is_primary or (phone_e164 = new.phone_e164 and student_id is null));
  insert into public.guardian_phones (phone_e164, guardian_id, is_primary, created_by)
    values (new.phone_e164, new.id, true, new.created_by);
  return null;
end $$;
revoke all on function public.guardians_phone_mirror() from public, anon, authenticated;

-- 4. The admin's DELETE of the family's SECOND number: a child's number is not one (phone_not_found).
create or replace function public.remove_family_phone(p_guardian uuid, p_phone text, p_actor uuid)
  returns void
  language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guardian_phones gp
   where gp.guardian_id = p_guardian and gp.phone_e164 = p_phone and not gp.is_primary and gp.student_id is null;
  if not found then
    raise exception 'phone_not_found' using errcode = 'P0001';
  end if;
  -- That number opened the family's login: its sessions end (the main number signs in again).
  perform public.revoke_user_sessions(g.profile_id) from public.guardians g
   where g.id = p_guardian and g.profile_id is not null;
  insert into public.audit_log (actor_id, entity, entity_id, action, before)
    values (p_actor, 'guardians', p_guardian, 'phone_removed', jsonb_build_object('phone_e164', p_phone));
end $$;
revoke execute on function public.remove_family_phone(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.remove_family_phone(uuid, text, uuid) to service_role;

-- 5. Set, move or remove (null) a student's own number. true = changed; false = already so.
-- P0001 student_not_found, teacher_number; 23505 guardian_phones_pkey (the number is another account's).
create or replace function public.set_student_phone(p_student uuid, p_actor uuid, p_phone text default null)
  returns boolean
  language plpgsql security definer set search_path = '' as $$
declare
  v_guardian uuid;
  v_login uuid;
  v_before text;
begin
  -- The student row lock serialises this with a second call and with a family move.
  select s.guardian_id, s.profile_id into v_guardian, v_login
    from public.students s where s.id = p_student for update;
  if not found then
    raise exception 'student_not_found' using errcode = 'P0001';
  end if;
  select gp.phone_e164 into v_before from public.guardian_phones gp where gp.student_id = p_student;
  if v_before is not distinct from p_phone then
    return false;
  end if;
  delete from public.guardian_phones gp where gp.student_id = p_student;
  insert into public.guardian_phones (phone_e164, guardian_id, is_primary, student_id, created_by)
    select p_phone::public.e164, v_guardian, false, p_student, p_actor where p_phone is not null;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    values (p_actor, 'students', p_student, 'student_phone',
            jsonb_build_object('phone_e164', v_before), jsonb_build_object('phone_e164', p_phone));
  -- The old number no longer opens the student's login: its sessions end. A first number signs nobody out.
  perform public.revoke_user_sessions(v_login) where v_before is not null and v_login is not null;
  return true;
end $$;
revoke execute on function public.set_student_phone(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_student_phone(uuid, uuid, text) to service_role;

-- 6. The number follows its student to another family («ربط بولي أمر آخر»).
create or replace function public.students_phone_follow() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  update public.guardian_phones set guardian_id = new.guardian_id where student_id = new.id;
  return null;
end $$;
revoke all on function public.students_phone_follow() from public, anon, authenticated;

drop trigger if exists students_phone_follow on public.students;
create trigger students_phone_follow after update of guardian_id on public.students
  for each row when (old.guardian_id is distinct from new.guardian_id)
  execute function public.students_phone_follow();

-- 7. merge_students (020) re-points every single-column FK to students, this one too (as 191 / 272 handle
-- theirs). The merged student's number moves only while the kept student has none, and then to the kept
-- student's family as well; else the move is skipped and the number goes with the merged row (cascade).
create or replace function public.guardian_phones_student_moved() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.guardian_phones gp where gp.student_id = new.student_id) then
    insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
      values (null, 'students', old.student_id, 'student_phone', jsonb_build_object('phone_e164', old.phone_e164),
              jsonb_build_object('phone_e164', null, 'merged_into', new.student_id));
    return null;
  end if;
  select s.guardian_id into new.guardian_id from public.students s where s.id = new.student_id;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    values (null, 'students', new.student_id, 'student_phone',
            jsonb_build_object('phone_e164', null, 'merged_from', old.student_id),
            jsonb_build_object('phone_e164', new.phone_e164));
  return new;
end $$;
revoke all on function public.guardian_phones_student_moved() from public, anon, authenticated;

drop trigger if exists guardian_phones_student_moved on public.guardian_phones;
create trigger guardian_phones_student_moved before update of student_id on public.guardian_phones
  for each row when (old.student_id is distinct from new.student_id and new.student_id is not null)
  execute function public.guardian_phones_student_moved();

-- Down (manual, after the code rollback):
--   drop trigger if exists guardian_phones_student_moved on public.guardian_phones;
--   drop trigger if exists students_phone_follow on public.students;
--   drop function if exists public.guardian_phones_student_moved(), public.students_phone_follow(),
--     public.set_student_phone(uuid, uuid, text);
--   restore 973's guardians_phone_mirror() and remove_family_phone(uuid, text, uuid) bodies;
--   delete from public.guardian_phones where student_id is not null;
--   drop index if exists public.guardian_phones_one_second;
--   create unique index guardian_phones_one_second on public.guardian_phones (guardian_id) where not is_primary;
--   alter table public.guardian_phones drop column if exists student_id;
