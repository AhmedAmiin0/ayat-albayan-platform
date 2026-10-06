-- Service-role-only helpers of the users module (no client may call them).
-- 1. auth_user_id_by_email: lets POST /users adopt a login left without a profile by a failed attempt.
-- 2. revoke_user_sessions: "sign out everywhere" (sessions cascade to refresh tokens).
create or replace function public.auth_user_id_by_email(p_email text) returns uuid
  language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1
$$;

create or replace function public.revoke_user_sessions(p_user uuid) returns integer
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.auth_user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
