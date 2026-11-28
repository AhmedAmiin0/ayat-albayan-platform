import { STUDENT_STATUSES } from '@ab/catalog';
import { renewalPricingSchema } from '@ab/money';
import { z } from 'zod';
import type { ThreadFile, ThreadMediaItem } from '../messaging';
import { salesMoneySubscriptionViewSchema, salesStudentRefSchema } from './student-file';

// Whitelisted answers of the salesperson's money reads (docs/16): only her student and the
// package she is creating or paying, never the fx internals, the quote source, notes or another
// family's data.

/** One child of this chat's family (all of them with sales.renew_any), with its packages owed. */
export const salesFamilyStudentSchema = salesStudentRefSchema.extend({
  status: z.enum(STUDENT_STATUSES),
  /**
   * false: not hers, listed through sales.renew_any. Absent from old APIs = hers; true for every
   * child while SalesOwnershipRule does not enforce ownership.
   */
  mine: z.boolean().optional(),
  open: z.array(salesMoneySubscriptionViewSchema),
  /** Renewal is her primary action: the package ended or is down to the renewal alert. */
  renew_due: z.boolean(),
  /** From the last priced package (renewalPricing; pill discounts only). */
  renewal: renewalPricingSchema,
  /** students.teacher_id (the trial's teacher until she picks another), the picker's default. */
  teacher_id: z.string().nullable(),
});
export type SalesFamilyStudent = z.infer<typeof salesFamilyStudentSchema>;

export const salesFamilyViewSchema = z.object({ students: z.array(salesFamilyStudentSchema) });
export type SalesFamilyView = z.infer<typeof salesFamilyViewSchema>;

/** One image / PDF the family sent in its chat (metadata only; the file through /:messageId). */
export type SalesChatReceipt = ThreadMediaItem;

/** A short-lived signed URL of one chat file (a thumbnail). */
export type SalesChatReceiptFile = ThreadFile;
