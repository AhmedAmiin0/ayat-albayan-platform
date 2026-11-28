import {
  callsRoutes,
  type ActiveCallView,
  type StartCallInput,
} from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';

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

/** One chat's last 50 calls, or the newest 100 of the whole log. */
const listQuery = (phone: string | null) => (phone ? { phone, limit: 50 } : { limit: 100 });

/** The steps of a call (each sent once: a failed connect is never retried). */
export function callSends({ client, requestId }: CallsApiDeps) {
  const call = callWith(client);
  return {
    startCall: (body: StartCallInput) => call({ route: callsRoutes.start, body }),
    acceptCall: (id: string, sdp: string) =>
      call({ route: callsRoutes.accept, params: { id }, body: { sdp } }),
    rejectCall: (id: string) => call({ route: callsRoutes.reject, params: { id } }),
    endCall: (id: string) => call({ route: callsRoutes.end, params: { id } }),
    requestCallPermission: (phone: string) =>
      call({
        route: callsRoutes.permissionRequest,
        params: { phone },
        body: { clientRequestId: requestId() },
      }),
  };
}

export type CallSends = ReturnType<typeof callSends>;

/** The calls queries: the config, the active calls, a chat's calls (or the whole log) and a number's permission. */
export function callQueries(client: ApiClient) {
  const call = callWith(client);
  return {
    callConfigQuery: {
      queryKey: [...CALLS_KEY, 'config'],
      queryFn: () => call({ route: callsRoutes.config }),
      staleTime: 60_000,
      retry: false,
    },
    /** Polled only while on and (mobile) the app is in the foreground (`polling`, default true). */
    activeCallsQuery: (input: { enabled: boolean; live: boolean; polling?: boolean }) => ({
      queryKey: [...CALLS_KEY, 'active'],
      queryFn: async (): Promise<ActivePoll> => {
        const startedAt = Date.now();
        return { startedAt, rows: await call({ route: callsRoutes.active }) };
      },
      enabled: input.enabled,
      refetchInterval: input.enabled && input.polling !== false ? (input.live ? LIVE_POLL_MS : ACTIVE_POLL_MS) : (false as const),
      retry: false,
    }),
    /** One chat's calls (merged into its messages), or the whole calls log when `phone` is null. */
    callListQuery: (input: { enabled: boolean; phone: string | null }) => ({
      queryKey: [...CALLS_KEY, 'list', input.phone ?? 'all'],
      queryFn: () => call({ route: callsRoutes.list, query: listQuery(input.phone) }),
      enabled: input.enabled,
      refetchInterval: input.enabled ? 10_000 : (false as const),
      retry: false,
    }),
    callPermissionQuery: (phone: string) => ({
      queryKey: [...CALLS_KEY, 'permission', phone],
      queryFn: () => call({ route: callsRoutes.permission, params: { phone } }),
      staleTime: 0,
      retry: false,
    }),
  };
}
