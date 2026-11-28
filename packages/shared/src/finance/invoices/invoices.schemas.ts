import { listSortShape, localDate, pageOf, pageQuery } from '@ab/core';
import { INVOICE_SORT_KEYS } from '@ab/money';
import { BOOKING_KINDS, invoiceViewSchema } from '@ab/schedule';
import { z } from 'zod';

/** GET /invoices: one booking (`ruleId`) or every booking of a student (`studentId`), not both. */
export const invoiceListQuerySchema = z
  .object({ ruleId: z.uuid().optional(), studentId: z.uuid().optional() })
  .refine((q) => (q.ruleId === undefined) !== (q.studentId === undefined), {
    message: 'rule_or_student',
    path: ['ruleId'],
  });
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

/** GET /invoices/recent: academy days, inclusive (R-NFR-08); newest first unless sorted. */
export const invoiceRecentQuerySchema = z
  .object({
    ...pageQuery({ size: 25 }),
    from: localDate.optional(),
    to: localDate.optional(),
    kind: z.enum(BOOKING_KINDS).exclude(['trial']).optional(),
    /** Part of a student's name (any student on the invoice's booking). */
    student: z.string().trim().min(1).max(100).optional(),
    ...listSortShape(INVOICE_SORT_KEYS),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'invalid_range', path: ['to'] });
export type InvoiceRecentQuery = z.infer<typeof invoiceRecentQuerySchema>;
export type InvoiceRecentQueryInput = z.input<typeof invoiceRecentQuerySchema>;

export const invoiceRecentPageSchema = pageOf(invoiceViewSchema);
export type InvoiceRecentPage = z.infer<typeof invoiceRecentPageSchema>;
