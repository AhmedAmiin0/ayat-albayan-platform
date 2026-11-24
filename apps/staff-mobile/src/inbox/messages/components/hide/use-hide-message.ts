import { threadHidePath } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@ab/mobile-kit';
import { refreshInbox } from '@/inbox/thread/hooks/inbox-sync';

/** Staff only: nothing goes to WhatsApp; the placeholder comes from the API on re-read. */
export function useHideMessage(phone: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) =>
      apiSend<unknown>(hide ? 'POST' : 'DELETE', threadHidePath(phone, id)),
    onSettled: () => refreshInbox(client, phone),
  });
}
