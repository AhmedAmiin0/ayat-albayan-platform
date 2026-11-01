import { DAY_MS, dayWallToUtc, listSortShape, localDate, PAYMENT_KINDS, PAYMENT_METHODS, PAYMENT_SORT_KEYS, SETTING_DEFAULTS } from '@ab/shared';
import { z } from 'zod';
import { pageQuerySchema } from '@/common/http/http';
import type { PaymentFilter } from './payments.queries';

/** Ranges are local days in the academy's zone (settings.academy_timezone), inclusive (docs/11 §3). */
const DEFAULT_TZ = SETTING_DEFAULTS.academy_timezone;

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
export function utcWindow(
  q: { from?: string | undefined; to?: string | undefined },
  tz: string = DEFAULT_TZ,
): { from?: string; to?: string } {
  const at = (day: string, plusDays: number) =>
    new Date(dayWallToUtc(Date.parse(day) + plusDays * DAY_MS, 0, tz)).toISOString();
  return {
    ...(q.from ? { from: at(q.from, 0) } : {}),
    ...(q.to ? { to: at(q.to, 1) } : {}),
  };
}

export function paymentFilter(q: z.output<typeof paymentListQuery>, tz: string = DEFAULT_TZ): PaymentFilter {
  const { from, to, ...rest } = q;
  return { ...rest, ...utcWindow({ from, to }, tz) };
}
