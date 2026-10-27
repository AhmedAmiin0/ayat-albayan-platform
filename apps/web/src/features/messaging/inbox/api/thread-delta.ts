import { deltaSearch, mergeDelta, needsFullRead } from '@ab/client-core';
import type { ThreadDelta } from '@ab/shared';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';
import { INBOX_REFRESH_MS, threadPath, threadQuery } from './api';

/**
 * The open chat, live (owner 2026-10-27): threadQuery (a full read on open, on window focus and every
 * threadFullRefreshMs) plus a delta every INBOX_REFRESH_MS while the window has focus (the same W13
 * gating: a chat open in a background window never stamps new rows read) — GET /threads/:phone?after=…
 * (~2 reads), folded into the cache by mergeDelta. A thread fetch or a send in flight wins (its answer
 * would overwrite the merge); more new rows than one page re-read the whole thread instead.
 */
export function useLiveThread(phone: string) {
  const options = threadQuery(phone);
  const detail = useInfiniteQuery(options);
  const client = useQueryClient();
  const queryKey = options.queryKey;
  useQuery({
    // Outside ['threads']: a send's or an opened chat's invalidation never runs it.
    queryKey: ['thread-delta', phone],
    queryFn: async () => {
      const search = document.hasFocus() ? deltaSearch(client.getQueryData(queryKey), Date.now()) : null;
      if (!search) return Date.now();
      const asked = client.getQueryState(queryKey)?.dataUpdatedAt;
      const delta = await apiFetch<ThreadDelta>(`${threadPath(phone)}${search}`);
      const busy = client.isFetching({ queryKey }) + client.isMutating({ mutationKey: ['inbox-send', phone] }) > 0;
      // A full read that landed meanwhile is newer than this answer: keep it.
      if (busy || client.getQueryState(queryKey)?.dataUpdatedAt !== asked) return Date.now();
      if (needsFullRead(delta)) void client.invalidateQueries({ queryKey });
      else client.setQueryData(queryKey, (old) => mergeDelta(old, delta));
      return Date.now();
    },
    enabled: detail.isSuccess,
    // No fetch on open: the thread query just read the whole page.
    initialData: 0,
    staleTime: Infinity,
    gcTime: 0,
    refetchInterval: INBOX_REFRESH_MS,
  });
  return detail;
}
