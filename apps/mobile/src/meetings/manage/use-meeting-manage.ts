import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { endMeeting, newMeetingLink } from './api';
import { cancelMeeting } from '@/meetings/invite/invite-api';
import { inviteError } from '@/meetings/invite/invite-text';
import { meetingError } from './meeting-text';

export type Asking = 'end' | 'link' | 'cancel';

/**
 * End, a new link and cancel, each behind an inline confirm: which one is asking, its strip
 * (question, verb, run, busy), the fresh link, and the refusal in words. One at a time.
 */
export function useMeetingManage(id: string) {
  const [asking, setAsking] = useState<Asking | null>(null);
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['meetings'] });
  const settle = { onSettled: () => setAsking(null) };
  const end = useMutation({ mutationFn: endMeeting, onSuccess: refresh, ...settle });
  // A refused cancel (e.g. 410 meeting_ended) refreshes too, so the stale cancel button goes.
  const cancel = useMutation({ mutationFn: cancelMeeting, onSuccess: refresh, onError: refresh, ...settle });
  const link = useMutation({ mutationFn: newMeetingLink, ...settle });
  const confirms = {
    end: { message: t.mobileClassroom.endConfirm, label: t.mobileClassroom.endAction, run: () => end.mutate(id), busy: end.isPending, danger: true },
    link: { message: t.mobileClassroom.newLinkConfirm, label: t.mobileClassroom.newLinkAction, run: () => link.mutate(id), busy: link.isPending, danger: false },
    cancel: { message: t.meetingInvites.list.cancelConfirm, label: t.meetingInvites.list.cancel, run: () => cancel.mutate(id), busy: cancel.isPending, danger: true },
  };
  const ask = (next: Asking | null) => {
    end.reset();
    link.reset();
    cancel.reset();
    setAsking(next);
  };
  const plain = end.error ?? link.error;
  const failed = plain ? meetingError(plain, cycle, tz) : null;
  const error = cancel.error ? inviteError(cancel.error) : failed;
  const confirm = asking ? confirms[asking] : null;
  return { confirm, ask, close: () => setAsking(null), newUrl: link.data?.url ?? null, error };
}
