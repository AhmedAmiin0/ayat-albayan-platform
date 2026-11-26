import { useCallback } from 'react';
import { usePullRefresh } from '@ab/mobile-kit';

/**
 * Adds fields to a TanStack result WITHOUT reading it. A spread (`{ ...query }`) reads every tracked
 * field, so the screen re-rendered on any change (isFetching on each poll, dataUpdatedAt…). The result
 * stays the prototype: a read still goes through TanStack's tracker, and the screen re-renders only for
 * the fields it reads.
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
