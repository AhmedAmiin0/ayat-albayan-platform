import { anchoredThreadPrefix } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { pathKey } from '@ab/mobile-kit';
import { listsKey } from '@/inbox/lists/lib/use-chat-lists';
import { changeLists } from '@/inbox/thread/live/list-marks';
import { nudgeInboxStore } from '@/inbox/thread/local/store-session';
import { type ThreadCache, threadKey } from './thread-cache';
import { clearUnread, newestInbound, type ThreadListCache, touchList } from './thread-list-cache';

// One shared key reaches every tree's chats list (useThreadList) after any send or receive.

/** ['threads', 'list']: every cached chats list, whatever its search, unread or list filter. */
export const threadListKey = ['threads', 'list'];
const navCountKey = ['threads', 'nav-count'];

/** A list under a chat is only marked stale (docs/43 AU2); a list on screen re-reads now. */
export function refreshLists(client: QueryClient): void {
  nudgeInboxStore(); // the phone store syncs too (docs/43 43-7)
  changeLists(client);
  for (const queryKey of [navCountKey, listsKey]) void client.invalidateQueries({ queryKey });
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
  return refreshChat(client, phone);
}

/**
 * The open chat re-reads: the live pages and any window around an old search hit (docs/37), so a
 * bubble action (hide, retry, a reply action) shows inside the window too.
 */
export async function refreshChat(client: QueryClient, phone: string): Promise<void> {
  const keys = [threadKey(phone), anchoredThreadPrefix(phone)];
  await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

/** Reads started before backgrounding may hang and absorb refreshes, so all are cancelled first. */
export async function resumeInbox(client: QueryClient): Promise<void> {
  await client.cancelQueries({ queryKey: ['threads'] });
  nudgeInboxStore();
  await refreshInbox(client);
}

/**
 * A send's row on top of its chat in every cached list at once (WhatsApp-like). A list refetch in
 * flight is cancelled first, so its older answer never lands over the move; refreshInbox confirms
 * it, and a refused send's refetch puts the list back as the server has it.
 */
export async function touchInbox(client: QueryClient, row: MessageView): Promise<void> {
  await client.cancelQueries({ queryKey: threadListKey });
  editLists(client, (old) => touchList(old, row));
}

type ListEdit = (old: ThreadListCache | undefined) => ThreadListCache | undefined;

/**
 * Every cached list edited in place, keeping its read time: an edit is not a read, so it never
 * hides a change a hidden list missed (list-marks.ts compares that time with its mark).
 */
function editLists(client: QueryClient, edit: ListEdit): void {
  for (const [queryKey] of client.getQueriesData<ThreadListCache>({ queryKey: threadListKey })) {
    const updatedAt = client.getQueryState(queryKey)?.dataUpdatedAt;
    client.setQueryData<ThreadListCache>(queryKey, edit, { updatedAt });
  }
}

/** The API stamped the chat read: its badge goes at once, the counts refetch (not the thread). */
function markInboxRead(client: QueryClient, phone: string): void {
  editLists(client, (old) => clearUnread(old, phone));
  refreshLists(client);
}

/** The open chat's useThread: its pages, and whether the server answered since the chat opened. */
interface ReadState {
  data: ThreadCache | undefined;
  /** The server's pages alone (useStoredView): a row the phone store brought was never stamped. */
  httpData?: ThreadCache | undefined;
  isFetchedAfterMount: boolean;
  isSuccess: boolean;
}

/**
 * markInboxRead once the open chat's GET answered, then again only when a newer received message
 * arrives in it: a refetch with nothing new (a poll) refetches no list.
 */
export function useInboxRead(phone: string, state: ReadState): void {
  const { data, httpData, isFetchedAfterMount, isSuccess } = state;
  const client = useQueryClient();
  // The saved copy on disk shows before the GET: it read nothing on the server yet.
  const answered = isFetchedAfterMount && isSuccess;
  const seen = useRef('');
  const inbound = newestInbound(httpData ?? data);
  useEffect(() => {
    if (!answered || !inbound || seen.current === inbound) return;
    seen.current = inbound;
    markInboxRead(client, phone);
  }, [answered, inbound, phone, client]);
}
