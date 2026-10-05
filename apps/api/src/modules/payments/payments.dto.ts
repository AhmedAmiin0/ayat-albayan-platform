import { localDate, PAYMENT_KINDS, PAYMENT_METHODS } from '@ab/shared';
import { z } from 'zod';
import { pageQuerySchema } from '../teachers/http';
import { DAY, zonedToUtc } from '../teachers/availability/zoned-time';
import type { PaymentFilter } from './payments.queries';

/** Ranges are local days in Asia/Riyadh, inclusive (docs/11 §3). */
const RANGE_TZ = 'Asia/Riyadh';

/** GET /payments?subscriptionId&studentId&from&to&method&kind&page&pageSize (P1). */
export const paymentListQuery = pageQuerySchema
  .extend({
    subscriptionId: z.uuid().optional(),
    studentId: z.uuid().optional(),
    from: localDate.optional(),
    to: localDate.optional(),
    method: z.enum(PAYMENT_METHODS).optional(),
    kind: z.enum(PAYMENT_KINDS).optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'invalid_range', path: ['to'] });

/** Local `from`/`to` days → the half-open UTC window [from 00:00, to + 1 day 00:00). */
export function paymentFilter(q: z.output<typeof paymentListQuery>): PaymentFilter {
  const { from, to, ...rest } = q;
  const at = (day: string, plusDays: number) =>
    new Date(zonedToUtc(Date.parse(day) + plusDays * DAY, 0, RANGE_TZ)).toISOString();
  return {
    ...rest,
    ...(from ? { from: at(from, 0) } : {}),
    ...(to ? { to: at(to, 1) } : {}),
  };
}
