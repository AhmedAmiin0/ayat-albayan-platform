-- Every row that references a user's profile or auth user, found from pg_constraint, so DELETE
-- /users/:id can refuse (409 users_has_history) when history exists. Link columns that the delete
-- clears itself (teachers / guardians / students.profile_id, student_assistants is NOT one: it is
-- history) are listed with kind 'link' so the API can tell them apart. Service-role only.
create or replace function public.user_references(user_id uuid)
  returns table (ref_table text, ref_column text, kind text, n bigint)
  language plpgsql stable security definer set search_path = '' as $$
declare
  c record;
  cnt bigint;
begin
  for c in
    select con.conrelid::regclass::text as tbl, a.attname::text as col, con.confrelid::regclass::text as target
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
    where con.contype = 'f' and array_length(con.conkey, 1) = 1
      and con.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
      and con.conrelid <> 'public.profiles'::regclass
      and con.conrelid::regclass::text not like 'auth.%'
    order by 1, 2
  loop
    execute format('select count(*) from %s where %I = $1', c.tbl, c.col) using user_id into cnt;
    if cnt > 0 then
      ref_table := regexp_replace(c.tbl, '^public\.', '');
      ref_column := c.col;
      kind := case when ref_column = 'profile_id' and ref_table in ('teachers', 'guardians', 'students')
        then 'link' else 'history' end;
      n := cnt;
      return next;
    end if;
  end loop;
end $$;

revoke all on function public.user_references(uuid) from public, anon, authenticated;
grant execute on function public.user_references(uuid) to service_role;
