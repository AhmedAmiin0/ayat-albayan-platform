import {
  ALL_PAYMENT_METHODS,
  DURATIONS,
  PACKAGE_SIZES,
  PAYMENT_KINDS,
  STUDENT_STATUSES,
  SUBSCRIPTION_STATUSES,
} from '@ab/catalog';
import { id } from '@ab/core';
import { quoteSchema } from '@ab/money';
import { z } from 'zod';

// Whitelisted answers of the salesperson's package and transfer writes (docs/16 rows 16-19): never
// the fx internals, the quote source, notes or another family's data.

/** An active teacher offered to her, by name only. */
export const salesTeacherOptionSchema = z.object({ id: id(), name: z.string() });
export type SalesTeacherOption = z.infer<typeof salesTeacherOptionSchema>;

/** The quote she tells the family: the price to transfer, nothing about how it was converted. */
export const salesQuoteViewSchema = quoteSchema.pick({
  package: true,
  lessons: true,
  duration: true,
  currency: true,
  discount: true,
  afterDiscount: true,
  perLesson: true,
});
export type SalesQuoteView = z.infer<typeof salesQuoteViewSchema>;

export const salesStudentRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});
export type SalesStudentRef = z.infer<typeof salesStudentRefSchema>;

/** A package of her student: what it costs, what was paid, what is still due. */
export const salesMoneySubscriptionViewSchema = z.object({
  id: z.string(),
  student: salesStudentRefSchema,
  /** null = a custom lesson count. */
  package: z.enum(PACKAGE_SIZES).nullable(),
  duration: z.literal(DURATIONS),
  lessons_total: z.number(),
  /** Taken before the platform; absent from older APIs. */
  lessons_used_before: z.number().optional(),
  price: z.number(),
  currency: z.string(),
  starts_on: z.string(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  paid: z.number(),
  /** max(0, price − paid). */
  due: z.number(),
});
export type SalesMoneySubscriptionView = z.infer<typeof salesMoneySubscriptionViewSchema>;

/** The transfer she recorded and the student's status right after it. */
export const salesPaymentViewSchema = z.object({
  id: z.string(),
  subscription_id: z.string(),
  student: salesStudentRefSchema.extend({ status: z.enum(STUDENT_STATUSES) }),
  /** Always the package currency: her transfer is recorded in it only (400 currency_mismatch). */
  amount: z.number(),
  currency: z.string(),
  method: z.enum(ALL_PAYMENT_METHODS),
  kind: z.enum(PAYMENT_KINDS),
  paid_at: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
});
export type SalesPaymentView = z.infer<typeof salesPaymentViewSchema>;

/** The receipt path to send with POST /sales/payments. */
export const salesReceiptCopiedSchema = z.object({ receipt_path: z.string() });
export type SalesReceiptCopied = z.infer<typeof salesReceiptCopiedSchema>;
