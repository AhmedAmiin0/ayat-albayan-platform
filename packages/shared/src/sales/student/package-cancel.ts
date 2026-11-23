import { z } from 'zod';
import type { CancelBlock } from '@ab/money';

// The assistant cancels any student's unused package behind subscriptions.stop, with audit.

const BLOCKS = [
  'already_cancelled',
  'has_payments',
  'has_lessons',
  'has_commission',
] as const satisfies readonly CancelBlock[];

/** The `:id` of /sales/packages/:id/cancel (the subscription). */
export const salesPackageIdSchema = z.uuid();

/** GET /sales/packages/:id/cancel: why the POST would answer 409 (its code), or null. */
export const salesPackageCancelCheckSchema = z.object({
  subscriptionId: z.string(),
  block: z.enum(BLOCKS).nullable(),
});
export type SalesPackageCancelCheck = z.infer<typeof salesPackageCancelCheckSchema>;

/** The cancelled package, never with a price since it may not be hers. */
export const salesPackageCancelledSchema = z.object({
  id: z.string(),
  status: z.literal('cancelled'),
});
export type SalesPackageCancelled = z.infer<typeof salesPackageCancelledSchema>;
