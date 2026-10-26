import type { ActiveCallView, CallConfigView, CallPermissionView, CallView, MessageView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

// WhatsApp voice calls (docs/28 §4). Everything but /calls/config answers 404 while the setting is
// off, so every other query is enabled only once the config says `enabled`.

export const CALLS_KEY = ['calls'] as const;
/** While a call of mine is live the screen follows it closely; otherwise a slower poll catches rings. */
export const ACTIVE_POLL_MS = 3_000;
export const LIVE_POLL_MS = 1_500;

const enc = encodeURIComponent;

export const callConfigQuery = queryOptions({
  queryKey: [...CALLS_KEY, 'config'],
  queryFn: () => apiFetch<CallConfigView>('/calls/config'),
  staleTime: 60_000,
  retry: false,
});

/** One poll of /calls/active and when it STARTED: a slow poll begun before a call existed must not read as «ended». */
export interface ActivePoll {
  startedAt: number;
  rows: ActiveCallView[];
}

export const activeCallsQuery = (input: { enabled: boolean; live: boolean }) =>
  queryOptions({
    queryKey: [...CALLS_KEY, 'active'],
    queryFn: async (): Promise<ActivePoll> => {
      const startedAt = Date.now();
      return { startedAt, rows: await apiFetch<ActiveCallView[]>('/calls/active') };
    },
    enabled: input.enabled,
    refetchInterval: input.enabled ? (input.live ? LIVE_POLL_MS : ACTIVE_POLL_MS) : false,
    retry: false,
  });

/** One chat's calls (merged into its log), or the whole calls log when `phone` is null. */
export const callListQuery = (input: { enabled: boolean; phone: string | null }) =>
  queryOptions({
    queryKey: [...CALLS_KEY, 'list', input.phone ?? 'all'],
    queryFn: () => apiFetch<CallView[]>(input.phone ? `/calls?phone=${enc(input.phone)}&limit=50` : '/calls?limit=100'),
    enabled: input.enabled,
    refetchInterval: input.enabled ? 10_000 : false,
    retry: false,
  });

export const callPermissionQuery = (phone: string) =>
  queryOptions({
    queryKey: [...CALLS_KEY, 'permission', phone],
    queryFn: () => apiFetch<CallPermissionView>(`/calls/permission/${enc(phone)}`),
    staleTime: 0,
    retry: false,
  });

export const startCall = (body: { phone: string; sdp: string; clientRequestId: string }) =>
  apiSend<ActiveCallView>('POST', '/calls', body);

export const acceptCall = (id: string, sdp: string) => apiSend<ActiveCallView>('POST', `/calls/${enc(id)}/accept`, { sdp });

export const rejectCall = (id: string) => apiSend<ActiveCallView>('POST', `/calls/${enc(id)}/reject`);

export const endCall = (id: string) => apiSend<ActiveCallView>('POST', `/calls/${enc(id)}/end`);

export const requestCallPermission = (phone: string) =>
  apiSend<MessageView>('POST', `/calls/permission/${enc(phone)}/request`, { clientRequestId: crypto.randomUUID() });
