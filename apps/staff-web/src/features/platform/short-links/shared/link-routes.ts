import {
  isListFiltered, listFilterOf, type LinkListView, type ShortLinkListFilter,
} from '@ab/client-core';
import { SHORT_LINK_STATUSES } from '@ab/shared';
import { z } from 'zod';

// Admin and sales sections share these screens; filters live in the URL so back keeps the page.

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

/** The URL's filters as client-core's list view. */
const viewOf = (search: LinkListSearch): LinkListView => ({
  tab: search.status,
  owner: search.owner,
  search: search.q,
});

/** The API's filter for the URL (a blank search is no search). */
export const filterOf = (search: LinkListSearch): ShortLinkListFilter => ({
  ...listFilterOf(viewOf(search)),
  page: search.page ?? 1,
  pageSize: LIST_PAGE_SIZE,
});

export const isFiltered = (search: LinkListSearch): boolean => isListFiltered(viewOf(search));
