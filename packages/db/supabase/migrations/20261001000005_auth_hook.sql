-- Adds `user_role` (from profiles) to every access token, so the Nest guard and the web
-- router can authorise by role without a DB round-trip. Enabled in supabase/config.toml
-- ([auth.hook.custom_access_token]) and in each hosted project's Auth settings.
create function public.custom_access_token_hook(event jsonb) returns jsonb
  language plpgsql stable as $$
declare
  claims jsonb := event -> 'claims';
  user_role public.user_role;
begin
  select p.role into user_role from public.profiles p where p.id = (event ->> 'user_id')::uuid;
  claims := jsonb_set(claims, '{user_role}', coalesce(to_jsonb(user_role), 'null'::jsonb));
  return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;
create policy profiles_auth_admin_read on public.profiles for select to supabase_auth_admin
  using (true);
