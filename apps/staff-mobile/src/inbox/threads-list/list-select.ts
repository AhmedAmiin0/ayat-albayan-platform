import {
  chatStatus,
  furtherOf,
  overlayPages,
  type StatusOf,
  storedMessageStatus,
  storedStatus,
  withStoredThreads,
} from '@ab/client-core';
import type { SyncMessage, ThreadView } from '@ab/shared';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { type ThreadCache, threadKey } from '@/inbox/thread/hooks/thread-cache';
import type { ThreadListCache } from '@/inbox/thread/hooks/thread-list-cache';

// The owner's pending tick (docs/43 §2, 43-1) and the late list: the list row takes what the
// chat and the phone store already hold over its last read, as a derived view (the cache keeps
// the read).

export const updatedAt = (client: QueryClient, queryKey: QueryKey): number =>
  client.getQueryState(queryKey)?.dataUpdatedAt ?? 0;

/**
 * The tick a chat cache holds for a list row's last message, only from a chat read after the list
 * (`since`): an older chat copy (a closed chat on disk) never overrides a newer list answer, e.g.
 * a retry that took a delivered message back to queued.
 */
export const chatTicks =
  (client: QueryClient, since: number): StatusOf =>
  (row) => {
    const key = threadKey(row.phone_e164);
    const newer = updatedAt(client, key) > since;
    const chat = newer ? client.getQueryData<ThreadCache>(key) : undefined;
    return chatStatus(chat, row.last_message_id);
  };

/** The phone store's view (docs/43 43-7; empty without one). */
interface StoredList {
  /** Its chats-list rows by phone. */
  threads: ReadonlyMap<string, ThreadView>;
  /** The stored rows of a chat it holds in memory. */
  chat: (phone: string) => readonly SyncMessage[];
}

/** A list row's tick: the furthest along of the open chat's, the stored row's and message's. */
const listTicks = (client: QueryClient, since: number, stored: StoredList): StatusOf =>
  furtherOf(
    furtherOf(chatTicks(client, since), storedStatus(stored.threads)),
    storedMessageStatus(stored.chat),
  );

/**
 * The list query's select: a chat the store holds with a newer last message (one received since
 * the read) on top with its preview and unread count, and never a tick behind the chat's or the
 * store's.
 */
export const withStoredList =
  (client: QueryClient, queryKey: QueryKey, stored: StoredList) => (data: ThreadListCache) =>
    overlayPages(
      withStoredThreads(data, stored.threads),
      listTicks(client, updatedAt(client, queryKey), stored),
    );
