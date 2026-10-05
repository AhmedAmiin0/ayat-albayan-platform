-- Dynamic roles, step 5: how many users hold each role (the Roles screen and the "cannot delete a
-- role that still has users" check). Read through the service role by the API.
create or replace view public.v_role_user_counts with (security_invoker = true) as
select r.id as role_id, count(p.id)::int as user_count
from public.roles r
left join public.profiles p on p.role_id = r.id
group by r.id;
