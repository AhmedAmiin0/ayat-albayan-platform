import type { ForwardResponse, ThreadForward } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiSend } from '@/lib/api';
import { requestId } from '@/lib/request-id';

/**
 * POST /threads/forward: one message to 1–5 chats, each answered on its own (sent, or skipped and why).
 * Every chat's cache (the list and the threads, ours too) refetches after.
 */
export function useForward() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ThreadForward) => apiSend<ForwardResponse>('POST', '/threads/forward', body),
    onSettled: () => client.invalidateQueries({ queryKey: ['threads'] }),
  });
}

/**
 * The clientRequestId of a forward (rule 8): the same message to the same chats again (after an error)
 * reuses it, so a lost answer never sends twice; another pick gets a new one.
 */
export function useForwardId(): (messageId: string, targets: readonly string[]) => string {
  const last = useRef<{ key: string; id: string } | null>(null);
  return (messageId, targets) => {
    const key = JSON.stringify([messageId, targets]);
    if (last.current?.key !== key) last.current = { key, id: requestId() };
    return last.current.id;
  };
}
