import { type ChatPages, chatStatus, overlayPage, type StatusOf } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import { type QueryClient, type QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';
import { threadsQuery } from './api';
import { threadQuery } from './thread-query';

// The owner's pending tick (docs/43 §2, 43-1), web: the open chat merges ✓ / ✓✓ (delta, full read)
// while the list beside it may still hold an older answer. A list row takes the tick its chat
// holds for the same last message when it is further along; failed / by hand come from the list.

/** A cached GET /threads page (the other fields ride along untouched). */
interface ListPage {
  items: ThreadView[];
}

const updatedAt = (client: QueryClient, queryKey: QueryKey) =>
  client.getQueryState(queryKey)?.dataUpdatedAt ?? 0;

/**
 * The tick a chat cache holds for a list row's last message, only from a chat read after the list
 * (`since`): an older chat copy never overrides a newer list answer (a message the server
 * re-queued on a retry).
 */
const chatTicks =
  (client: QueryClient, since: number): StatusOf =>
  (row) => {
    const key = threadQuery(row.phone_e164).queryKey;
    const chat = updatedAt(client, key) > since ? client.getQueryData(key) : undefined;
    return chatStatus(chat, row.last_message_id);
  };

/** GET /threads (threadsQuery) whose rows never show a tick behind a newer chat read's. */
export function useThreads(s: InboxSearch) {
  const client = useQueryClient();
  const options = threadsQuery(s);
  const since = () => updatedAt(client, options.queryKey);
  return useQuery({ ...options, select: (page) => overlayPage(page, chatTicks(client, since())) });
}

/** A list's ticks written in place: its time and its «stale» mark stay (it was not read again). */
function writeTicks(client: QueryClient, queryKey: QueryKey, page: ListPage): void {
  const state = client.getQueryState(queryKey);
  client.setQueryData(queryKey, page, { updatedAt: state?.dataUpdatedAt });
  if (state?.isInvalidated) void client.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
}

/**
 * Every cached chats list read before the open chat's latest read follows its ticks as soon as
 * the chat merges them; a list read after it is newer and keeps its own.
 */
export function useTicksInLists(phone: string, chat: ChatPages | undefined): void {
  const client = useQueryClient();
  useEffect(() => {
    const chatAt = updatedAt(client, threadQuery(phone).queryKey);
    const statusOf: StatusOf = (row) => chatStatus(chat, row.last_message_id);
    const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
    for (const [queryKey, page] of lists) {
      const older = updatedAt(client, queryKey) < chatAt;
      const next = page && older ? overlayPage(page, statusOf) : page;
      if (next && next !== page) writeTicks(client, queryKey, next);
    }
  }, [client, phone, chat]);
}
