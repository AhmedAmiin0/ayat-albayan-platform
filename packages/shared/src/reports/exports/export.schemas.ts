import { PAYMENT_KINDS, PAYMENT_METHODS } from '@ab/catalog';
import { dateRangeQuery, monthParam, monthQuery } from '@ab/money';
import { z } from 'zod';

/** Narrows payments.csv beside its Riyadh day range. */
export const paymentExportFilterSchema = z.object({
  studentId: z.uuid().optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  kind: z.enum(PAYMENT_KINDS).optional(),
});
export type PaymentExportFilter = z.infer<typeof paymentExportFilterSchema>;

export const paymentExportQuerySchema = dateRangeQuery.and(paymentExportFilterSchema);

/** 400 invalid_month for anything but `YYYY-MM`. */
export const payoutExportQuerySchema = monthQuery;

const yearParam = z.string().regex(/^\d{4}$/, 'invalid_year');

/** A month's expenses, or a whole year's. */
export const expenseExportQuerySchema = z.union([
  z.object({ month: monthParam }),
  z.object({ year: yearParam }),
]);
export type ExpenseExportQuery = z.infer<typeof expenseExportQuerySchema>;

/** The month's ledger sessions and payments, for one teacher or all. */
export const teacherLedgerExportQuerySchema = z.object({
  month: monthParam,
  teacherId: z.uuid().optional(),
});
export type TeacherLedgerExportQuery = z.infer<typeof teacherLedgerExportQuerySchema>;
