import { pageQuery } from '@ab/core';
import { z } from 'zod';

/** GET /admin-tasks?open=true&page&pageSize (S7): open tasks unless open=false. */
export const adminTaskListQuerySchema = z.object({
  ...pageQuery({ size: 25 }),
  open: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});
export type AdminTaskListQuery = z.infer<typeof adminTaskListQuerySchema>;
export type AdminTaskListQueryInput = z.input<typeof adminTaskListQuerySchema>;
