import type { Page } from '@ab/core';
import type { z } from 'zod';
import { callWith, toQueryString, type ApiClient } from '../http';
import { listKey, type ListParams } from '../keys';
import type { InfinitePageOptions, ListEndpoint, PageOptions, WithId } from './paging.types';

export function nextPageParam(last: Page<unknown>): number | undefined {
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined;
}

/** Pages → one list. Offset paging repeats a row inserted mid-scroll: keep the first. */
export function flattenPages<T extends WithId>(pages: readonly Page<T>[]): T[] {
  const seen = new Set<string>();
  return pages
    .flatMap((p) => p.items)
    .filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
}

/** One page of a list: keyed by path and params, parsed with the list's page schema. */
export function pageOptions<S extends z.ZodType<Page<unknown>>>(
  client: ApiClient,
  list: ListEndpoint<S>,
  params: ListParams,
): PageOptions<S> {
  return {
    queryKey: listKey(list.path, params),
    queryFn: () =>
      callWith(client)({ path: `${list.path}${toQueryString(params)}`, schema: list.page }),
  };
}

/** Every page of a list, from page 1 while rows remain. */
export function infinitePageOptions<S extends z.ZodType<Page<unknown>>>(
  client: ApiClient,
  list: ListEndpoint<S>,
  params: ListParams,
): InfinitePageOptions<S> {
  const read = (page: number) => `${list.path}${toQueryString({ ...params, page })}`;
  return {
    queryKey: listKey(list.path, params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => callWith(client)({ path: read(pageParam), schema: list.page }),
    getNextPageParam: nextPageParam,
  };
}
