import { chatStatus, furtherOf, overlayPages, type StatusOf, storedStatus } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { missedChange, rereadList, showList } from '@/inbox/thread/live';
import { type ThreadCache, threadKey } from '@/inbox/thread/hooks/thread-cache';
import type { ThreadListCache } from '@/inbox/thread/hooks/thread-list-cache';

// The owner's pending tick (docs/43 §2, 43-1): the chat merges ✓ / ✓✓ while the list under it
// waits. The list row takes the tick the chat holds for the same last message when it is further
// along.

const updatedAt = (client: QueryClient, queryKey: QueryKey) =>
  client.getQueryState(queryKey)?.dataUpdatedAt ?? 0;

/**
 * The tick a chat cache holds for a list row's last message, only from a chat read after the list
 * (`since`): an older chat copy (a closed chat on disk) never overrides a newer list answer, e.g.
 * a retry that took a delivered message back to queued.
 */
const chatTicks =
  (client: QueryClient, since: number): StatusOf =>
  (row) => {
    const key = threadKey(row.phone_e164);
    const newer = updatedAt(client, key) > since;
    const chat = newer ? client.getQueryData<ThreadCache>(key) : undefined;
    return chatStatus(chat, row.last_message_id);
  };

/** Stored chats-list rows by phone (the phone store, docs/43 43-7; empty without one). */
type Stored = ReadonlyMap<string, ThreadView>;

/** A list row's tick: the further along of the open chat's and the phone store's. */
const listTicks = (client: QueryClient, since: number, stored: Stored): StatusOf =>
  furtherOf(chatTicks(client, since), storedStatus(stored));

/** The list query's select: never a tick behind a chat read's or the phone store's. */
export const withChatTicks =
  (client: QueryClient, queryKey: QueryKey, stored: Stored) => (data: ThreadListCache) =>
    overlayPages(data, listTicks(client, updatedAt(client, queryKey), stored));

/** The chats' ticks written into this list's cache, keeping its time (it was not read again). */
function liftTicks(client: QueryClient, queryKey: QueryKey): void {
  const at = updatedAt(client, queryKey);
  const lift = (old: ThreadListCache | undefined) => {
    const next = old && overlayPages(old, chatTicks(client, at));
    return next === old ? undefined : next;
  };
  client.setQueryData<ThreadListCache>(queryKey, lift, { updatedAt: at });
}

/**
 * Back on screen (the chat closed): the ticks the chat merged show at once, and a list that missed
 * a change while hidden (a send, an opened chat, an event: list-marks.ts, docs/43 AU2) reads again.
 * The mark is a time, not TanStack's isInvalidated, so a read that lands or fails meanwhile and the
 * lift above never clear it.
 */
export function useListCatchUp(queryKey: QueryKey, focused: boolean): void {
  const client = useQueryClient();
  useEffect(() => {
    if (!focused) return undefined;
    const missed = missedChange(client, queryKey);
    liftTicks(client, queryKey);
    if (missed) void rereadList(client, queryKey);
    return showList(queryKey);
  }, [client, queryKey, focused]);
}
