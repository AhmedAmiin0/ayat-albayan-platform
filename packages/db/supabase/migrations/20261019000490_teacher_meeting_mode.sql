-- Per-teacher meeting mode (owner 2026-10-19: «configurable for each teacher»). Until now one
-- academy-wide switch (settings.meeting_link_auto, migration 330) chose between the fixed link and
-- our LiveKit classroom. Expand-only, no backfill: every teacher starts at null, which follows the
-- academy switch, so nothing changes on deploy. RLS is unchanged: the column is read the way
-- teachers.meeting_link is (teachers_admin for all, teachers_self_read for the teacher's own row).
alter table public.teachers add column if not exists meeting_mode text null;

alter table public.teachers drop constraint if exists teachers_meeting_mode_check;
alter table public.teachers add constraint teachers_meeting_mode_check
  check (meeting_mode in ('static', 'platform'));

comment on column public.teachers.meeting_mode is
  'How this teacher''s lessons are attended. null = follow settings.meeting_link_auto (the academy '
  'default); ''static'' = the fixed link (teachers.meeting_link, a student''s meeting_link_override or a '
  'booking''s own link, copied into lessons.meeting_link); ''platform'' = our classroom (/classroom/<id> '
  'for the teacher, the lesson_join_link guest link for the family). Chosen when messages are queued; '
  'lessons.meeting_link is never rewritten by the mode.';

-- A new fixed link reaches the teacher's future open lessons that carried the old one (or none).
-- A lesson with any other link carries a student's meeting_link_override or a booking's own link:
-- it is left alone. Held / cancelled / moved / past lessons and schedule_rules are never touched
-- (rules keep only an admin's own link since migration 110; the generator reads the teacher's).
create or replace function public.teachers_relink_lessons() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.meeting_link is not distinct from old.meeting_link then
    return null;
  end if;
  update public.lessons l
    set meeting_link = new.meeting_link
    where l.teacher_id = new.id
      and l.starts_at > now()
      and l.status in ('scheduled', 'confirmed')
      and (l.meeting_link is null or l.meeting_link = old.meeting_link);
  return null;
end $$;

drop trigger if exists teachers_relink_lessons on public.teachers;
create trigger teachers_relink_lessons after update of meeting_link
  on public.teachers for each row execute function public.teachers_relink_lessons();

revoke execute on function public.teachers_relink_lessons() from public, anon, authenticated;
