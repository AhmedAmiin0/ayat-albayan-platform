import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { InviteeViewRow } from './InviteeViewRow';
import { meetingInviteesQuery } from './meeting-invites-api';

const L = t.meetingInvites.list;

interface Props {
  meetingId: string;
  title: string;
  onClose: () => void;
}

/** «المدعوون» (creator or admin): GET /meetings/:id/invitees, each with its status and «أعد الإرسال». */
export function MeetingInviteesDialog({ meetingId, title, onClose }: Props) {
  const invitees = useQuery(meetingInviteesQuery(meetingId));
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
          <InviteeViewRow key={i.id} meetingId={meetingId} invitee={i} />
        ))}
      </ul>
    </Dialog>
  );
}
