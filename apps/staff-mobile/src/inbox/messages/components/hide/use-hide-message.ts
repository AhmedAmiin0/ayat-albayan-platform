import { messageHideCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { refreshInbox } from '@/inbox/thread/hooks/inbox-sync';

const hides = messageHideCalls({ apiFetch, apiSend });

/** Staff only: nothing goes to WhatsApp; the placeholder comes from the API on re-read. */
export function useHideMessage(phone: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) =>
      (hide ? hides.hide : hides.unhide)({ phone, messageId: id }),
    onSettled: () => refreshInbox(client, phone),
  });
}
