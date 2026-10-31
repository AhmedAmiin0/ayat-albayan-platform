import { LEAD_STATUSES, listSortShape, type LeadStatus, type ListSort } from '@ab/shared';
import { z } from 'zod';
import type { SortSpec } from '@/common/db/list-sort';
import type { Db } from '@/common/db/db.module';
import { pageQuerySchema } from '@/common/http/http';
import { phoneList } from '@/modules/messaging/numbers';

// H1 list order and filters (R-LEAD-02, R-NFR-08). No `sort` = newest message first (the old order).

const THREAD_SORT_KEYS = ['unread', 'name'] as const;
export type ThreadSortKey = (typeof THREAD_SORT_KEYS)[number];

/** «غير مقروءة أولًا» (admin's unread_count) and «الاسم» (unnamed numbers last); ties: newest message. */
export const THREAD_SORT: SortSpec<ThreadSortKey> = {
  columns: {
    unread: { column: 'unread_count' },
    name: { column: 'display_name', nullsFirst: false },
  },
  fallback: { column: 'last_message_at', ascending: false },
};

/** GET /threads query: page, search, unread, `sort`/`dir`, the lead's status and a chat list (docs/22). */
export const threadListQuery = pageQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  list: z.string().trim().max(100).optional(),
  unread: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  status: z.enum(LEAD_STATUSES).optional(),
  ...listSortShape(THREAD_SORT_KEYS),
});

export interface ThreadListFilter extends ListSort<ThreadSortKey> {
  page: number;
  pageSize: number;
  search?: string;
  unread?: boolean;
  /** The thread's lead status (admin and sales; a teacher sees no lead). */
  status?: LeadStatus | undefined;
  /** A chat list's id «القوائم» (admin and sales with inbox.lists; checked by chat-list-filter.ts). */
  list?: string | undefined;
  /** Teacher mode: only these phones (never empty — the caller answers an empty page itself). */
  phones?: readonly string[];
  /** Never these phones: the academy's own numbers (OwnNumbers, set by ThreadReads for every role). */
  hide?: readonly string[];
}

/**
 * Teacher mode: «غير مقروءة» is the teacher's own count (teacher_unread), not the view's
 * unread_count, and a teacher sees no lead — so neither the unread order nor the status filter apply.
 */
export function teacherListFilter(f: ThreadListFilter, phones: readonly string[]): ThreadListFilter {
  const out: ThreadListFilter = { page: f.page, pageSize: f.pageSize, unread: false, phones };
  if (f.hide) out.hide = f.hide;
  if (f.search) out.search = f.search;
  if (f.sort === 'name') out.sort = 'name';
  if (f.sort === 'name' && f.dir) out.dir = f.dir;
  return out;
}

/** The chats of a list «القوائم» or all of them, never the academy's own numbers (`hide`). */
export function threadsSource(db: Db, f: ThreadListFilter) {
  const query = f.list
    ? db.from('v_list_threads').select('*', { count: 'exact' }).eq('list_id', f.list)
    : db.from('v_threads').select('*', { count: 'exact' });
  return f.hide?.length ? query.not('phone_e164', 'in', phoneList(f.hide)) : query;
}
