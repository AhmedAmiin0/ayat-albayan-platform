import { INBOX_REFRESH_MS } from '@ab/client-core';
import type { ThreadDetail } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { leavesGap, mergeNewest, sendKey, threadKey, threadPath, type ThreadCache } from './thread-cache';

/** The poll's own key: outside threadKey, so a push's invalidation never refetches it too. */
const threadPollKey = (phone: string) => ['thread-poll', phone];

/**
 * An open chat shows new messages and ticks (owner 2026-10-27): every INBOX_REFRESH_MS while its screen
 * is focused and the app is active (TanStack skips an interval tick in the background, focusManager),
 * only the newest page (GET /threads/:phone), folded into the cache by mergeNewest; the loaded older
 * pages are not re-read. No fetch on open: the thread query just did it (staleTime Infinity).
 * A send or a thread fetch in flight wins (its answer would overwrite the merge, or show a sent row
 * twice beside its provisional one); too many new rows for one page re-read the whole thread instead.
 */
export function useThreadPoll(phone: string, loaded: boolean) {
  const client = useQueryClient();
  const focused = useScreenFocused();
  useQuery({
    queryKey: threadPollKey(phone),
    queryFn: async () => {
      const fresh = await apiFetch<ThreadDetail>(threadPath(phone));
      const queryKey = threadKey(phone);
      if (client.isMutating({ mutationKey: sendKey(phone) }) + client.isFetching({ queryKey }) > 0) return Date.now();
      if (leavesGap(client.getQueryData<ThreadCache>(queryKey), fresh)) void client.invalidateQueries({ queryKey });
      else client.setQueryData<ThreadCache>(queryKey, (old) => mergeNewest(old, fresh));
      return Date.now();
    },
    enabled: focused && loaded,
    initialData: 0,
    staleTime: Infinity,
    gcTime: 0,
    meta: { noPersist: true },
    refetchInterval: focused ? INBOX_REFRESH_MS : false,
  });
}
