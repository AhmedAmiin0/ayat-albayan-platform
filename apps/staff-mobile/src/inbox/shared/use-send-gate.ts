import { messageStatusCalls } from '@ab/client-core';
import { messageStatusRoutes } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const status = messageStatusCalls({ apiFetch, apiSend });

/** One cache entry for the chat's note and the overview's send state. */
export function useSendGate() {
  return useQuery({ queryKey: pathKey(messageStatusRoutes.gate.path), queryFn: status.gate });
}
