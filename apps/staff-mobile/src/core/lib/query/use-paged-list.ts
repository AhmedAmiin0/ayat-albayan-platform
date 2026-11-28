import { apiFetch, toQueryString, listKey, type ListParams } from '@ab/mobile-kit';
import type { WithId } from '@ab/client-core';
import type { Page } from '@ab/core';
import { usePagedPages } from './use-paged-pages';

interface PageAt {
  page: number;
  pageSize: number;
}

type PageRead<T> = (at: PageAt, signal: AbortSignal) => Promise<Page<T>>;

interface PagedListOptions<T> {
  /** List endpoint, e.g. '/leads'. Also the query key: ['leads', 'list', params]. */
  path: string;
  /** Filters and `q`; undefined and '' are left out of the request. */
  params?: ListParams;
  /** Rows per request (API default 25, max 100). */
  pageSize?: number;
  /** The list's route call; without it the page is read from `path` with `params`. */
  read?: PageRead<T> | undefined;
}

const pathRead =
  <T>(path: string, params: ListParams): PageRead<T> =>
  (at, signal) =>
    apiFetch<Page<T>>(`${path}${toQueryString({ ...params, ...at })}`, { signal });

/** usePagedPages over the list's route call, or a plain list path. */
export function usePagedList<T extends WithId>({
  path,
  params = {},
  pageSize = 25,
  read,
}: PagedListOptions<T>) {
  const readPage = read ?? pathRead<T>(path, params);
  return usePagedPages<T>({
    queryKey: listKey(path, params),
    loadPage: (page, signal) => readPage({ page, pageSize }, signal),
  });
}
