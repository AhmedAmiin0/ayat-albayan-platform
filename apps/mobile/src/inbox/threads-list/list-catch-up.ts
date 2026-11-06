import { chatStatus, overlayPages, type StatusOf } from '@ab/client-core';
import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { showList } from '@/inbox/thread/hooks/inbox-sync';
import { type ThreadCache, threadKey } from '@/inbox/thread/hooks/thread-cache';
import type { ThreadListCache } from '@/inbox/thread/hooks/thread-list-cache';

// The owner's pending tick (docs/43 §2, 43-1): the chat merges ✓ / ✓✓ while the list under it
// waits. The list row takes the tick the chat holds for the same last message when it is further
// along.

/** The tick the cached chat holds for a list row's last message (undefined: chat not loaded). */
const chatTicks =
  (client: QueryClient): StatusOf =>
  (row) =>
    chatStatus(client.getQueryData<ThreadCache>(threadKey(row.phone_e164)), row.last_message_id);

/** The list query's select: a list answer never shows a tick behind its chat's. */
export const withChatTicks = (client: QueryClient) => (data: ThreadListCache) =>
  overlayPages(data, chatTicks(client));

/** The chats' ticks written into this list's cache, keeping its time (it was not read again). */
function liftTicks(client: QueryClient, queryKey: QueryKey): void {
  const updatedAt = client.getQueryState(queryKey)?.dataUpdatedAt;
  const lift = (old: ThreadListCache | undefined) => {
    const next = old && overlayPages(old, chatTicks(client));
    return next === old ? undefined : next;
  };
  client.setQueryData<ThreadListCache>(queryKey, lift, { updatedAt });
}

/**
 * Back on screen (the chat closed): the ticks the chat merged show at once, and a list marked stale
 * while hidden (a send, an opened chat: refreshLists, docs/43 AU2) reads again. A read already in
 * flight was just started by the realtime catch-up (cancelling the older one), so it is joined.
 */
export function useListCatchUp(queryKey: QueryKey, focused: boolean): void {
  const client = useQueryClient();
  useEffect(() => {
    if (!focused) return undefined;
    const stale = client.getQueryState(queryKey)?.isInvalidated === true;
    liftTicks(client, queryKey);
    if (stale) void client.refetchQueries({ queryKey, exact: true }, { cancelRefetch: false });
    return showList();
  }, [client, queryKey, focused]);
}
