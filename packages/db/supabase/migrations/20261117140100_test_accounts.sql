-- Test accounts (owner 2026-11-17: «if the user have flag called test can pass some security
-- validations»; docs/56). A test account may skip four checks only: watermark, rate limits, the live
-- join window and the screen-capture block (packages/shared TEST_BYPASS / canSkip). The API decides from
-- these columns, never from the client or the token. Test accounts get NO extra visibility.
--
-- 1. profiles.is_test, students.is_test (not null default false: every existing row stays real).
-- 2. Only the API (service role) writes them: UPDATE (is_test) is revoked from anon / authenticated at
--    column level. A column revoke is a no-op while the role holds the TABLE privilege, so the table
--    UPDATE is swapped for UPDATE on every other column (as migration 720 did for SELECT); a column
--    added later must be granted by its own migration. A guard trigger refuses a client session's change
--    too (defence in depth, like profiles_guard_role).
-- 3. Family links: a test family login (guardian or student profile) links only to test students, a real
--    one only to real students: students.profile_id, and students.guardian_id → guardians.profile_id.
--    Deferred constraint triggers check the final state at commit, so a whole family flips together.
--    A login with no family link yet takes its family's flag when it is linked (a test family's first
--    sign-in), and a new student of a family with a login takes that login's flag.
-- 4. set_test_flag(kind, id, is_test, actor): the admin switch (service role). The unit is the family:
--    a student or a family login flips the guardian's students and every login of that family; a staff
--    profile flips alone. One audit_log row 'test_flag' in the same transaction.
-- RLS: unchanged. Idempotent.
--
-- MANUAL ROLLBACK (only after the code rollback): drop the triggers and functions below, then
--   grant update on public.profiles, public.students to anon, authenticated;
--   alter table public.profiles drop column is_test; alter table public.students drop column is_test;

set local lock_timeout = '5s';

alter table public.profiles add column if not exists is_test boolean not null default false;
alter table public.students add column if not exists is_test boolean not null default false;
comment on column public.profiles.is_test is
  'Test account (docs/56): may skip watermark, rate limits, join window, screen-capture block. API-only.';
comment on column public.students.is_test is
  'Test student (docs/56): the second half of the double condition. API-only.';

-- 2. Column privileges: everything but is_test stays updatable for the roles that had UPDATE.
do $$
declare
  t text;
  r text;
  cols text;
begin
  foreach t in array array['profiles', 'students'] loop
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
      from information_schema.columns
     where table_schema = 'public' and table_name = t and column_name <> 'is_test';
    foreach r in array array['anon', 'authenticated'] loop
      if has_table_privilege(r, format('public.%I', t), 'UPDATE') then
        execute format('revoke update on public.%I from %I', t, r);
        execute format('grant update (%s) on public.%I to %I', cols, t, r);
      end if;
    end loop;
  end loop;
end $$;
revoke update (is_test) on public.profiles from anon, authenticated;
revoke update (is_test) on public.students from anon, authenticated;

create or replace function public.test_flag_guard() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if public.is_client_session() and new.is_test is distinct from old.is_test then
    raise exception 'is_test can only be changed by the API' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.test_flag_guard() from public, anon, authenticated;

drop trigger if exists profiles_test_flag_guard_trg on public.profiles;
create trigger profiles_test_flag_guard_trg before update of is_test on public.profiles
  for each row execute function public.test_flag_guard();
drop trigger if exists students_test_flag_guard_trg on public.students;
create trigger students_test_flag_guard_trg before update of is_test on public.students
  for each row execute function public.test_flag_guard();

-- 3. The family-link rule. true = this student's own login or its guardian's login has another flag.
create or replace function public.test_family_mismatch(p_student uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.students s
      left join public.profiles own on own.id = s.profile_id
      left join public.guardians g on g.id = s.guardian_id
      left join public.profiles gp on gp.id = g.profile_id
     where s.id = p_student
       and ((own.id is not null and own.is_test <> s.is_test)
         or (gp.id is not null and gp.is_test <> s.is_test))
  )
$$;
revoke all on function public.test_family_mismatch(uuid) from public, anon, authenticated;

