-- Counts the booking teacher option schema would reject (docs/62 Decisions, read-only counts).
-- count: teachers_name_null
select count(*) from public.teachers where display_name_ar is null;

-- count: teachers_gender_unknown
select count(*) from public.teachers where gender::text not in ('male', 'female');

-- count: teachers_program_unknown
select count(*) from public.teachers where not programs <@ '{quran,arabic,islamic_studies}';

-- count: teachers_total
select count(*) from public.teachers;
