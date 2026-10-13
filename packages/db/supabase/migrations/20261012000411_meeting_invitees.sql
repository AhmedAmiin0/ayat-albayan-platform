-- Meeting invitations (R-MEET-02, owner 2026-10-12). One row per invitee: a staff profile (in-app,
-- the bell kind meeting_invite), a student (the guardian's phone, resolved by the API) or any typed
-- phone (E.164). Non-staff get a personal guest link /m/<token>: only its sha256 is kept (like
-- lesson_join_links), shown once to the creator; «أعد الإرسال» replaces it, cancelling the meeting
-- clears it. WhatsApp goes out as a chat message inside the 24 h window only: a closed window is
-- status window_closed (the creator copies the link and the invitation instead).
-- The API (service role) is the only writer. Re-runnable.
create table if not exists public.meeting_invitees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  kind text not null check (kind in ('staff', 'student', 'phone')),
  profile_id uuid references public.profiles (id) on delete cascade,
  -- No action on delete (like lesson_students): a student with invitations is not silently erased.
  student_id uuid references public.students (id),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  display_name text not null check (length(display_name) between 1 and 120),
  -- The reader's tz: the invitation's time is written in it (rule 6), on a resend or reschedule too.
  tz text not null default 'UTC',
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  channel text not null check (channel in ('in_app', 'whatsapp', 'link')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'window_closed', 'failed', 'cancelled')),
  error_code text check (error_code is null or length(error_code) <= 60),
  sent_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint meeting_invitees_kind_shape check (
    (kind = 'staff' and profile_id is not null and phone_e164 is null and token_hash is null)
    or (kind = 'student' and student_id is not null and profile_id is null)
    or (kind = 'phone' and phone_e164 is not null and profile_id is null and student_id is null)
  )
);

create unique index if not exists meeting_invitees_profile_uidx on public.meeting_invitees (meeting_id, profile_id)
  where profile_id is not null;
create unique index if not exists meeting_invitees_phone_uidx on public.meeting_invitees (meeting_id, phone_e164)
  where phone_e164 is not null;
create index if not exists meeting_invitees_profile_idx on public.meeting_invitees (profile_id)
  where profile_id is not null;
