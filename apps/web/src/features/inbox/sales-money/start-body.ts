import { salesStartDate, type SalesStartProblem } from '@ab/shared';
import type { StartValue } from './SalesStartField';

/** The start fields of POST /sales/subscriptions: none without the permission (the API's default day). */
export type StartBody = { startsOn?: string; alreadyStarted?: true };

/**
 * The same rule as the API (salesStartDate) before posting: without subscriptions.set_start_date nothing is
 * sent; with it the day, plus `alreadyStarted` only when ticked.
 */
export function startBody(value: StartValue, opts: { canSet: boolean; today: string }): { ok: true; body: StartBody } | { ok: false; code: SalesStartProblem } {
  if (!opts.canSet) return { ok: true, body: {} };
  const res = salesStartDate({ startsOn: value.startsOn || undefined, alreadyStarted: value.alreadyStarted, canSet: true, today: opts.today });
  if (!res.ok) return res;
  return { ok: true, body: { startsOn: res.startsOn, ...(value.alreadyStarted ? { alreadyStarted: true as const } : {}) } };
}
