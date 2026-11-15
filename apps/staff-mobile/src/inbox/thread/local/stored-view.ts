import { withStoredRows, withStoredTicks } from '@ab/client-core';
import type { SyncMessage, ThreadDetail, ThreadView } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { withTracked } from '@/core/lib/query/paged-result';
import { useStoredChat, useStoredThreads, useStoreReads } from './use-stored';

type Pages = InfiniteData<ThreadDetail>;
const NO_PEOPLE: ThreadDetail['people'] = { guardian: null, lead: null, students: [] };

/**
 * A chat not read over HTTP yet, opened from the phone store (docs/43 43-7: ~0 ms, offline too):
 * its stored rows (oldest → newest) and its stored chats-list row, as one page with no older
 * one; people and lessons come with the first GET.
 */
export function storedPage(rows: readonly SyncMessage[], thread: ThreadView | null): Pages {
  const messages = [...rows].reverse();
  const page: ThreadDetail = { thread, messages, has_more: false, lessons: [], people: NO_PEOPLE };
  return { pages: [page], pageParams: [null] };
}

/** The pages to show: the HTTP pages over the store, or the store alone before the first GET. */
export function viewOf(
  data: Pages | undefined,
  rows: readonly SyncMessage[],
  thread: ThreadView | null,
): Pages | undefined {
  if (data) return withStoredRows(data, rows);
  return rows.length > 0 ? storedPage(rows, thread) : undefined;
}

/**
 * The live chat's query with the store over it (useThread): one source for every tick, a sync's
 * new rows at once, and the chat on screen before its GET answers; its HTTP rows go into the
 * store. Without a store (no session, a test), `data` is the query's own.
 */
export function useStoredView<Q extends { data: Pages | undefined }>(
  phone: string,
  query: Q,
): Q & { httpData?: Pages | undefined } {
  const rows = useStoredChat(phone);
  const thread = useStoredThreads().get(phone) ?? null;
  useStoreReads(query.data?.pages[0]?.messages);
  // httpData: what the server answered (useInboxRead marks a chat read only on that).
  return withTracked(query, { data: viewOf(query.data, rows, thread), httpData: query.data });
}

/** An anchored window (docs/37) with the stored ticks only: its rows are old, none is added. */
export function useStoredTicks<Q extends { data: Pages | undefined }>(phone: string, query: Q): Q {
  const rows = useStoredChat(phone);
  const data = query.data && withStoredTicks(query.data, rows);
  return withTracked(query, { data });
}
