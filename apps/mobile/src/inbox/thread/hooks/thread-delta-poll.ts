import { deltaSearch, mergeDelta, needsFullRead, THREAD_DELTA_MS } from '@ab/client-core';
import type { ThreadDelta } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { sendKey, threadKey, threadPath, type ThreadCache } from './thread-cache';

/** The poll's own key: outside threadKey, so a push's invalidation of the thread never runs it too. */
const deltaKey = (phone: string) => ['thread-delta', phone];

/**
 * An open chat's new messages and ticks (owner 2026-10-27): every THREAD_DELTA_MS while `live` (its
 * screen focused, its first page loaded; TanStack skips a tick while the app is in the background),
 * GET /threads/:phone?after=…&pending=… (~2 reads), folded into the cache by mergeDelta. A send or a
 * thread fetch in flight wins (its answer would overwrite the merge, or show a sent row twice beside
 * its provisional one); a delta with more rows than one page re-reads the whole thread instead.
 */
export function useThreadDeltaPoll(phone: string, live: boolean) {
  const client = useQueryClient();
  useQuery({
    queryKey: deltaKey(phone),
    queryFn: async () => {
      const queryKey = threadKey(phone);
      const search = deltaSearch(client.getQueryData<ThreadCache>(queryKey), Date.now());
      if (!search) return Date.now();
      const delta = await apiFetch<ThreadDelta>(`${threadPath(phone)}${search}`);
      if (client.isMutating({ mutationKey: sendKey(phone) }) + client.isFetching({ queryKey }) > 0) return Date.now();
      if (needsFullRead(delta)) void client.invalidateQueries({ queryKey });
      else client.setQueryData<ThreadCache>(queryKey, (old) => mergeDelta(old, delta));
      return Date.now();
    },
    enabled: live,
    // No fetch on open: the thread query just read the whole page.
    initialData: 0,
    staleTime: Infinity,
    gcTime: 0,
    meta: { noPersist: true },
    refetchInterval: live ? THREAD_DELTA_MS : false,
  });
}
