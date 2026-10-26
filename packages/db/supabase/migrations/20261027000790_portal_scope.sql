-- Family portal (docs/31, owner 2026-10-27: «a basic portal: upcoming lessons with the join link, lesson
-- reports, the package»). The API serves /portal/* with the service role and whitelists every field; this
-- is the second wall (rule 9) for a guardian or student login that calls PostgREST directly.
--
-- 1. One scope: portal_student_ids() = the caller's own students. A guardian login (guardians.profile_id)
--    gets every student of that guardian; a student login (students.profile_id) gets itself only, never a
--    sibling. auth_role() is null for a disabled profile (migration 286), so a disabled login gets nothing.
-- 2. The old guardian row policies (migrations 003, 071, 120, 121, 122) exposed whole rows: staff notes,
--    cancel reasons, prices and payments, and the guardian's own row its staff notes. They go; the portal roles read whitelisted definer views instead
--    (the pattern of student_self, migration 288): exactly the columns the portal shows, no money.
-- 3. Report PDFs in storage: the portal scope, sent reports only.
-- Idempotent. Writes no row.

create or replace function public.portal_student_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.id from public.students s
   where (public.auth_role() = 'student' and s.profile_id = (select auth.uid()))
      or (public.auth_role() = 'guardian'
          and s.guardian_id in (select g.id from public.guardians g where g.profile_id = (select auth.uid())))
$$;
revoke execute on function public.portal_student_ids() from public, anon;
grant execute on function public.portal_student_ids() to authenticated, service_role;

-- The API's scope read (service role): the students a portal login may see, by the profile's role in the
-- database (not the token claim), with the switcher's fields. Empty for a disabled or staff profile.
create or replace function public.portal_students_of(p_profile uuid)
  returns table (id uuid, code text, name text, tz text, contact_is_self boolean)
  language sql stable security definer set search_path = '' as $$
  select s.id, s.code, s.name, s.tz, coalesce((to_jsonb(s) ->> 'contact_is_self')::boolean, false)
  from public.profiles pr
  join public.students s
    on (pr.role = 'student' and s.profile_id = pr.id)
    or (pr.role = 'guardian' and s.guardian_id in (select g.id from public.guardians g where g.profile_id = pr.id))
  where pr.id = p_profile and pr.disabled_at is null
  order by s.created_at, s.id
$$;
revoke execute on function public.portal_students_of(uuid) from public, anon, authenticated;
grant execute on function public.portal_students_of(uuid) to service_role;

drop policy if exists students_guardian_read on public.students;
drop policy if exists lessons_guardian_read on public.lessons;
drop policy if exists lesson_students_guardian_read on public.lesson_students;
drop policy if exists lesson_reports_guardian_read on public.lesson_reports;
drop policy if exists report_attachments_guardian_read on public.report_attachments;
drop policy if exists subscriptions_guardian_read on public.subscriptions;
drop policy if exists payments_guardian_read on public.payments;
drop policy if exists storage_reports_guardian_read on storage.objects;
drop policy if exists storage_attachments_guardian_read on storage.objects;
-- The guardian's own row carried staff notes, source and created_by (the 288 problem, for guardians).
drop policy if exists guardians_self_read on public.guardians;

-- The helpers of the dropped policies: no policy reads them any more; no client calls them.
revoke execute on function public.my_student_ids() from public, anon, authenticated;
revoke execute on function public.is_my_child_lesson(uuid) from public, anon, authenticated;
revoke execute on function public.is_my_child_report(uuid) from public, anon, authenticated;
revoke execute on function public.is_my_child_report_pdf(text) from public, anon, authenticated;

-- contact_is_self (family sign-in, docs/30) is read through to_jsonb, so this view works before and after
-- that column exists. No notes, meeting link, guardian id or created_by.
create or replace view public.portal_students with (security_invoker = false) as
  select s.id, s.code, s.name, s.tz, s.status,
    coalesce((to_jsonb(s) ->> 'contact_is_self')::boolean, false) as contact_is_self
  from public.students s
  where s.id in (select public.portal_student_ids());

-- The guardian login's own row: name and clock only (no notes, source or created_by).
create or replace view public.portal_guardians with (security_invoker = false) as
  select g.id, g.name, g.tz
  from public.guardians g
  where public.auth_role() = 'guardian' and g.profile_id = (select auth.uid());

-- One row per (lesson, student of mine): time, status and the teacher's display names. No note, reason,
-- attendance or link (the API hands out the way in).
create or replace view public.portal_lessons with (security_invoker = false) as
  select l.id, ls.student_id, l.starts_at, l.ends_at, l.status, t.display_name_ar, t.display_name_en
  from public.lessons l
  join public.lesson_students ls on ls.lesson_id = l.id
  left join public.teachers t on t.id = l.teacher_id
  where ls.student_id in (select public.portal_student_ids());

-- Reports already sent to the family (a ready PDF): when, never the teacher's form fields.
create or replace view public.portal_reports with (security_invoker = false) as
  select r.id, r.lesson_id, r.student_id, r.submitted_at, r.sent_at
  from public.lesson_reports r
  where r.status = 'submitted' and r.sent_at is not null and r.pdf_status = 'ready'
    and r.student_id in (select public.portal_student_ids());

-- The package without price, currency, fx, quote or notes.
create or replace view public.portal_packages with (security_invoker = false) as
  select p.id, p.student_id, p.package, p.duration, p.lessons_total, p.starts_on, p.renews_on, p.status, p.created_at
  from public.subscriptions p
  where p.student_id in (select public.portal_student_ids());

-- Recordings only where staff switched visible_to_student on (default off, migration 240), finished, and
-- of a one-student lesson (a group file is every student's session). No egress id or path.
create or replace view public.portal_recordings with (security_invoker = false) as
  select r.id, r.lesson_id, ls.student_id, r.started_at, r.ended_at
  from public.lesson_recordings r
  join public.lesson_students ls on ls.lesson_id = r.lesson_id
  where r.visible_to_student and r.status = 'done'
    and ls.student_id in (select public.portal_student_ids())
    and (select count(*) from public.lesson_students x where x.lesson_id = r.lesson_id) = 1;

revoke all on public.portal_students, public.portal_guardians, public.portal_lessons, public.portal_reports,
  public.portal_packages, public.portal_recordings from public, anon;
grant select on public.portal_students, public.portal_guardians, public.portal_lessons, public.portal_reports,
  public.portal_packages, public.portal_recordings to authenticated, service_role;

create or replace function public.is_portal_report_pdf(p_name text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lesson_reports r
    where r.status = 'submitted' and r.sent_at is not null and r.pdf_status = 'ready'
      and r.student_id in (select public.portal_student_ids())
      and r.student_id::text = split_part(p_name, '/', 1)
      and r.lesson_id::text || '.pdf' = split_part(p_name, '/', 2))
$$;
revoke execute on function public.is_portal_report_pdf(text) from public, anon;
grant execute on function public.is_portal_report_pdf(text) to authenticated, service_role;

drop policy if exists storage_reports_portal_read on storage.objects;
create policy storage_reports_portal_read on storage.objects for select to authenticated
  using (bucket_id = 'reports' and public.is_portal_report_pdf(name));

-- MANUAL ROLLBACK (only after the code rollback): drop the six portal_* views, storage_reports_portal_read,
-- is_portal_report_pdf, portal_students_of and portal_student_ids; re-create the dropped guardian policies from
-- 003, 071, 120, 121 and 122 as written there and grant execute on my_student_ids, is_my_child_lesson,
-- is_my_child_report and is_my_child_report_pdf to authenticated again.
