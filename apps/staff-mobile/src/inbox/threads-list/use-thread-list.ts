import { INBOX_LIST_REFRESH_MS, liveInterval, nextPageParam } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import type { LeadStatus } from '@ab/catalog';
import type { Page } from '@ab/core';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { apiFetch, toQueryString, useScreenFocused } from '@ab/mobile-kit';
import { usePagedActions, withTracked } from '@/core/lib/query/paged-result';
import { readListHead, useInboxLive, useLiveWatch } from '@/inbox/thread/live';
import { storeReader, useStoredThreads } from '@/inbox/thread/local';
import { waitingForReply } from './chat-filter';
import { useListCatchUp } from './list-catch-up';
import { withStoredList } from './list-select';

const PAGE_SIZE = 25;

interface ThreadListParams {
  search: string;
  unread: boolean;
  /** docs/22: an unknown id returns an empty page. */
  list?: string;
  /** One lead stage (GET /threads?status=, admin and sales): only its chats. */
  status?: LeadStatus;
  /**
   * The chats tab: re-read every INBOX_LIST_REFRESH_MS while focused (unread counts, order), every
   * INBOX_FALLBACK_MS while realtime is connected (its events re-read it sooner). A picker never polls.
   */
  live?: boolean;
}

/**
 * GET /threads (docs/12 H1): every WhatsApp conversation — leads, guardians, teachers — newest
 * first, by name / phone, unread, lead stage and chat list. A thread is keyed by its phone (one row per phone).
 * Its poll refetches the loaded pages together (TanStack's infinite refetch), so the order stays
 * whole; an event re-reads page 1 alone.
 */
export function useThreadList({
  search,
  unread,
  list,
  status,
  live: liveTab = false,
}: ThreadListParams) {
  const focused = useScreenFocused();
  const live = useInboxLive();
  useLiveWatch(liveTab ? 'list' : null, focused);
  const client = useQueryClient();
  const queryKey = ['threads', 'list', { search, unread, list, status }];
  const pageOf = (page: number, signal?: AbortSignal) =>
    apiFetch<Page<ThreadView>>(
      `/threads${toQueryString({ search, unread: unread ? 'true' : undefined, list, status, page, pageSize: PAGE_SIZE })}`,
      { signal },
    );
  // An event, a return or a resume re-reads page 1 only (readListHead), merged into the pages.
  useListCatchUp(queryKey, focused, () => readListHead(client, queryKey, () => pageOf(1)));
  const threads = useStoredThreads(); // the phone store's rows (docs/43 43-7)
  const query = useInfiniteQuery({
    queryKey,
    // TanStack's signal: a list nobody shows drops its read, so a later mount starts a new one.
    queryFn: ({ pageParam, signal }) => pageOf(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    refetchInterval: liveTab && focused ? liveInterval(live, INBOX_LIST_REFRESH_MS) : false,
    // What the chat and the phone store hold over the last read shows at once (docs/43 43-1).
    select: withStoredList(client, queryKey, { threads, chat: storeReader.chat }),
  });
  const pages = query.data?.pages;
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (pages ?? [])
      .flatMap((p) => p.items)
      .filter((th) => !seen.has(th.phone_e164) && seen.add(th.phone_e164));
  }, [pages]);
  const { loadMore, refresh, pulling } = usePagedActions(query);
  return withTracked(query, { items, total: pages?.[0]?.total ?? 0, loadMore, refresh, pulling });
}

/** While none are waiting and more pages exist it pages on by itself and holds the empty title. */
export function useChoiceRows(list: ReturnType<typeof useThreadList>, waiting: boolean) {
  const items = useMemo(() => (waiting ? waitingForReply(list.items) : []), [waiting, list.items]);
  const seeking = waiting && items.length === 0 && list.hasNextPage;
  const { loadMore } = list;
  useEffect(() => {
    if (seeking) loadMore();
  }, [seeking, loadMore, list.items]);
  return { rows: waiting ? withTracked(list, { items }) : list, seeking };
}
