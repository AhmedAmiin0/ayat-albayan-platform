-- Service-role-only directory of every login (auth.users + profiles + the linked record).
-- Status: 'active' | 'disabled' (anything else = all). Total count repeats on every row.
create or replace function public.admin_list_users(
  q text default null, role public.user_role default null, status text default null,
  lim int default 25, off int default 0
) returns table (
  id uuid, email text, full_name text, phone_e164 text, role public.user_role, role_id uuid,
  role_key text, disabled_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  created_at timestamptz, linked_kind text, linked_id uuid, linked_name text, linked_code text,
  total bigint
) language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, u.email::text as email, p.full_name, p.phone_e164::text as phone_e164, p.role, p.role_id,
      coalesce(r.key, sr.key) as role_key, p.disabled_at, u.last_sign_in_at, u.banned_until,
      p.created_at, l.kind as linked_kind, l.id as linked_id, l.name as linked_name, l.code as linked_code
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.roles r on r.id = p.role_id
    left join public.roles sr on sr.is_system and sr.base_role = p.role
    left join lateral (
      select 'teacher'::text as kind, t.id, t.display_name_ar as name, null::text as code
        from public.teachers t where t.profile_id = p.id
      union all
      select 'student', s.id, s.name, s.code from public.students s where s.profile_id = p.id
      union all
      select 'guardian', g.id, g.name, null from public.guardians g where g.profile_id = p.id
      limit 1
    ) l on true
    where (admin_list_users.role is null or p.role = admin_list_users.role)
      and (coalesce(admin_list_users.status, '') not in ('active', 'disabled')
        or (admin_list_users.status = 'disabled') = (p.disabled_at is not null))
      and (nullif(btrim(admin_list_users.q), '') is null
        or p.full_name ilike '%' || btrim(admin_list_users.q) || '%'
        or u.email ilike '%' || btrim(admin_list_users.q) || '%'
        or p.phone_e164::text like '%' || btrim(admin_list_users.q) || '%'
        or l.code ilike '%' || btrim(admin_list_users.q) || '%')
  )
  select b.id, b.email, b.full_name, b.phone_e164, b.role, b.role_id, b.role_key, b.disabled_at,
    b.last_sign_in_at, b.banned_until, b.created_at, b.linked_kind, b.linked_id, b.linked_name,
    b.linked_code, count(*) over () as total
  from base b
  order by b.created_at desc, b.id
  limit greatest(1, least(coalesce(admin_list_users.lim, 25), 200))
  offset greatest(0, coalesce(admin_list_users.off, 0))
$$;

revoke all on function public.admin_list_users(text, public.user_role, text, int, int) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, public.user_role, text, int, int) to service_role;