-- The students a changed row touches: itself (students), its children (guardians), or the children of
-- the login (profiles: own student rows and its guardian rows' students).
create or replace function public.test_family_check() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  bad uuid;
begin
  select s.id into bad
    from public.students s
   where case tg_table_name
           when 'students' then s.id = new.id
           when 'guardians' then s.guardian_id = new.id
           else s.profile_id = new.id
             or s.guardian_id in (select g.id from public.guardians g where g.profile_id = new.id)
         end
     and public.test_family_mismatch(s.id)
   limit 1;
  if bad is not null then
    raise exception 'test_family_mismatch' using errcode = '23514',
      detail = 'A test login links only to test students, a real login only to real students.';
  end if;
  return null;
end $$;
revoke all on function public.test_family_check() from public, anon, authenticated;

drop trigger if exists students_test_family_trg on public.students;
create constraint trigger students_test_family_trg
  after insert or update of is_test, profile_id, guardian_id on public.students
  deferrable initially deferred for each row execute function public.test_family_check();
drop trigger if exists guardians_test_family_trg on public.guardians;
create constraint trigger guardians_test_family_trg
  after insert or update of profile_id on public.guardians
  deferrable initially deferred for each row execute function public.test_family_check();
drop trigger if exists profiles_test_family_trg on public.profiles;
create constraint trigger profiles_test_family_trg
  after update of is_test on public.profiles
  deferrable initially deferred for each row execute function public.test_family_check();

-- A login with no family link yet takes its family's flag when it is linked (the first sign-in of a test
-- family creates a real profile first); a new student of a family with a login takes that login's flag,
-- and a client session never inserts a test student. Staff profiles and linked logins never change here.
create or replace function public.test_flag_adopt() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  fam boolean;
  before_profile uuid := case when tg_op = 'UPDATE' then old.profile_id end;
begin
  if tg_table_name = 'students' then
    if tg_op = 'INSERT' then
      select gp.is_test into fam
        from public.guardians g join public.profiles gp on gp.id = g.profile_id
       where g.id = new.guardian_id;
      new.is_test := coalesce(fam, new.is_test and not public.is_client_session());
    end if;
    fam := new.is_test;
  else
    select bool_and(s.is_test) into fam
      from public.students s where s.guardian_id = new.id
    having bool_and(s.is_test) = bool_or(s.is_test);
  end if;
  if new.profile_id is not null and fam is not null and new.profile_id is distinct from before_profile then
    update public.profiles p set is_test = fam
     where p.id = new.profile_id and p.is_test <> fam and p.role in ('guardian', 'student')
       and not exists (select 1 from public.students s where s.profile_id = p.id)
       and not exists (select 1 from public.guardians g where g.profile_id = p.id);
  end if;
  return new;
end $$;
revoke all on function public.test_flag_adopt() from public, anon, authenticated;

drop trigger if exists students_test_adopt_trg on public.students;
create trigger students_test_adopt_trg before insert or update of profile_id on public.students
  for each row execute function public.test_flag_adopt();
drop trigger if exists guardians_test_adopt_trg on public.guardians;
create trigger guardians_test_adopt_trg before insert or update of profile_id on public.guardians
  for each row execute function public.test_flag_adopt();

-- 4. The admin switch. p_kind 'student' (students.id) or 'profile' (profiles.id). null = no such row.
create or replace function public.set_test_flag(p_kind text, p_id uuid, p_is_test boolean, p_actor uuid)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  fam uuid[];
  logins uuid[];
  was boolean;
begin
  if p_kind = 'student' then
    select s.is_test into was from public.students s where s.id = p_id;
  elsif p_kind = 'profile' then
    select p.is_test into was from public.profiles p where p.id = p_id;
  else
    raise exception 'set_test_flag: unknown kind %', p_kind using errcode = '22023';
  end if;
  if was is null then
    return null;
  end if;
  -- The family rows change one table at a time: check the links once, at commit (a caller that set
  -- them immediate sets them back after this call).
  set constraints public.students_test_family_trg, public.guardians_test_family_trg,
    public.profiles_test_family_trg deferred;
  -- The family: the target student or the login's students, then every child of their guardians.
  with seed as (
    select s.id, s.guardian_id from public.students s
     where (p_kind = 'student' and s.id = p_id) or (p_kind = 'profile' and s.profile_id = p_id)
    union
    select s.id, s.guardian_id from public.students s
      join public.guardians g on g.id = s.guardian_id
     where p_kind = 'profile' and g.profile_id = p_id
  )
  select coalesce(array_agg(distinct x.id), '{}') into fam from (
    select seed.id from seed
    union
    select s.id from public.students s where s.guardian_id in (select seed.guardian_id from seed)
  ) x;
  select coalesce(array_agg(distinct x.pid), '{}') into logins from (
    select p_id as pid where p_kind = 'profile'
    union select s.profile_id from public.students s where s.id = any (fam) and s.profile_id is not null
    union select g.profile_id from public.students s join public.guardians g on g.id = s.guardian_id
     where s.id = any (fam) and g.profile_id is not null
  ) x;
  update public.students s set is_test = p_is_test where s.id = any (fam) and s.is_test <> p_is_test;
  update public.profiles p set is_test = p_is_test where p.id = any (logins) and p.is_test <> p_is_test;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
  values (p_actor, case p_kind when 'student' then 'students' else 'profiles' end, p_id, 'test_flag',
    jsonb_build_object('is_test', was),
    jsonb_build_object('is_test', p_is_test, 'students', to_jsonb(fam), 'profiles', to_jsonb(logins)));
  return jsonb_build_object('id', p_id, 'is_test', p_is_test, 'profiles', to_jsonb(logins));
end $$;
revoke all on function public.set_test_flag(text, uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.set_test_flag(text, uuid, boolean, uuid) to service_role;
