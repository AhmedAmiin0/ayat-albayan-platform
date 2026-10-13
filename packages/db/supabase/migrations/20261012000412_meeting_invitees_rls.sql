-- RLS for meeting invitations (R-MEET-02). Two security-definer helpers so the two tables' policies
-- never read each other through RLS (no recursion). The meeting's creator, any admin and the invited
-- profile read an invitee row (never the token hash, never the phone); invited staff read the meetings
-- they are invited to. Recordings stay creator + admin (migration 212, unchanged). Writes: API only.
-- Re-runnable.
create or replace function public.is_meeting_creator(p_meeting uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.meetings m where m.id = p_meeting and m.created_by = (select auth.uid()));
$$;

create or replace function public.is_meeting_invitee(p_meeting uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.meeting_invitees i
    where i.meeting_id = p_meeting and i.profile_id = (select auth.uid()) and i.status <> 'cancelled'
  );
$$;

revoke all on function public.is_meeting_creator(uuid) from public, anon;
revoke all on function public.is_meeting_invitee(uuid) from public, anon;
grant execute on function public.is_meeting_creator(uuid) to authenticated;
grant execute on function public.is_meeting_invitee(uuid) to authenticated;

alter table public.meeting_invitees enable row level security;
drop policy if exists meeting_invitees_read on public.meeting_invitees;
create policy meeting_invitees_read on public.meeting_invitees for select to authenticated using (
  public.is_admin() or profile_id = (select auth.uid()) or public.is_meeting_creator(meeting_id)
);
revoke all on public.meeting_invitees from anon;
revoke all on public.meeting_invitees from authenticated;
grant select (id, meeting_id, kind, profile_id, student_id, display_name, channel, status, error_code, sent_at, created_at)
  on public.meeting_invitees to authenticated;

drop policy if exists meetings_invited_read on public.meetings;
create policy meetings_invited_read on public.meetings for select to authenticated using (
  public.is_meeting_invitee(id)
);
