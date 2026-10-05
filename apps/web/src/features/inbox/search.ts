import { LEAD_STATUSES, type LeadStatus } from '@ab/shared';

/** The list's orders: no `sort` = newest message first; «غير المقروءة أولًا»; by name. */
export const THREAD_SORTS = ['unread', 'name'] as const;
export type ThreadSort = (typeof THREAD_SORTS)[number];

/**
 * /admin/inbox URL state: the open thread (E.164), the list's search, unread filter, order, lead
 * status (`f_status`, R-NFR-08) and page. One route with search params, so the list keeps its
 * filters while threads open and close.
 */
export type InboxSearch = {
  phone?: string;
  q?: string;
  unread?: true;
  sort?: ThreadSort;
  f_status?: LeadStatus;
  page: number;
};

const E164 = /^\+[1-9]\d{6,14}$/;

const pick = <T extends string>(all: readonly T[], v: unknown): T | undefined => all.find((x) => x === v);

/** Route `validateSearch`: a bad phone closes the thread; blank search, unknown sort/status drop; bad page → 1. */
export function parseInboxSearch(s: Record<string, unknown>): InboxSearch {
  const page = Number(s['page']);
  const out: InboxSearch = { page: Number.isInteger(page) && page > 1 ? page : 1 };
  const phone = typeof s['phone'] === 'string' ? s['phone'].trim() : '';
  const q = typeof s['q'] === 'string' ? s['q'].trim() : '';
  if (E164.test(phone)) out.phone = phone;
  if (q) out.q = q;
  if (s['unread'] === true || s['unread'] === 'true') out.unread = true;
  const sort = pick(THREAD_SORTS, s['sort']);
  if (sort) out.sort = sort;
  const status = pick(LEAD_STATUSES, s['f_status']);
  if (status) out.f_status = status;
  return out;
}
