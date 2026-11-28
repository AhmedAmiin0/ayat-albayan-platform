import { useCallback } from 'react';
import { usePullRefresh } from '@ab/mobile-kit';

/**
 * Adds fields to a TanStack result WITHOUT reading it. A spread reads every tracked field, so the
 * screen would re-render on any change (isFetching on each poll…). The result stays the prototype,
 * so reads still go through TanStack's tracker and only the fields the screen reads re-render it.
 */
export function withTracked<R extends object, E extends object>(result: R, extra: E): R & E {
  return Object.assign(Object.create(result) as R, extra);
}

interface PagedQuery {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

/**
 * `loadMore` (the next page, only if there is one and it isn't already on its way) and `refresh`,
 * stable across renders: FlashList and memo rows get the same function until a page boundary.
 * `pulling`: the viewer's own pull is running (the spinner), never a background refetch.
 */
export function usePagedActions({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  refetch,
}: PagedQuery) {
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const { refreshing: pulling, onRefresh: refresh } = usePullRefresh(refetch);
  return { loadMore, refresh, pulling };
}
