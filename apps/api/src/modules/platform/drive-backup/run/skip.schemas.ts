import { z } from 'zod';

/** changed: a new version since the listing (retried next night, never streamed past its cost). */
export const skipReasonSchema = z.enum(['missing', 'read_failed', 'changed']);
export type SkipReason = z.infer<typeof skipReasonSchema>;
