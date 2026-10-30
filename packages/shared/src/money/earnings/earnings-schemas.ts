import { z } from 'zod';
import { PAYMENT_METHODS } from '../../enums/index.js';
import { optionalText } from '../../core/schemas/common.js';
import { listSortShape } from '../../core/schemas/list-sort.js';
import { EARNING_STATUSES } from './earnings.js';
import { EARNING_SORT_KEYS, TEACHER_PAYMENT_SORT_KEYS } from '../list-sorts.js';
import { moneyAmount, pastInstant, RECEIPT_MAX_BYTES, RECEIPT_MIMES } from '../schemas.js';

/**
 * POST /teacher-earnings/:teacherId/payments. `earningIds` = the ticked sessions (omitted → every
 * session with something outstanding); the amount is spread oldest first, and may be less than
 * their total (a partial payment) but never more.
 */
export const teacherPaymentCreateSchema = z.object({
  amount: moneyAmount,
  method: z.enum(PAYMENT_METHODS),
  paidAt: pastInstant,
  earningIds: z.array(z.uuid()).min(1).max(500).optional(),
  receiptPath: z.string().min(1).nullish(),
  note: optionalText,
  /** Once per pay dialog, re-sent on every retry (rule 8). */
  clientRequestId: z.uuid().optional(),
});

export const teacherReceiptUploadSchema = z.object({
  mime: z.enum(RECEIPT_MIMES, { message: 'receipt_type' }),
  size: z.int().min(1).max(RECEIPT_MAX_BYTES, { message: 'receipt_too_large' }),
});

const pageShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

/** GET .../sessions: `unpaid` = earned + partially_paid; `sort`/`dir` (R-NFR-08). */
export const earningsListQuery = z.object({
  status: z.enum([...EARNING_STATUSES, 'unpaid']).optional(),
  ...pageShape,
  ...listSortShape(EARNING_SORT_KEYS),
});

/** GET .../payments: method, voided (`true` = only voided, `false` = only standing), note contains, sort. */
export const teacherPaymentListQuery = z.object({
  method: z.enum(PAYMENT_METHODS).optional(),
  voided: z.enum(['true', 'false']).optional(),
  note: z.string().trim().min(1).max(100).optional(),
  ...pageShape,
  ...listSortShape(TEACHER_PAYMENT_SORT_KEYS),
});

export const teacherResyncSchema = z.object({ teacherId: z.uuid().optional() });

export type TeacherPaymentCreate = z.output<typeof teacherPaymentCreateSchema>;
export type TeacherReceiptUpload = z.output<typeof teacherReceiptUploadSchema>;
export type EarningsListQuery = z.output<typeof earningsListQuery>;
export type TeacherPaymentListQuery = z.output<typeof teacherPaymentListQuery>;
