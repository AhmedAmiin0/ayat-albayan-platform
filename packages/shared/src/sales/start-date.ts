// The subscription start day of the sales subscribe (owner 2026-10-12, docs/16 row 24). Pure: the API
// enforces it, web and mobile use it to show the same error before posting.
// Without subscriptions.set_start_date: the default day (today, Riyadh: the admin form's default too); an
// explicit other day is 403 start_date_not_allowed. With it: today or later, or a PAST day only when
// «بدأ الاشتراك سابقًا» is ticked (a student who subscribed before the platform), at most a year back.

/** How far back «بدأ الاشتراك سابقًا» may go. */
export const SALES_START_BACK_DAYS = 365;

export type SalesStartProblem = 'start_date_not_allowed' | 'start_date_past' | 'start_date_too_old';

export interface SalesStartInput {
  /** YYYY-MM-DD as sent; undefined = the default day. */
  startsOn?: string | undefined;
  alreadyStarted?: boolean | undefined;
  /** Holds subscriptions.set_start_date. */
  canSet: boolean;
  /** Today in the academy's zone, YYYY-MM-DD (the default day). */
  today: string;
}

export type SalesStartResult = { ok: true; startsOn: string } | { ok: false; code: SalesStartProblem };

/** YYYY-MM-DD minus n days. */
export function daysBefore(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
}

export function salesStartDate(input: SalesStartInput): SalesStartResult {
  const { startsOn, today } = input;
  if (!input.canSet) {
    if ((startsOn === undefined || startsOn === today) && !input.alreadyStarted) return { ok: true, startsOn: today };
    return { ok: false, code: 'start_date_not_allowed' };
  }
  if (startsOn === undefined || startsOn >= today) return { ok: true, startsOn: startsOn ?? today };
  if (!input.alreadyStarted) return { ok: false, code: 'start_date_past' };
  if (startsOn < daysBefore(today, SALES_START_BACK_DAYS)) return { ok: false, code: 'start_date_too_old' };
  return { ok: true, startsOn };
}
