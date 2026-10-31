import { threadHidePath } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/http/api';
import { threadQuery } from '@/features/messaging/inbox/api/api';

/**
 * POST hides, DELETE shows again; the open chat re-reads after either. Nothing goes to WhatsApp.
 */
export function useHide(phone: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: threadQuery(phone).queryKey });
  const hide = useMutation({
    mutationFn: (id: string) => apiSend<unknown>('POST', threadHidePath(phone, id)),
    onSuccess: refresh,
  });
  const unhide = useMutation({
    mutationFn: (id: string) => apiSend<unknown>('DELETE', threadHidePath(phone, id)),
    onSuccess: refresh,
  });
  return { hide, unhide, failed: hide.isError || unhide.isError };
}
