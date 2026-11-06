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

/** The tick the cached chat holds for a list row's last message (undefined: chat not loaded). */
const chatTicks =
  (client: QueryClient): StatusOf =>
  (row) =>
    chatStatus(client.getQueryData(threadQuery(row.phone_e164).queryKey), row.last_message_id);

/** GET /threads (threadsQuery) whose rows never show a tick behind their chat's. */
export function useThreads(s: InboxSearch) {
  const client = useQueryClient();
  return useQuery({ ...threadsQuery(s), select: (page) => overlayPage(page, chatTicks(client)) });
}

/** A list's ticks written in place: its time and its «stale» mark stay (it was not read again). */
function writeTicks(client: QueryClient, queryKey: QueryKey, page: ListPage): void {
  const state = client.getQueryState(queryKey);
  client.setQueryData(queryKey, page, { updatedAt: state?.dataUpdatedAt });
  if (state?.isInvalidated) void client.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
}

/** Every cached chats list follows the open chat's ticks as soon as the chat merges them. */
export function useTicksInLists(chat: ChatPages | undefined): void {
  const client = useQueryClient();
  useEffect(() => {
    const statusOf: StatusOf = (row) => chatStatus(chat, row.last_message_id);
    const lists = client.getQueriesData<ListPage>({ queryKey: ['threads', 'list'] });
    for (const [queryKey, page] of lists) {
      const next = page && overlayPage(page, statusOf);
      if (next && next !== page) writeTicks(client, queryKey, next);
    }
  }, [client, chat]);
}
