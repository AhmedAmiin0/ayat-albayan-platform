import type { MessageView, SavedReplyStaged } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/core/lib/http/api';
import { appendMessage, removeMessage, type ThreadCache, threadKey, threadPath } from '../thread/hooks/thread-cache';
import type { StagedFile } from './use-saved-reply';

/**
 * A picked reply's attachment, sent after its text: POST /saved-replies/:id/stage copies it as this
 * sender's chat file, then the chat's own POST …/file sends it (every send gate stays). One
 * clientRequestId for both, minted when the reply was staged: a retry of the same send is the same
 * request (rule 8).
 */
async function sendStagedFile(input: { phone: string; replyId: string; id: string }): Promise<MessageView> {
  const staged = await apiSend<SavedReplyStaged>('POST', `/saved-replies/${input.replyId}/stage`, { clientRequestId: input.id });
  return apiSend<MessageView>('POST', `${threadPath(input.phone)}/file`, {
    clientRequestId: input.id,
    path: staged.path,
    filename: staged.filename,
  });
}

/** As useSendFile: the API's row joins the thread at once, then it refetches. */
export function useSendStagedFile(phone: string) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  return useMutation({
    mutationFn: (staged: StagedFile) => sendStagedFile({ phone, replyId: staged.replyId, id: staged.requestId }),
    onSuccess: (row) =>
      client.setQueryData<ThreadCache>(queryKey, (old) => appendMessage(removeMessage(old, row.id), row)),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}
