import { z } from 'zod';
import type { CancelBlock } from '@ab/money';

// «إلغاء الباقة» by the assistant (owner 2026-11-02): ANY student's unused package, behind
// subscriptions.stop (the key of «إلغاء الاشتراك»), with the admin's rules, write and audit.

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

/** POST /sales/packages/:id/cancel: the package, now «ملغاة» (never a price: maybe not hers). */
export const salesPackageCancelledSchema = z.object({
  id: z.string(),
  status: z.literal('cancelled'),
});
export type SalesPackageCancelled = z.infer<typeof salesPackageCancelledSchema>;
