-- Owner 2026-10-15 (R-STU-05, docs/11 §7): uses the values added by 20261015000440.
--
-- 1. A student row inserted without a status is «جديد» (new): registered, no trial session time yet.
--    The API moves it to trial when a trial lesson is booked (create_booking keeps its explicit status).
alter table public.students alter column status set default 'new';

-- 2. Days a student stays «بانتظار التجديد» before «انتهى الاشتراك» (registry: subscription_expiry_days,
--    int 1..90, default 7, edited on /admin/settings). Never overwrites an edited row.
insert into public.settings (key, value) values ('subscription_expiry_days', '7'::jsonb)
on conflict (key) do nothing;

-- 3. No direct teacher ↔ family chat while the student is not subscribed yet (owner 2026-10-11):
--    new, trial and pending_subscription (was: trial only). Same body as 20261007000001 otherwise.
create or replace function public.teacher_thread_phones(p_teacher_id uuid)
  returns table (phone_e164 text)
  language sql stable security definer set search_path = '' as $$
  select g.phone_e164::text from public.students s
    join public.guardians g on g.id = s.guardian_id
   where s.id in (select public.teacher_student_ids(p_teacher_id))
     and s.status not in ('new', 'trial', 'pending_subscription')
  union
  select t.phone_e164::text from public.teachers t
   where t.id = p_teacher_id and t.phone_e164 is not null
$$;
revoke execute on function public.teacher_thread_phones(uuid) from public, anon, authenticated;
grant execute on function public.teacher_thread_phones(uuid) to service_role;

-- MANUAL ROLLBACK (only after the code rollback):
--   alter table public.students alter column status set default 'trial';
--   delete from public.settings where key = 'subscription_expiry_days';
--   re-run the function body of 20261007000001 (s.status <> 'trial').
