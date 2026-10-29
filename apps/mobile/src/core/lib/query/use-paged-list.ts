import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch, toQueryString } from '../http/api';
import { usePagedActions, withTracked } from './paged-result';
import { flattenPages, nextPageParam, type Page, type WithId } from './paging';
import { listKey, type ListParams } from './query-keys';

interface PagedListOptions {
  /** List endpoint, e.g. '/leads'. Also the query key: ['leads', 'list', params]. */
  path: string;
  /** Filters and `q`; undefined and '' are left out of the request. */
  params?: ListParams;
  /** Rows per request (API default 25, max 100). */
  pageSize?: number;
}

/**
 * Infinite list over a `{ items, total, page, pageSize }` endpoint. Feed `items` to a LazyList,
 * `loadMore` to `onEndReached` and `refresh` to `onRefresh`. Everything else is TanStack's result.
 */
export function usePagedList<T extends WithId>({
  path,
  params = {},
  pageSize = 25,
}: PagedListOptions) {
  const query = useInfiniteQuery({
    queryKey: listKey(path, params),
    queryFn: ({ pageParam }) =>
      apiFetch<Page<T>>(`${path}${toQueryString({ ...params, page: pageParam, pageSize })}`),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
  const pages = query.data?.pages;
  const items = useMemo(() => flattenPages(pages ?? []), [pages]);
  const { loadMore, refresh, pulling } = usePagedActions(query);
  return withTracked(query, { items, total: pages?.[0]?.total ?? 0, loadMore, refresh, pulling });
}
