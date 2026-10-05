import { INVOICE_SORT_KEYS, listSortShape, localDate, SETTING_DEFAULTS, type ListSort } from '@ab/shared';
import { z } from 'zod';
import { utcWindow } from '../payments/payments.dto';
import { pageQuerySchema, type PageQuery } from '../teachers/http';

export type InvoiceSortKey = (typeof INVOICE_SORT_KEYS)[number];

/** GET /invoices/recent?from&to (Riyadh days, inclusive)&kind&student&sort&dir&page&pageSize (R-NFR-08). */
export const invoiceRecentQuery = pageQuerySchema
  .extend({
    from: localDate.optional(),
    to: localDate.optional(),
    kind: z.enum(['package', 'makeup']).optional(),
    /** Part of a student's name (any student on the invoice's booking). */
    student: z.string().trim().min(1).max(100).optional(),
    ...listSortShape(INVOICE_SORT_KEYS),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'invalid_range', path: ['to'] });

export type RecentFilter = PageQuery &
  ListSort<InvoiceSortKey> & {
    /** ISO instants, half-open [from, to). */
    from?: string;
    to?: string;
    kind?: 'package' | 'makeup';
    student?: string;
  };

/** `tz`: settings.academy_timezone (the days are the academy's). */
export function recentFilter(q: z.output<typeof invoiceRecentQuery>, tz: string = SETTING_DEFAULTS.academy_timezone): RecentFilter {
  const { from, to, ...rest } = q;
  return { ...rest, ...utcWindow({ from, to }, tz) };
}
