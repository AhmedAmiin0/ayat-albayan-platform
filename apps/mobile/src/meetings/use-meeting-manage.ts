import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { endMeeting, newMeetingLink } from './api';
import { cancelMeeting } from './invite-api';
import { inviteError } from './invite-text';
import { meetingError } from './meeting-text';

export type Asking = 'end' | 'link' | 'cancel';

/**
 * End, a new link and cancel, each behind an inline confirm: which one is asking, its strip
 * (question, verb, run, busy), the fresh link, and the refusal in words. One at a time.
 */
export function useMeetingManage(id: string) {
  const [asking, setAsking] = useState<Asking | null>(null);
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['meetings'] });
  const settle = { onSettled: () => setAsking(null) };
  const end = useMutation({ mutationFn: endMeeting, onSuccess: refresh, ...settle });
  const cancel = useMutation({ mutationFn: cancelMeeting, onSuccess: refresh, ...settle });
  const link = useMutation({ mutationFn: newMeetingLink, ...settle });
  const confirms = {
    end: { message: t.mobileClassroom.endConfirm, label: t.mobileClassroom.endAction, run: () => end.mutate(id), busy: end.isPending },
    link: { message: t.mobileClassroom.newLinkConfirm, label: t.mobileClassroom.newLinkAction, run: () => link.mutate(id), busy: link.isPending },
    cancel: { message: t.meetingInvites.list.cancelConfirm, label: t.meetingInvites.list.cancel, run: () => cancel.mutate(id), busy: cancel.isPending },
  };
  const ask = (next: Asking | null) => {
    end.reset();
    link.reset();
    cancel.reset();
    setAsking(next);
  };
  const plain = end.error ?? link.error;
  const error = cancel.error ? inviteError(cancel.error) : plain ? meetingError(plain) : null;
  const confirm = asking ? confirms[asking] : null;
  return { confirm, ask, close: () => setAsking(null), newUrl: link.data?.url ?? null, error };
}
