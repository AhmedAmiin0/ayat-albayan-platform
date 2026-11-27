import { apiFetch, toQueryString, listKey, type ListParams } from '@ab/mobile-kit';
import type { WithId } from '@ab/client-core';
import type { Page } from '@ab/core';
import { usePagedPages } from './use-paged-pages';

interface PagedListOptions {
  /** List endpoint, e.g. '/leads'. Also the query key: ['leads', 'list', params]. */
  path: string;
  /** Filters and `q`; undefined and '' are left out of the request. */
  params?: ListParams;
  /** Rows per request (API default 25, max 100). */
  pageSize?: number;
}

/** usePagedPages over a plain list path. */
export function usePagedList<T extends WithId>({
  path,
  params = {},
  pageSize = 25,
}: PagedListOptions) {
  return usePagedPages<T>({
    queryKey: listKey(path, params),
    loadPage: (page, signal) => {
      const query = toQueryString({ ...params, page, pageSize });
      return apiFetch<Page<T>>(`${path}${query}`, { signal });
    },
  });
}
