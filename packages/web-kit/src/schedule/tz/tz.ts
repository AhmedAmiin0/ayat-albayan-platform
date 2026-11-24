import { dateText } from '@ab/shared';
import { locale } from '@ab/web-kit/lib/i18n/locale';

// Date labels for the schedule screens (R-SCH-01, rule 6). The zone math they used to sit beside
// (zonedPartsIn, weekDates, weekWindowIn, wallInstant) lives in @ab/time behind @ab/shared (k3b).

const atUtcMidnight = (date: string): Date => new Date(`${date}T00:00:00Z`);
const UTC_DAY = { tz: 'UTC', locale } as const;
const DAY_MONTH_YEAR = { day: 'numeric', month: 'long', year: 'numeric' } as const;

/** Western digits. */
export function dayMonthLabel(date: string): string {
  return dateText(atUtcMidnight(date), UTC_DAY, { day: 'numeric', month: 'long' });
}

/** Shown under native date inputs, whose OS-locale format misleads admins. */
export function dateLabel(date: string): string {
  return date ? dateText(atUtcMidnight(date), UTC_DAY, DAY_MONTH_YEAR) : '';
}

const WEEKDAY_DAY_MONTH = { weekday: 'long', day: 'numeric', month: 'long' } as const;

export const dayIn = (tz: string) => (instant: string): string =>
  dateText(new Date(instant), { tz, locale }, WEEKDAY_DAY_MONTH).replace(/[،,]\s*/, ' ');
