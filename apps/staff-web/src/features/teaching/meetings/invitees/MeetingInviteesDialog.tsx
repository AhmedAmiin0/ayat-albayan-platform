import { useQuery } from '@tanstack/react-query';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { InviteeViewRow } from './InviteeViewRow';
import { meetingInviteesQuery } from './meeting-invites-api';
import { useMayInvitePhones } from './use-may-invite-phones';

const L = t.meetingInvites.list;

interface Props {
  meetingId: string;
  title: string;
  onClose: () => void;
}

/** Creator or admin only. */
export function MeetingInviteesDialog({ meetingId, title, onClose }: Props) {
  const invitees = useQuery(meetingInviteesQuery(meetingId));
  const mayInvitePhones = useMayInvitePhones();
  const actions = (
    <Button type="button" variant="ghost" onClick={onClose}>
      {L.close}
    </Button>
  );
  return (
    <Dialog title={L.invitees} description={title} onClose={onClose} actions={actions}>
      {invitees.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {invitees.isError && <FormAlert>{t.common.error}</FormAlert>}
      {invitees.isSuccess && invitees.data.length === 0 && <p className="text-sm text-ink-3">{L.noInvitees}</p>}
      <ul>
        {(invitees.data ?? []).map((i) => (
          <InviteeViewRow key={i.id} meetingId={meetingId} invitee={i} mayInvitePhones={mayInvitePhones} />
        ))}
      </ul>
    </Dialog>
  );
}
