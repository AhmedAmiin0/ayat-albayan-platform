import { E164_RE, LEAD_STATUSES, type LeadStatus } from '@ab/shared';
import { z } from 'zod';

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
  /** A chat list «القوائم» (docs/22 §4): its id; the chip row falls back to «الكل» for an unknown one. */
  list?: string;
  /** «المكالمات» (docs/28): the calls log instead of the chats list. */
  calls?: true;
  /** «احجز أيام الحلقات» (owner 2026-11-06): a student id whose course wizard opens on the chat. */
  course?: string;
  page: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pick = <T extends string>(all: readonly T[], v: unknown): T | undefined => all.find((x) => x === v);

/** `course`: a student id (uuid) only, else nothing. */
const courseSchema = z.object({ course: z.uuid().optional().catch(undefined) });
const courseParam = (s: Record<string, unknown>): Pick<InboxSearch, 'course'> => {
  const { course } = courseSchema.parse(s);
  return course ? { course } : {};
};

/** Route `validateSearch`: a bad phone closes the thread; blank search, unknown sort/status, a non-id list drop; bad page → 1. */
export function parseInboxSearch(s: Record<string, unknown>): InboxSearch {
  const page = Number(s['page']);
  const out: InboxSearch = { page: Number.isInteger(page) && page > 1 ? page : 1 };
  const phone = typeof s['phone'] === 'string' ? s['phone'].trim() : '';
  const q = typeof s['q'] === 'string' ? s['q'].trim() : '';
  if (E164_RE.test(phone)) out.phone = phone;
  if (q) out.q = q;
  if (s['unread'] === true || s['unread'] === 'true') out.unread = true;
  const sort = pick(THREAD_SORTS, s['sort']);
  if (sort) out.sort = sort;
  const status = pick(LEAD_STATUSES, s['f_status']);
  if (status) out.f_status = status;
  if (typeof s['list'] === 'string' && UUID.test(s['list'])) out.list = s['list'];
  if (s['calls'] === true || s['calls'] === 'true') out.calls = true;
  return { ...out, ...courseParam(s) };
}
