import type { ApiClient } from '../../../core/http';
import { callReads } from './calls-api';
import type { ActiveCallsInput, ActivePoll, CallQueries } from './calls-api.types';
import { callsKeys } from './calls.keys';

// Everything but /calls/config answers 404 while calls are off, so every other query runs only once
// the config says `enabled`. Plain TanStack Query options (no React here); each app spreads them
// into useQuery.

/** While a call of mine is live the screen follows it closely; a slower poll catches rings. */
export const ACTIVE_POLL_MS = 3_000;
export const LIVE_POLL_MS = 1_500;
const LOG_POLL_MS = 10_000;
const CONFIG_STALE_MS = 60_000;

const ACTIVE_EVERY = { live: LIVE_POLL_MS, idle: ACTIVE_POLL_MS } as const;

const pollsActive = (input: ActiveCallsInput): boolean => input.enabled && input.polling !== false;

const activeEvery = (input: ActiveCallsInput): number | false =>
  pollsActive(input) && ACTIVE_EVERY[input.live ? 'live' : 'idle'];

/** One chat's last 50 calls, or the newest 100 of the whole log. */
const listQuery = (phone: string | null) => (phone ? { phone, limit: 50 } : { limit: 100 });

/** The config, the active calls, a chat's calls (or the whole log) and a number's permission. */
export function callQueries(client: ApiClient): CallQueries {
  const reads = callReads(client);
  return {
    callConfigQuery: {
      queryKey: callsKeys.config,
      queryFn: reads.config,
      staleTime: CONFIG_STALE_MS,
      retry: false,
    },
    activeCallsQuery: (input) => ({
      queryKey: callsKeys.active,
      // poll: a ring must show while realtime is unreachable (docs/28 §9).
      queryFn: async (): Promise<ActivePoll> => {
        const startedAt = Date.now();
        return { startedAt, rows: await reads.active() };
      },
      enabled: input.enabled,
      refetchInterval: activeEvery(input),
      retry: false,
    }),
    /** One chat's calls (merged into its messages), or the whole calls log when `phone` is null. */
    callListQuery: (input) => ({
      queryKey: callsKeys.list(input.phone),
      queryFn: () => reads.list(listQuery(input.phone)),
      enabled: input.enabled,
      refetchInterval: input.enabled && LOG_POLL_MS,
      retry: false,
    }),
    callPermissionQuery: (phone) => ({
      queryKey: callsKeys.permission(phone),
      queryFn: () => reads.permission(phone),
      staleTime: 0,
      retry: false,
    }),
  };
}
