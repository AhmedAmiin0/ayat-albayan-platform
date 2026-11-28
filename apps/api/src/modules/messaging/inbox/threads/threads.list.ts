import { LEAD_STATUSES, type LeadStatus } from '@ab/catalog';
import { listSortShape, searchDigits, type ListSort } from '@ab/core';
import { z } from 'zod';
import type { SortSpec } from '@/common/db/list-sort';
import { orFilterTerm } from '@/common/db/or-filter';
import { pageQuerySchema } from '@/common/http/http';

// H1 list order and filters (R-LEAD-02, R-NFR-08). No `sort` = newest message first (the old
// order).

const THREAD_SORT_KEYS = ['unread', 'name'] as const;
export type ThreadSortKey = (typeof THREAD_SORT_KEYS)[number];

/** Unnamed numbers sort last; ties go to the newest message. */
export const THREAD_SORT: SortSpec<ThreadSortKey> = {
  columns: {
    unread: { column: 'unread_count' },
    name: { column: 'display_name', nullsFirst: false },
  },
  fallback: [{ column: 'last_message_at', ascending: false }],
  key: 'phone_e164',
};

/**
 * GET /threads query: page, search, unread, `sort`/`dir`, the lead's status and a chat list
 * (docs/22).
 */
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
  /** Checked by chat-list-filter.ts (admin and sales with inbox.lists). */
  list?: string | undefined;
  /** Teacher mode: only these phones (never empty — the caller answers an empty page itself). */
  phones?: readonly string[];
  /**
   * Never these phones: the academy's own numbers (OwnNumbers, set by ThreadReads for every role).
   */
  hide?: readonly string[];
}

/** Teachers use their own unread count and see no lead, so those filters do not apply. */
export function teacherListFilter(
  f: ThreadListFilter,
  phones: readonly string[],
): ThreadListFilter {
  const out: ThreadListFilter = { page: f.page, pageSize: f.pageSize, unread: false, phones };
  if (f.hide) out.hide = f.hide;
  if (f.search) out.search = f.search;
  if (f.sort === 'name') out.sort = 'name';
  if (f.sort === 'name' && f.dir) out.dir = f.dir;
  return out;
}

/** H1 search: a phone in any format → its digits; else the display name. */
export function threadSearchFilter(term: string): string | null {
  const digits = searchDigits(term);
  if (digits) return `phone_e164.ilike.*${digits}*`;
  const safe = orFilterTerm(term);
  return safe ? `display_name.ilike.*${safe}*` : null;
}
