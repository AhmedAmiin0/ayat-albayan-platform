import { LEAD_STATUSES, PACKAGE_SIZES, STUDENT_STATUSES, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { id, localDate } from '@ab/core';
import { z } from 'zod';

const count = z.number().int();

/** A student's newest package (FIFO) with the money and lesson numbers of the BalanceCard. */
export const threadSubscriptionViewSchema = z.object({
  id: id(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  /** null = a custom lesson count. */
  package_size: z.enum(PACKAGE_SIZES).nullable(),
  /** Lessons across all the student's packages, fed to packageProgress like studentProgress. */
  lessons_total: count,
  lessons_used: count,
  /** lessons_total − lessons_used; negative = attended past every package. */
  lessons_remaining: count,
  /** This package's price after discount, in `currency`. */
  price: z.number(),
  currency: z.string(),
  paid_amount: z.number(),
  /** max(0, price − paid_amount). */
  due_amount: z.number(),
  renews_on: localDate.nullable(),
  starts_on: localDate,
});
export type ThreadSubscriptionView = z.infer<typeof threadSubscriptionViewSchema>;

export const threadStudentViewSchema = z.object({
  id: id(),
  name: z.string(),
  code: z.string(),
  teacher_name: z.string().nullable(),
  status: z.enum(STUDENT_STATUSES),
  /** null = no package yet (subscribe). */
  subscription: threadSubscriptionViewSchema.nullable(),
});
export type ThreadStudentView = z.infer<typeof threadStudentViewSchema>;

/**
 * GET /threads/:phone `people` (R-SUB-01, R-LEAD-02): the guardian whose phone is the chat, the
 * lead, and every student of the guardian, oldest first ([] without a guardian).
 */
export const threadPeopleSchema = z.object({
  guardian: z.object({ id: id(), name: z.string() }).nullable(),
  lead: z.object({ id: id(), status: z.enum(LEAD_STATUSES) }).nullable(),
  students: z.array(threadStudentViewSchema),
});
export type ThreadPeople = z.infer<typeof threadPeopleSchema>;
