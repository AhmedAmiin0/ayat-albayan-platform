import { DURATIONS, PACKAGE_SIZES, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { id } from '@ab/core';
import { quoteSchema } from '@ab/money';
import { z } from 'zod';

// Whitelisted answers of the salesperson's package writes (docs/16 row 16): never the fx
// internals, the quote source, notes or another family's data.

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
