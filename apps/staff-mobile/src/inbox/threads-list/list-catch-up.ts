import { LIVE_LIST_THROTTLE_MS, overlayPages } from '@ab/client-core';
import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { missedChange, rereadList, showList } from '@/inbox/thread/live';
import type { ThreadListCache } from '@/inbox/thread/hooks/thread-list-cache';
import { chatTicks, updatedAt } from './list-select';

/** The chats' ticks written into this list's cache, keeping its time (it was not read again). */
function liftTicks(client: QueryClient, queryKey: QueryKey): void {
  const at = updatedAt(client, queryKey);
  const lift = (old: ThreadListCache | undefined) => {
    const next = old && overlayPages(old, chatTicks(client, at));
    return next === old ? undefined : next;
  };
  client.setQueryData<ThreadListCache>(queryKey, lift, { updatedAt: at });
}

/** Read within the live throttle window: a return right after a read adds no second one. */
const justRead = (client: QueryClient, queryKey: QueryKey): boolean =>
  Date.now() - updatedAt(client, queryKey) < LIVE_LIST_THROTTLE_MS;

/**
 * Back on screen (the chat closed): the ticks the chat merged show at once, and a list that was
 * hidden reads again once. A change recorded while hidden (a send, an opened chat, an event:
 * list-marks.ts, docs/43 AU2) is not enough on its own: an event for another chat can be lost under
 * the chat (a channel rejoin gap, a quietly dead socket, so the list
 * looked stale), so coming back from hidden always reads, unless the list was just read.
 * The mark is a time, not TanStack's isInvalidated, so a read that lands or fails meanwhile and the
 * lift above never clear it. A first mount on screen keeps the mark-only gate (no extra read).
 * `head`: the list's page-1 read (readListHead), used for every read this starts.
 */
export function useListCatchUp(
  queryKey: QueryKey,
  focused: boolean,
  head?: () => Promise<void>,
): void {
  const client = useQueryClient();
  const wasHidden = useRef(false);
  useEffect(() => {
    if (!focused) {
      wasHidden.current = true;
      return undefined;
    }
    const back = wasHidden.current && !justRead(client, queryKey);
    wasHidden.current = false;
    const missed = back || missedChange(client, queryKey);
    liftTicks(client, queryKey);
    if (missed) void rereadList(client, queryKey, head);
    return showList(queryKey, head);
  }, [client, queryKey, focused, head]);
}
