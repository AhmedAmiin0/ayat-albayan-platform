import type { MessageView } from '@ab/shared';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { pathKey } from '@/core/lib/query/query-keys';
import { listsKey } from '../../lists/use-chat-lists';
import { type ThreadCache, threadKey } from './thread-cache';
import { clearUnread, newestInbound, type ThreadListCache, touchList } from './thread-list-cache';

// The chats list follows every chat (owner 2026-10-27: it needed a pull to refresh): a send, a
// received message and an opened chat refresh the thread, the chats list, the tab's unread badge
// and «القوائم» from this one place. Every tree's list (admin, sales, assistant, teacher) is
// useThreadList, so one key reaches them all.

/** ['threads', 'list']: every cached chats list, whatever its search, unread or list filter. */
export const threadListKey = ['threads', 'list'];
const navCountKey = ['threads', 'nav-count'];

function refreshLists(client: QueryClient): void {
  for (const queryKey of [threadListKey, navCountKey, listsKey]) void client.invalidateQueries({ queryKey });
}

/**
 * Refetches the chat with this phone and every list that shows it; without a phone (a forward, a
 * push without one) every chat. Resolves with the thread's own refetch, as a send's onSettled did.
 */
export function refreshInbox(client: QueryClient, phone?: string): Promise<void> {
  if (!phone) {
    void client.invalidateQueries({ queryKey: listsKey });
    return client.invalidateQueries({ queryKey: pathKey('/threads') });
  }
  refreshLists(client);
  return client.invalidateQueries({ queryKey: threadKey(phone) });
}

/**
 * A send's row on top of its chat in every cached list at once (WhatsApp-like). A list refetch in
 * flight is cancelled first, so its older answer never lands over the move; refreshInbox confirms
 * it, and a refused send's refetch puts the list back as the server has it.
 */
export async function touchInbox(client: QueryClient, row: MessageView): Promise<void> {
  await client.cancelQueries({ queryKey: threadListKey });
  client.setQueriesData<ThreadListCache>({ queryKey: threadListKey }, (old) => touchList(old, row));
}

/** The API stamped the chat read: its badge goes at once, the counts refetch (not the thread). */
function markInboxRead(client: QueryClient, phone: string): void {
  client.setQueriesData<ThreadListCache>({ queryKey: threadListKey }, (old) => clearUnread(old, phone));
  refreshLists(client);
}

/** The open chat's useThread: its pages, and whether the server answered since the chat opened. */
interface ReadState {
  data: ThreadCache | undefined;
  isFetchedAfterMount: boolean;
  isSuccess: boolean;
}

/**
 * markInboxRead once the open chat's GET answered, then again only when a newer received message
 * arrives in it: a refetch with nothing new (a poll) refetches no list.
 */
export function useInboxRead(phone: string, { data, isFetchedAfterMount, isSuccess }: ReadState): void {
  const client = useQueryClient();
  // The saved copy on disk shows before the GET: it read nothing on the server yet.
  const answered = isFetchedAfterMount && isSuccess;
  const seen = useRef('');
  const inbound = newestInbound(data);
  useEffect(() => {
    if (!answered || !inbound || seen.current === inbound) return;
    seen.current = inbound;
    markInboxRead(client, phone);
  }, [answered, inbound, phone, client]);
}
