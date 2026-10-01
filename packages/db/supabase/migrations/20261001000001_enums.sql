-- Domain enums (docs/03-requirements.md §2). Mirrored in packages/shared/src/enums.
create type public.user_role as enum ('admin', 'teacher', 'guardian');
create type public.lead_status as enum (
  'new', 'contacted', 'interested_no_slot', 'trial_booked', 'trial_done', 'converted', 'no_reply', 'lost'
);
create type public.lead_source as enum ('facebook_ad', 'instagram_ad', 'whatsapp_direct', 'referral', 'other');
create type public.lesson_status as enum (
  'scheduled', 'confirmed', 'completed', 'late', 'excused', 'no_show',
  'cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'
);
create type public.subscription_status as enum ('trial', 'active', 'paused', 'expired', 'unpaid');
create type public.program as enum ('quran', 'arabic', 'islamic_studies');
create type public.grade as enum ('excellent', 'very_good', 'good', 'acceptable', 'needs_review');
create type public.attendance as enum ('on_time', 'late', 'excused', 'absent');
create type public.package_size as enum ('trial', '4', '8', '12', '16');
create type public.gender as enum ('male', 'female');
create type public.student_status as enum ('trial', 'active', 'paused', 'churned');
create type public.teacher_status as enum ('active', 'inactive');

-- Shared helpers. Phones are E.164 only (rule 7).
create domain public.e164 as text check (value ~ '^\+[1-9][0-9]{7,14}$');
create domain public.lesson_duration as smallint check (value in (30, 45, 60, 90));

create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
