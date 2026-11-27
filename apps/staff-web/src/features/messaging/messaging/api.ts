import { lineCheckCalls } from '@ab/client-core';
import type { LineCheckView, SendGateView } from '@ab/shared';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { messagingKeys } from '@/features/messaging/keys';

const lines = lineCheckCalls({ apiFetch, apiSend });

/** GET /messages/gate: the effective send gate (env, WhatsApp config, kill switch) and the queue. */
export const sendGateQuery = queryOptions({
  queryKey: messagingKeys.sendGate(),
  queryFn: () => apiFetch<SendGateView>('/messages/gate'),
});

/** Both WhatsApp lines as their provider reports them now (admin); never prefetched. */
export const checkLines = lines.check;

/**
 * The last good lines check, shared through the query cache: LinesCard writes it after a click and
 * the template section reads the formatted numbers from it. Never fetched by itself (no Meta call).
 */
export const linesCheckQuery = queryOptions<LineCheckView[]>({
  queryKey: messagingKeys.linesCheck(),
  queryFn: skipToken,
  staleTime: Infinity,
});
