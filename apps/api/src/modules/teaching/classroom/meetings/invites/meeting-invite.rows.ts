import type { InvitePolicy } from './meeting-invite.policy';
import type { ResolvedInvitee } from './meeting-invitee.resolver';

interface RowRun {
  meeting: { id: string };
  actorId: string;
  policy: InvitePolicy;
}

/** Staff hear in the app; the rest by chat when the caller may chat, else by a link to copy. */
function channelOf(i: ResolvedInvitee, policy: InvitePolicy): string {
  if (i.kind === 'staff') return 'in_app';
  return policy.mayChat(i.phone ?? '') ? 'whatsapp' : 'link';
}

/** The pending meeting_invitees row of one invitee. */
export function inviteeRow(run: RowRun, i: ResolvedInvitee) {
  return {
    meeting_id: run.meeting.id,
    kind: i.kind,
    profile_id: i.profileId,
    student_id: i.studentId,
    phone_e164: i.phone,
    display_name: i.displayName.slice(0, 120),
    tz: i.tz,
    channel: channelOf(i, run.policy),
    status: 'pending',
    created_by: run.actorId,
  };
}
