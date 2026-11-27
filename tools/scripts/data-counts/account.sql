-- Counts the own-profile answer schema would reject (docs/62 Decisions, read-only counts).
-- count: profiles_full_name_null
select count(*) from public.profiles where full_name is null;

-- count: profiles_phone_not_e164
select count(*) from public.profiles
where phone_e164 is not null and phone_e164 !~ '^\+[1-9][0-9]{7,14}$';

-- count: profiles_role_unknown
select count(*) from public.profiles
where role::text not in ('admin', 'teacher', 'guardian', 'assistant', 'sales', 'student');

-- count: profiles_total
select count(*) from public.profiles;
