import { deltaSearch, INBOX_REFRESH_MS, mergeDelta, needsFullRead, THREAD_FULL_MS } from '@ab/client-core';
import type { ThreadDelta, ThreadDetail } from '@ab/shared';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { leavesGap, mergeNewest, sendKey, threadKey, threadPath, type ThreadCache } from './thread-cache';

/** The polls' own keys: outside threadKey, so a push's invalidation never runs them too. */
const threadPollKey = (phone: string) => ['thread-poll', phone];
const threadDeltaKey = (phone: string) => ['thread-delta', phone];

/** A send or a thread fetch in flight wins: its answer would overwrite a merge, or show a sent row twice. */
const busy = (client: QueryClient, phone: string) =>
  client.isMutating({ mutationKey: sendKey(phone) }) + client.isFetching({ queryKey: threadKey(phone) }) > 0;

/** Polls that run on their own timer while live; no fetch on open (the thread query just read the page). */
const POLL = { initialData: 0, staleTime: Infinity, gcTime: 0, meta: { noPersist: true } } as const;

/**
 * An open chat shows new messages and ticks (owner 2026-10-27) while its screen is focused and the app
 * is active (TanStack skips an interval tick in the background, focusManager):
 *   every INBOX_REFRESH_MS  a delta, GET /threads/:phone?after=…&pending=… (~2 reads), merged by mergeDelta;
 *   every THREAD_FULL_MS    the newest page (GET /threads/:phone), folded in by mergeNewest; the loaded
 *                           older pages are not re-read.
 * Too many new rows for one answer (a gap) re-read the whole thread instead.
 */
export function useThreadPoll(phone: string, loaded: boolean) {
  const client = useQueryClient();
  const live = useScreenFocused() && loaded;
  const queryKey = threadKey(phone);
  useQuery({
    queryKey: threadDeltaKey(phone),
    queryFn: async () => {
      const search = deltaSearch(client.getQueryData<ThreadCache>(queryKey), Date.now());
      if (!search) return Date.now();
      const delta = await apiFetch<ThreadDelta>(`${threadPath(phone)}${search}`);
      if (busy(client, phone)) return Date.now();
      if (needsFullRead(delta)) void client.invalidateQueries({ queryKey });
      else client.setQueryData<ThreadCache>(queryKey, (old) => mergeDelta(old, delta));
      return Date.now();
    },
    ...POLL,
    enabled: live,
    refetchInterval: live ? INBOX_REFRESH_MS : false,
  });
  useQuery({
    queryKey: threadPollKey(phone),
    queryFn: async () => {
      const fresh = await apiFetch<ThreadDetail>(threadPath(phone));
      if (busy(client, phone)) return Date.now();
      if (leavesGap(client.getQueryData<ThreadCache>(queryKey), fresh)) void client.invalidateQueries({ queryKey });
      else client.setQueryData<ThreadCache>(queryKey, (old) => mergeNewest(old, fresh));
      return Date.now();
    },
    ...POLL,
    enabled: live,
    refetchInterval: live ? THREAD_FULL_MS : false,
  });
}
