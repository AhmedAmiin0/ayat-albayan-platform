-- Counts the rows the meeting invitee option schema would refuse (docs/62 Decisions).
-- count: invitee_option_staff_unnamed
select count(*) from public.profiles
where role in ('admin', 'teacher', 'assistant', 'sales') and disabled_at is null
  and (full_name is null or role is null);

-- count: invitee_option_students_unnamed
select count(*) from public.students where name is null;

-- count: meeting_invitees_unnamed
select count(*) from public.meeting_invitees where display_name is null;
