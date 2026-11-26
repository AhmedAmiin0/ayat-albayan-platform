import { z } from 'zod';

/** changed: a new version since the listing (retried next night, never streamed past its cost). */
export const skipReasonSchema = z.enum(['missing', 'read_failed', 'changed']);
export type SkipReason = z.infer<typeof skipReasonSchema>;

/** Why an object was not backed up tonight (it is tried again every night). */
export const SKIP_WHYS = ['too_large', 'read_failed', 'changed', 'upload_failed'] as const;
export const skipWhySchema = z.enum(SKIP_WHYS);
export type SkipWhy = z.infer<typeof skipWhySchema>;
