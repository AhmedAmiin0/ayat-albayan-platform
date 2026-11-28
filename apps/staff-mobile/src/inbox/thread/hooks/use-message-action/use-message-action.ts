import { messageStatusCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { refreshInbox } from '@/inbox/thread/hooks/inbox-sync';
import { replaceMessage, threadKey, type ThreadCache } from '@/inbox/thread/hooks/thread-cache';

const status = messageStatusCalls({ apiFetch, apiSend });

/** app-send gives the row a short pending window (docs/19). */
const ACTIONS = {
  retry: status.retry,
  'sent-manually': status.sentManually,
  'hand-off': status.handOff,
  'app-send': status.appSend,
};
type MessageAction = keyof typeof ACTIONS;

/**
 * Retry (failed → queued), sent manually (the admin sent it from WhatsApp, so the sender never
 * sends it again) or hand-off (wa.me opened: held until one of the other two).
 * Not optimistic: the API decides the new state.
 */
export function useMessageAction(phone: string, action: MessageAction) {
  const client = useQueryClient();
  const queryKey = threadKey(phone);
  return useMutation({
    mutationFn: ACTIONS[action],
    onSuccess: (row) =>
      client.setQueryData<ThreadCache>(queryKey, (old) => replaceMessage(old, row.id, row)),
    onSettled: () => refreshInbox(client, phone),
  });
}
