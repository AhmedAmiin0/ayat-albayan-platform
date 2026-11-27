import { dateText } from '@ab/time';
import { locale } from '@ab/web-kit/lib/i18n/locale';

/** A calendar month, no zone. */
export const monthName = (month: string): string =>
  dateText(
    new Date(`${month}-01T00:00:00Z`),
    { tz: 'UTC', locale },
    { month: 'long', year: 'numeric' },
  );

export const noMonths = (months: readonly unknown[]): boolean => months.length === 0;
