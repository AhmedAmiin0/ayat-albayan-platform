-- Counts the internal meeting rows the meeting answer schemas would refuse (docs/62 Decisions).
-- count: meetings_total
select count(*) from public.meetings;

-- count: meetings_missing_title_or_created
select count(*) from public.meetings where title is null or created_at is null;

-- count: meetings_half_scheduled
select count(*) from public.meetings where (starts_at is null) <> (planned_end_at is null);

-- count: meeting_invitees_unknown_enum
select count(*) from public.meeting_invitees
where kind not in ('staff', 'student', 'phone')
   or channel not in ('in_app', 'whatsapp', 'link')
   or status not in ('pending', 'sent', 'window_closed', 'failed', 'cancelled');
