import type { RouteQuery } from '@ab/core';
import type { threadReadRoutes } from '@ab/shared';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';

type ListQuery = RouteQuery<typeof threadReadRoutes.list>;

export const THREADS_PAGE_SIZE = 30;

/** GET /threads for the list's URL state (a filter left undefined is not sent). */
export function threadListQuery(s: InboxSearch): ListQuery {
  return {
    page: s.page,
    pageSize: THREADS_PAGE_SIZE,
    search: s.q,
    unread: s.unread && 'true',
    sort: s.sort,
    dir: s.sort === 'unread' ? 'desc' : undefined,
    status: s.f_status,
    list: s.list,
  };
}

/** The list's cache key part: its query string, as every reader and patcher of the list keys it. */
export const threadListKey = (query: ListQuery): string =>
  new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [name, String(value)]),
  ).toString();
