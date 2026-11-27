import { messageHideCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { threadQuery } from '@/features/messaging/inbox/api/thread-query';
import { refreshAnchored } from '@/features/messaging/inbox/api/anchored';

const hides = messageHideCalls({ apiFetch, apiSend });

/**
 * Hiding and showing again; the open chat re-reads after either. Nothing goes to WhatsApp.
 */
export function useHide(phone: string) {
  const client = useQueryClient();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: threadQuery(phone).queryKey }),
      refreshAnchored(client, phone),
    ]);
  const hide = useMutation({
    mutationFn: (messageId: string) => hides.hide({ phone, messageId }),
    onSuccess: refresh,
  });
  const unhide = useMutation({
    mutationFn: (messageId: string) => hides.unhide({ phone, messageId }),
    onSuccess: refresh,
  });
  return { hide, unhide, failed: hide.isError || unhide.isError };
}
