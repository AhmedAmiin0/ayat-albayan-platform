import { listSortShape, localDate, PAYMENT_KINDS, PAYMENT_METHODS, PAYMENT_SORT_KEYS } from '@ab/shared';
import { z } from 'zod';
import { pageQuerySchema } from '../teachers/http';
import { DAY, zonedToUtc } from '../teachers/availability/zoned-time';
import type { PaymentFilter } from './payments.queries';

/** Ranges are local days in Asia/Riyadh, inclusive (docs/11 §3). */
const RANGE_TZ = 'Asia/Riyadh';

/** GET /payments?subscriptionId&studentId&from&to&method&kind&sort&dir&page&pageSize (P1, R-NFR-08). */
export const paymentListQuery = pageQuerySchema
  .extend({
    subscriptionId: z.uuid().optional(),
    studentId: z.uuid().optional(),
    from: localDate.optional(),
    to: localDate.optional(),
    method: z.enum(PAYMENT_METHODS).optional(),
    kind: z.enum(PAYMENT_KINDS).optional(),
    ...listSortShape(PAYMENT_SORT_KEYS),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'invalid_range', path: ['to'] });

/** Local `from`/`to` days → the half-open UTC window [from 00:00, to + 1 day 00:00). */
export function utcWindow(q: { from?: string | undefined; to?: string | undefined }): { from?: string; to?: string } {
  const at = (day: string, plusDays: number) =>
    new Date(zonedToUtc(Date.parse(day) + plusDays * DAY, 0, RANGE_TZ)).toISOString();
  return {
    ...(q.from ? { from: at(q.from, 0) } : {}),
    ...(q.to ? { to: at(q.to, 1) } : {}),
  };
}

export function paymentFilter(q: z.output<typeof paymentListQuery>): PaymentFilter {
  const { from, to, ...rest } = q;
  return { ...rest, ...utcWindow({ from, to }) };
}
