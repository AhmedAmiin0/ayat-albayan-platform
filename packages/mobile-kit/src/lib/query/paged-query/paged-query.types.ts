/** What a LazyList needs from a paged read: its rows, the next page and pull to refresh. */
export interface Paged<T> {
  items: readonly T[];
  loadMore: () => void;
  refresh: () => void;
  /** The viewer's own pull is running: the only thing that shows the spinner (never a refetch). */
  pulling: boolean;
  /** The next page is on its way: a spinner under the last row. */
  loadingMore?: boolean;
  /** The read failed with no rows to show: the kit's error state, its retry refreshes. */
  failed?: boolean;
  /** The first page is on its way: no empty state yet. */
  loading?: boolean;
}

/** The fields of a TanStack useInfiniteQuery result that paging reads. */
export interface InfinitePages<P> {
  data?: { pages: readonly P[] };
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  isPending: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}
