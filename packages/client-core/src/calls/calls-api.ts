import type { ActiveCallView, CallConfigView, CallPermissionView, CallView, MessageView } from '@ab/shared';
import type { ApiClient } from '../http/index.js';

// WhatsApp voice calls (docs/28 §4), the routes both apps use. Everything but /calls/config answers 404
// while the setting is off, so every other query is enabled only once the config says `enabled`. The
// queries are plain TanStack Query options (no React here); each app spreads them into useQuery.

export const CALLS_KEY = ['calls'] as const;
/** While a call of mine is live the screen follows it closely; otherwise a slower poll catches rings. */
export const ACTIVE_POLL_MS = 3_000;
export const LIVE_POLL_MS = 1_500;

/** One poll of /calls/active and when it STARTED: a slow poll begun before a call existed must not read as «ended». */
export interface ActivePoll {
  startedAt: number;
  rows: ActiveCallView[];
}

/** What an app injects: its API client and how it makes an idempotency id. */
interface CallsApiDeps {
  client: ApiClient;
  requestId: () => string;
}

const enc = encodeURIComponent;

/** The steps of a call (each sent once: a failed connect is never retried). */
export function callSends({ client, requestId }: CallsApiDeps) {
  return {
    startCall: (body: { phone: string; sdp: string; clientRequestId: string }) => client.apiSend<ActiveCallView>('POST', '/calls', body),
    acceptCall: (id: string, sdp: string) => client.apiSend<ActiveCallView>('POST', `/calls/${enc(id)}/accept`, { sdp }),
    rejectCall: (id: string) => client.apiSend<ActiveCallView>('POST', `/calls/${enc(id)}/reject`),
    endCall: (id: string) => client.apiSend<ActiveCallView>('POST', `/calls/${enc(id)}/end`),
    requestCallPermission: (phone: string) =>
      client.apiSend<MessageView>('POST', `/calls/permission/${enc(phone)}/request`, { clientRequestId: requestId() }),
  };
}

export type CallSends = ReturnType<typeof callSends>;

/** The calls queries: the config, the active calls, a chat's calls (or the whole log) and a number's permission. */
export function callQueries(client: ApiClient) {
  return {
    callConfigQuery: {
      queryKey: [...CALLS_KEY, 'config'],
      queryFn: () => client.apiFetch<CallConfigView>('/calls/config'),
      staleTime: 60_000,
      retry: false,
    },
    /** Polled only while on and (mobile) the app is in the foreground (`polling`, default true). */
    activeCallsQuery: (input: { enabled: boolean; live: boolean; polling?: boolean }) => ({
      queryKey: [...CALLS_KEY, 'active'],
      queryFn: async (): Promise<ActivePoll> => {
        const startedAt = Date.now();
        return { startedAt, rows: await client.apiFetch<ActiveCallView[]>('/calls/active') };
      },
      enabled: input.enabled,
      refetchInterval: input.enabled && input.polling !== false ? (input.live ? LIVE_POLL_MS : ACTIVE_POLL_MS) : (false as const),
      retry: false,
    }),
    /** One chat's calls (merged into its messages), or the whole calls log when `phone` is null. */
    callListQuery: (input: { enabled: boolean; phone: string | null }) => ({
      queryKey: [...CALLS_KEY, 'list', input.phone ?? 'all'],
      queryFn: () => client.apiFetch<CallView[]>(input.phone ? `/calls?phone=${enc(input.phone)}&limit=50` : '/calls?limit=100'),
      enabled: input.enabled,
      refetchInterval: input.enabled ? 10_000 : (false as const),
      retry: false,
    }),
    callPermissionQuery: (phone: string) => ({
      queryKey: [...CALLS_KEY, 'permission', phone],
      queryFn: () => client.apiFetch<CallPermissionView>(`/calls/permission/${enc(phone)}`),
      staleTime: 0,
      retry: false,
    }),
  };
}
