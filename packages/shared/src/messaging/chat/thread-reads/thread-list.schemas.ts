import { LEAD_STATUSES } from '@ab/catalog';
import { listSortShape, pageQuery, pageOf } from '@ab/core';
import { z } from 'zod';
import { threadViewSchema } from './thread-view.schemas';

export const THREAD_SORT_KEYS = ['unread', 'name'] as const;
export const threadSortKeySchema = z.enum(THREAD_SORT_KEYS);
export type ThreadSortKey = z.infer<typeof threadSortKeySchema>;

/**
 * GET /threads (docs/12 §4 H1, docs/22): no `sort` = newest message first; `list` narrows to one
 * chat list and `status` to one lead stage (admin and sales; a teacher's list ignores both).
 */
export const threadListQuerySchema = z.object({
  ...pageQuery({ size: 25 }),
  search: z.string().trim().max(100).optional(),
  list: z.string().trim().max(100).optional(),
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  status: z.enum(LEAD_STATUSES).optional(),
  ...listSortShape(THREAD_SORT_KEYS),
});
export type ThreadListQuery = z.output<typeof threadListQuerySchema>;

export const threadPageSchema = pageOf(threadViewSchema);
