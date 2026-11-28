import { usePullRefresh } from '../pull-refresh';
import type { InfinitePages, Paged } from './paged-query.types';

/**
 * A TanStack useInfiniteQuery result as a LazyList's `paged`: every page's rows in order, the next
 * page only when there is one and none is already on its way (FlashList calls onEndReached again
 * on each scroll near the end), pull to refresh, and the footer, error and loading states.
 */
export function usePagedQuery<P, T>(
  query: InfinitePages<P>,
  rowsOf: (page: P) => readonly T[],
): Paged<T> {
  const { refreshing, onRefresh } = usePullRefresh(query.refetch);
  const items = (query.data?.pages ?? []).flatMap(rowsOf);
  const canLoad = query.hasNextPage && !query.isFetchingNextPage;
  const loadMore = () => {
    if (canLoad) void query.fetchNextPage();
  };
  return {
    items,
    loadMore,
    refresh: onRefresh,
    pulling: refreshing,
    loadingMore: query.isFetchingNextPage,
    failed: query.isError && items.length === 0,
    loading: query.isPending,
  };
}
