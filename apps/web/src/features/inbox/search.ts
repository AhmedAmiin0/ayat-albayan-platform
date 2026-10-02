/**
 * /admin/inbox URL state: the open thread (E.164), the list's search, unread filter and page.
 * One route with search params, so the list keeps its filters while threads open and close.
 */
export type InboxSearch = { phone?: string; q?: string; unread?: true; page: number };

const E164 = /^\+[1-9]\d{6,14}$/;

/** Route `validateSearch`: a bad phone closes the thread, blank search is dropped, bad page → 1. */
export function parseInboxSearch(s: Record<string, unknown>): InboxSearch {
  const page = Number(s['page']);
  const out: InboxSearch = { page: Number.isInteger(page) && page > 1 ? page : 1 };
  const phone = typeof s['phone'] === 'string' ? s['phone'].trim() : '';
  const q = typeof s['q'] === 'string' ? s['q'].trim() : '';
  if (E164.test(phone)) out.phone = phone;
  if (q) out.q = q;
  if (s['unread'] === true || s['unread'] === 'true') out.unread = true;
  return out;
}
