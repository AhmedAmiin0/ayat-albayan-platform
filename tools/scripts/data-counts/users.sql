-- Rows the staff directory answer schemas would refuse (docs/62 C1, read-only counts).
-- count: profiles_full_name_null
select count(*) from public.profiles where full_name is null;

-- count: profiles_role_unknown
select count(*) from public.profiles where role::text not in ('admin', 'teacher', 'guardian', 'assistant', 'sales', 'student');

-- count: teachers_link_name_null
select count(*) from public.teachers where profile_id is not null and display_name_ar is null;

-- count: students_link_name_null
select count(*) from public.students where profile_id is not null and name is null;

-- count: guardians_link_name_null
select count(*) from public.guardians where profile_id is not null and name is null;

-- count: profiles_total
select count(*) from public.profiles;
