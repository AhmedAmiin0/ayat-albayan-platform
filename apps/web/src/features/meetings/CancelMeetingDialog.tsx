import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { MEETINGS_KEY } from './internal-api';
import { cancelMeeting, meetingErrorText } from './meeting-invites-api';

const L = t.meetingInvites.list;

/** «ألغِ الاجتماع» confirm (creator or admin): POST /meetings/:id/cancel; the invitees' links stop working. */
export function CancelMeetingDialog({ meetingId, onClose }: { meetingId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: cancelMeeting,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MEETINGS_KEY });
      onClose();
    },
  });
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>{L.keep}</Button>
      <Button type="button" variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate(meetingId)}>
        {L.cancel}
      </Button>
    </>
  );
  return (
    <Dialog compact title={L.cancel} onClose={onClose} actions={actions}>
      <p className="text-body">{L.cancelConfirm}</p>
      {cancel.isError && <FormAlert>{meetingErrorText(cancel.error)}</FormAlert>}
    </Dialog>
  );
}
