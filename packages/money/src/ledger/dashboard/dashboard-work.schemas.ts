import { LESSON_STATUSES, PACKAGE_SIZES } from '@ab/catalog';
import { instant, localDate } from '@ab/core';
import { z } from 'zod';
import { adminTaskViewSchema } from '../tasks/admin-task.schemas';

// GET /dashboard/work: the admin's queue behind the KPI strip (docs/07 §6).

/** The work panel's tabs, in screen order. */
export const WORK_TABS = ['reports', 'unpaid', 'tasks'] as const;
export const workTabSchema = z.enum(WORK_TABS);

/** owes: money is still due; renewal_due: paid in full and used up, a new package is due. */
export const UNPAID_REASONS = ['owes', 'renewal_due'] as const;
export const unpaidReasonSchema = z.enum(UNPAID_REASONS);

/** Oldest first; see WorkList. */
const workListOf = <T extends z.ZodType>(item: T) =>
  z.object({ total: z.number(), items: item.array() });

export const workStudentRefSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const pendingReportRowSchema = z.object({
  lesson_id: z.string(),
  starts_at: instant,
  status: z.enum(LESSON_STATUSES),
  teacher: z.object({ id: z.string(), display_name_ar: z.string() }),
  student: workStudentRefSchema,
});

export const unpaidRowSchema = z.object({
  id: z.string(),
  student: workStudentRefSchema,
  package: z.enum(PACKAGE_SIZES).nullable(),
  lessons_total: z.number(),
  price: z.number(),
  /** Sum of its payments, in `currency`. */
  paid: z.number(),
  /** price − paid, never below 0. */
  owed: z.number(),
  reason: unpaidReasonSchema,
  currency: z.string(),
  starts_on: localDate,
});

/** A task plus its package's use, so the UI can word the lessons left. */
export const taskRowSchema = adminTaskViewSchema.extend({
  balance: z.object({ used: z.number(), total: z.number() }).nullable(),
});

export const dashboardWorkSchema = z.object({
  pending_reports: workListOf(pendingReportRowSchema),
  unpaid: workListOf(unpaidRowSchema),
  tasks: workListOf(taskRowSchema),
});

export type WorkTab = z.infer<typeof workTabSchema>;
export type UnpaidReason = z.infer<typeof unpaidReasonSchema>;
export type WorkStudentRef = z.infer<typeof workStudentRefSchema>;
export type PendingReportRow = z.infer<typeof pendingReportRowSchema>;
export type UnpaidRow = z.infer<typeof unpaidRowSchema>;
export type TaskRow = z.infer<typeof taskRowSchema>;
export type DashboardWork = z.infer<typeof dashboardWorkSchema>;
