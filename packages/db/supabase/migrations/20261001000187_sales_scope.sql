-- Sales portal, step 2: what a salesperson owns. Ownership is leads.assigned_to (migration 004, a profile),
-- no new table. From a lead the chain is: lead -> converted guardian -> the guardian's students ->
-- their subscriptions and lessons; a trial booked from the lead is schedule_rules.created_from_lead_id.
-- The API (service role) serves the portal and strips money; RLS is the second wall (rule 9) and grants
-- a salesperson ONLY: their leads, those guardians, the chats of those phones and their lessons. There is
-- deliberately no policy on subscriptions, payments or students for sales (prices, notes): no policy = no access.
create function public.my_sales_lead_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select id from public.leads where assigned_to = auth.uid()
$$;

create function public.my_sales_guardian_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select converted_guardian_id from public.leads
  where assigned_to = auth.uid() and converted_guardian_id is not null
$$;

create function public.my_sales_student_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.id from public.students s where s.guardian_id in (select public.my_sales_guardian_ids())
$$;

-- The phones of this salesperson's chats: their leads and the guardians those leads became.
create function public.my_sales_phones() returns table (phone_e164 text)
  language sql stable security definer set search_path = '' as $$
  select l.phone_e164::text from public.leads l where l.assigned_to = auth.uid()
  union
  select g.phone_e164::text from public.guardians g where g.id in (select public.my_sales_guardian_ids())
$$;

-- A lesson is theirs when it was booked from one of their leads or is a lesson of one of their students.
create function public.is_my_sales_lesson(p_lesson uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    left join public.schedule_rules r on r.id = l.rule_id
    where l.id = p_lesson
      and (r.created_from_lead_id in (select public.my_sales_lead_ids())
           or exists (select 1 from public.lesson_students ls
                      where ls.lesson_id = l.id and ls.student_id in (select public.my_sales_student_ids())))
  )
$$;

revoke execute on function public.my_sales_lead_ids(), public.my_sales_guardian_ids(),
  public.my_sales_student_ids(), public.my_sales_phones(), public.is_my_sales_lesson(uuid) from public, anon;
grant execute on function public.my_sales_lead_ids(), public.my_sales_guardian_ids(),
  public.my_sales_student_ids(), public.my_sales_phones(), public.is_my_sales_lesson(uuid) to authenticated;

create policy leads_sales_read on public.leads for select to authenticated
  using (assigned_to = (select auth.uid()));
create policy guardians_sales_read on public.guardians for select to authenticated
  using (id in (select public.my_sales_guardian_ids()));
-- Their chats, minus the two templates that carry a signed link in template_params.button (a feedback
-- answer or a classroom entry would be possible with it), as migration 168 does for teachers.
create policy messages_sales_read on public.messages for select to authenticated
  using (phone_e164::text in (select p.phone_e164 from public.my_sales_phones() p)
         and template_key is distinct from 'lesson_feedback_request'
         and template_key is distinct from 'lesson_join_link');
create policy lessons_sales_read on public.lessons for select to authenticated
  using (public.is_my_sales_lesson(id));
create policy lesson_students_sales_read on public.lesson_students for select to authenticated
  using (public.is_my_sales_lesson(lesson_id));

-- New leads are assigned to the least-loaded salesperson by the API (LeadsService), never by a trigger:
-- seed:demo and migrate:apply must not hand imported leads to real salespeople. The admin's switch:
insert into public.settings (key, value) values ('sales_auto_assign', 'true'::jsonb)
on conflict (key) do nothing;
