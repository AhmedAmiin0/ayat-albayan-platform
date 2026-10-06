-- Assistant (base role `sales`) scope, role names and permissions (owner, 2026-10-06). Idempotent.
--
-- 1. What a salesperson may read (RLS, the second wall; the API serves the portal with the service role):
--    * students they BROUGHT (students.brought_by) and no other, with brought_at, only through the view
--      v_assistant_students (code, name, dates, commission): never the students row (notes, links, teacher);
--    * payments they RECORDED (payments.recorded_by) and no other payment: no policy on subscriptions,
--      prices or anyone else's money stays hidden (migration 187);
--    * the chats and lessons of those students' guardians, on top of their own leads (187's helpers).
--    Their terms, commissions (never the price), adjustments and non-draft statements are in migration 271.
-- 2. v_assistant_students: one row per brought student for the "my students" screen and the admin ledger
--    (owner-rights view that filters itself: a sales user gets their own rows only; an admin all).
-- 3. Role labels: the owner's "assistant" is the sales role; the classroom teaching assistant is renamed.
-- 4. Permissions: the admin keys assistantpay.read / .write / .approve (the system admin holds every
--    grantable key in the API; its rows are listed for readers and the seed test). The sales scope keys
--    self.sales_students / self.sales_payments / self.sales_earnings follow the base role in the
--    catalog (never stored), like self.sales.

create or replace function public.my_sales_guardian_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select converted_guardian_id from public.leads
  where assigned_to = auth.uid() and converted_guardian_id is not null
  union
  select s.guardian_id from public.students s where s.brought_by = auth.uid()
$$;

-- The students of their lead guardians (as before) plus the ones they brought.
create or replace function public.my_sales_student_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
  select s.id from public.students s
  where s.brought_by = auth.uid()
     or s.guardian_id in (select l.converted_guardian_id from public.leads l
                          where l.assigned_to = auth.uid() and l.converted_guardian_id is not null)
$$;

-- No policy on students for a salesperson: a policy would expose the whole row (notes, meeting_link_override,
-- teacher_id). The brought students reach her through v_assistant_students below, whitelisted columns only.
drop policy if exists students_sales_brought_read on public.students;

drop policy if exists payments_sales_own_read on public.payments;
create policy payments_sales_own_read on public.payments for select to authenticated
  using (recorded_by = (select auth.uid()) and public.auth_role() = 'sales');

-- Runs with its owner's rights (bypasses the RLS of students and assistant_commissions) and filters itself:
-- an admin sees every brought student, a salesperson the ones brought by her, the service role (the API,
-- SQL without a JWT) all; a guardian, teacher or classroom assistant sees none.
create or replace view public.v_assistant_students with (security_invoker = false) as
  select s.id as student_id, s.code, s.name, s.brought_by as assistant_id, s.brought_at,
         (public.student_first_paid_at(s.id) is not null) as first_subscription_paid,
         public.student_first_paid_at(s.id) as first_paid_at,
         c.id as commission_id, c.status as commission_status, c.amount as commission_amount,
         c.currency as commission_currency, c.earned_at as commission_earned_at
  from public.students s
  left join public.assistant_commissions c on c.student_id = s.id
  where s.brought_by is not null
    and (not public.is_client_session() or public.is_admin()
         or (s.brought_by = auth.uid() and public.auth_role() = 'sales'));
revoke all on public.v_assistant_students from public, anon, authenticated;
grant select on public.v_assistant_students to authenticated, service_role;

update public.roles set name_ar = 'مساعد/ة', name_en = 'Assistant' where is_system and key = 'sales';
update public.roles set name_ar = 'مساعد حلقة', name_en = 'Classroom assistant' where is_system and key = 'assistant';

insert into public.role_permissions (role_id, permission)
select r.id, 'assistantpay.read' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
insert into public.role_permissions (role_id, permission)
select r.id, 'assistantpay.write' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
insert into public.role_permissions (role_id, permission)
select r.id, 'assistantpay.approve' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;
