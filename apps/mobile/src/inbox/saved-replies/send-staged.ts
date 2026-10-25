import type { MessageView, SavedReplyStaged } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api';
import { requestId } from '@/lib/request-id';
import { appendMessage, removeMessage, type ThreadCache, threadKey, threadPath } from '../thread-cache';

/**
 * A picked reply's attachment, sent after its text: POST /saved-replies/:id/stage copies it as this
 * sender's chat file, then the chat's own POST …/file sends it (every send gate stays). One
 * clientRequestId for both: a retry of the same send is the same request (rule 8).
 */
export async function sendStagedFile(input: { phone: string; replyId: string; id: string }): Promise<MessageView> {
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
    mutationFn: (replyId: string) => sendStagedFile({ phone, replyId, id: requestId() }),
    onSuccess: (row) =>
      client.setQueryData<ThreadCache>(queryKey, (old) => appendMessage(removeMessage(old, row.id), row)),
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
}
