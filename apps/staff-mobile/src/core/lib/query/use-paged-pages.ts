import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { flattenPages, nextPageParam, type WithId } from '@ab/client-core';
import type { Page } from '@ab/core';
import { usePagedActions, withTracked } from './paged-result';

interface PagedPagesOptions<T> {
  queryKey: QueryKey;
  /** One page by its number; TanStack's signal frees a superseded read (docs/43 AU8). */
  loadPage: (page: number, signal: AbortSignal) => Promise<Page<T>>;
}

/**
 * Infinite list over any `{ items, total, page, pageSize }` loader, a route call included. Feed
 * `items` to a LazyList, `loadMore` to `onEndReached` and `refresh` to `onRefresh`.
 */
export function usePagedPages<T extends WithId>({ queryKey, loadPage }: PagedPagesOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => loadPage(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
  const pages = query.data?.pages ?? [];
  const items = flattenPages(pages);
  const { loadMore, refresh, pulling } = usePagedActions(query);
  return withTracked(query, { items, total: pages[0]?.total ?? 0, loadMore, refresh, pulling });
}
