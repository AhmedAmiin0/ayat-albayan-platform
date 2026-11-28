import type { paymentListQuery } from '@ab/shared';
import { SETTING_DEFAULTS } from '@ab/settings';
import { DAY_MS, dayWallToUtc } from '@ab/time';
import type { z } from 'zod';
import type { PaymentFilter } from './payments.repo';

/** Ranges are local days in the academy's zone (settings.academy_timezone), inclusive (docs/11 §3). */
const DEFAULT_TZ = SETTING_DEFAULTS.academy_timezone;

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

export function paymentFilter(
  q: z.output<typeof paymentListQuery>,
  tz: string = DEFAULT_TZ,
): PaymentFilter {
  const { from, to, ...rest } = q;
  return { ...rest, ...utcWindow({ from, to }, tz) };
}
