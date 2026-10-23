import type { LineCheckView, SendGateView } from '@ab/shared';
import { queryOptions, skipToken } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

/** GET /messages/gate: the effective send gate (env, WhatsApp config, kill switch) and the queue. */
export const sendGateQuery = queryOptions({
  queryKey: ['send-gate'],
  queryFn: () => apiFetch<SendGateView>('/messages/gate'),
});

/** POST /messaging/lines/check (admin): both WhatsApp lines as Meta reports them now; never prefetched. */
export const checkLines = () => apiSend<LineCheckView[]>('POST', '/messaging/lines/check');

/**
 * The last good lines check, shared through the query cache: LinesCard writes it after a click and
 * the template section reads the formatted numbers from it. Never fetched by itself (no Meta call).
 */
export const linesCheckQuery = queryOptions<LineCheckView[]>({
  queryKey: ['messaging', 'lines-check'],
  queryFn: skipToken,
  staleTime: Infinity,
});
