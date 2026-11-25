import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { MEETINGS_KEY } from '@/features/teaching/meetings/internal/internal-api';
import { cancelMeeting, meetingErrorText } from '@/features/teaching/meetings/invitees/meeting-invites-api';

const L = t.meetingInvites.list;

/** Creator or admin; the invitees' links stop working. */
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
