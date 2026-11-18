import type { ShortLinkListFilter } from '@ab/client-core';
import { SHORT_LINK_STATUSES } from '@ab/shared';
import { z } from 'zod';

// Where the short-link screens live: the admin's and the salesperson's sections share them, and
// the list keeps its filters in the URL so «رجوع» from a link lands on the same page.

export type LinkSection = 'admin' | 'sales';

export const LINK_ROUTES = {
  admin: { list: '/admin/short-links', detail: '/admin/short-links/$code' },
  sales: { list: '/sales/short-links', detail: '/sales/short-links/$code' },
} as const;

/** The list's URL: `?status=&owner=&q=&page=`; anything malformed is dropped. */
export const linkListSearch = z.object({
  status: z.enum(SHORT_LINK_STATUSES).optional().catch(undefined),
  owner: z.uuid().optional().catch(undefined),
  q: z.string().max(80).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
});
export type LinkListSearch = z.infer<typeof linkListSearch>;

/** Links per page (the API's own default). */
export const LIST_PAGE_SIZE = 20;

/** The API's filter for the URL (an empty search is no search). */
export function filterOf(search: LinkListSearch): ShortLinkListFilter {
  const q = search.q?.trim();
  return {
    ...(search.status ? { status: search.status } : {}),
    ...(search.owner ? { owner: search.owner } : {}),
    ...(q ? { search: q } : {}),
    page: search.page ?? 1,
    pageSize: LIST_PAGE_SIZE,
  };
}

/** Any filter set (the «مسح التصفية» link and the empty state's words). */
export const isFiltered = (search: LinkListSearch): boolean =>
  Boolean(search.status ?? search.owner ?? search.q?.trim());
