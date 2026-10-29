import { INBOX_LIST_REFRESH_MS, liveInterval } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch, toQueryString } from '@/core/lib/http/api';
import { nextPageParam, type Page } from '@/core/lib/query/paging';
import { usePagedActions, withTracked } from '@/core/lib/query/paged-result';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { useInboxLive, useLiveWatch } from '../thread/live';

const PAGE_SIZE = 25;

interface ThreadListParams {
  search: string;
  unread: boolean;
  /** A chat list's id «القوائم» (docs/22): only its chats. Unknown id → an empty page. */
  list?: string;
  /**
   * The chats tab: re-read every INBOX_LIST_REFRESH_MS while focused (unread counts, order), every
   * INBOX_FALLBACK_MS while realtime is connected (its events re-read it sooner). A picker never polls.
   */
  live?: boolean;
}

/**
 * GET /threads (docs/12 H1): every WhatsApp conversation — leads, guardians, teachers — newest
 * first, by name / phone, unread and chat list. A thread is keyed by its phone (one row per phone).
 * Live, the loaded pages refetch together (TanStack's infinite refetch), so the order stays whole.
 */
export function useThreadList({ search, unread, list, live: liveTab = false }: ThreadListParams) {
  const focused = useScreenFocused();
  const live = useInboxLive();
  useLiveWatch(liveTab ? 'list' : null, focused);
  const query = useInfiniteQuery({
    queryKey: ['threads', 'list', { search, unread, list }],
    queryFn: ({ pageParam }) =>
      apiFetch<Page<ThreadView>>(
        `/threads${toQueryString({ search, unread: unread ? 'true' : undefined, list, page: pageParam, pageSize: PAGE_SIZE })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    refetchInterval: liveTab && focused ? liveInterval(live, INBOX_LIST_REFRESH_MS) : false,
  });
  const pages = query.data?.pages;
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (pages ?? []).flatMap((p) => p.items).filter((th) => !seen.has(th.phone_e164) && seen.add(th.phone_e164));
  }, [pages]);
  const { loadMore, refresh, pulling } = usePagedActions(query);
  return withTracked(query, { items, total: pages?.[0]?.total ?? 0, loadMore, refresh, pulling });
}
