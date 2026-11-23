import { CALLS_KEY, shouldRetry } from '@ab/client-core';
import { MutationCache, QueryClient, type Query } from '@tanstack/react-query';

export const STALE_MS = 30_000;

// The inbox and calls run their own polls, deltas and live patches tuned to staleTime 0; the
// app-wide defaults below must not slow them down or mark them stale under their own refresh.
const LIVE_ROOTS: readonly string[] = [
  'threads',
  'thread-delta',
  'thread-file',
  'thread-pdf',
  'reply-moved',
  'chat-lists',
  'saved-replies',
  ...CALLS_KEY,
];

const isLive = (query: Query): boolean => LIVE_ROOTS.includes(String(query.queryKey[0]));

/**
 * One staff-web QueryClient. After any successful write every other cached read is marked stale
 * without a refetch: a screen opened next reads fresh data, open screens stay as they are and
 * refresh through their own invalidations.
 */
export function createQueryClient(): QueryClient {
  const markStale = (): Promise<void> =>
    client.invalidateQueries({ refetchType: 'none', predicate: (q) => !isLive(q) });
  const client: QueryClient = new QueryClient({
    mutationCache: new MutationCache({ onSuccess: () => void markStale() }),
    defaultOptions: { queries: { staleTime: STALE_MS, retry: shouldRetry } },
  });
  for (const root of LIVE_ROOTS) client.setQueryDefaults([root], { staleTime: 0 });
  return client;
}
