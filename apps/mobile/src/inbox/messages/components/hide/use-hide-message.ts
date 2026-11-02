import { threadHidePath } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/core/lib/http/api';
import { refreshInbox } from '@/inbox/thread/hooks/inbox-sync';

/**
 * «حذف من المنصة» (POST) / «إظهار» (DELETE) on one WhatsApp bubble (owner 2026-10-30). Staff only:
 * nothing goes to WhatsApp. The open chat re-reads, so the placeholder comes from the API.
 */
export function useHideMessage(phone: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) =>
      apiSend<unknown>(hide ? 'POST' : 'DELETE', threadHidePath(phone, id)),
    onSettled: () => refreshInbox(client, phone),
  });
}
