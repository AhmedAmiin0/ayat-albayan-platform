import type { ThreadView } from '@ab/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch, toQueryString } from '@/lib/api';
import { nextPageParam, type Page } from '@/lib/paging';

const PAGE_SIZE = 25;

export interface ThreadListParams {
  search: string;
  unread: boolean;
  /** A chat list's id «القوائم» (docs/22): only its chats. Unknown id → an empty page. */
  list?: string;
}

/**
 * GET /threads (docs/12 H1): every WhatsApp conversation — leads, guardians, teachers — newest
 * first, by name / phone, unread and chat list. A thread is keyed by its phone (one row per phone).
 */
export function useThreadList({ search, unread, list }: ThreadListParams) {
  const query = useInfiniteQuery({
    queryKey: ['threads', 'list', { search, unread, list }],
    queryFn: ({ pageParam }) =>
      apiFetch<Page<ThreadView>>(
        `/threads${toQueryString({ search, unread: unread ? 'true' : undefined, list, page: pageParam, pageSize: PAGE_SIZE })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
  const pages = query.data?.pages;
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (pages ?? []).flatMap((p) => p.items).filter((th) => !seen.has(th.phone_e164) && seen.add(th.phone_e164));
  }, [pages]);
  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  };
  return { ...query, items, total: pages?.[0]?.total ?? 0, loadMore, refresh: () => void query.refetch() };
}
