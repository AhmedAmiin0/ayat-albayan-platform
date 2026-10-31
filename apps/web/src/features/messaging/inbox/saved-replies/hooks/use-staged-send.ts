import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { sendFile } from '../../api/api.files';
import { sendErrorCode } from '../../composer/lib/send-error';
import { sendStart, settleOwnSend } from '../../composer/lib/send-start';
import { stageReply } from '../lib/api';
import { getStaged, setStaged, type Staged } from '../lib/staged-store';

/**
 * The staged attachment after its text: POST /saved-replies/:id/stage copies it as the sender's chat
 * file, then the chat's own POST /threads/:phone/file sends it (every send gate stays). It shares the
 * chat's send lock (mutationKey); a failure keeps the chip with its reason and request id for a retry.
 */
export function useStagedSend(phone: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['inbox-send', phone],
    mutationFn: async (s: Staged) => {
      const staged = await stageReply({ id: s.replyId, clientRequestId: s.requestId });
      return sendFile({ phone, clientRequestId: s.requestId, path: staged.path, filename: staged.filename });
    },
    onMutate: sendStart,
    onSuccess: async (view, s, start) => {
      settleOwnSend(phone, view.id, start);
      if (getStaged(phone)?.requestId === s.requestId) setStaged(phone, null);
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
    onError: async (e, s) => {
      if (getStaged(phone)?.requestId === s.requestId) setStaged(phone, { ...s, failed: sendErrorCode(e) });
      if (errorCode(e) === 'session_closed') await queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
