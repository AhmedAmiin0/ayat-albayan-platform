import { dateText } from '@ab/shared';
import { locale } from '@ab/web-kit/lib/i18n/locale';

// Date labels for the schedule screens (R-SCH-01, rule 6). The zone math they used to sit beside
// (zonedPartsIn, weekDates, weekWindowIn, wallInstant) lives in @ab/time behind @ab/shared (k3b).

const atUtcMidnight = (date: string): Date => new Date(`${date}T00:00:00Z`);
const UTC_DAY = { tz: 'UTC', locale } as const;
const DAY_MONTH_YEAR = { day: 'numeric', month: 'long', year: 'numeric' } as const;

/** «3 أكتوبر» for a local date (Western digits). */
export function dayMonthLabel(date: string): string {
  return dateText(atUtcMidnight(date), UTC_DAY, { day: 'numeric', month: 'long' });
}

/**
 * «3 أكتوبر 2026» for a local date: shown under native date inputs, which print the OS locale
 * («10/02/2026» reads as 10 February to an Egyptian or Saudi admin).
 */
export function dateLabel(date: string): string {
  return date ? dateText(atUtcMidnight(date), UTC_DAY, DAY_MONTH_YEAR) : '';
}

const WEEKDAY_DAY_MONTH = { weekday: 'long', day: 'numeric', month: 'long' } as const;

/** «الأحد 22 نوفمبر» of an instant in `tz` («الدورة والباقة»'s lessons, owner 2026-11-17). */
export const dayIn = (tz: string) => (instant: string): string =>
  dateText(new Date(instant), { tz, locale }, WEEKDAY_DAY_MONTH).replace(/[،,]\s*/, ' ');
