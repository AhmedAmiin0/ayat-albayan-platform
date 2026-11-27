import { dateText } from '@ab/time';
import { locale } from '@ab/web-kit';

const MONTH = { month: 'long', year: 'numeric' } as const;

/** Mid-month noon UTC names the same month on every clock. */
export const monthTitle = (month: string) =>
  dateText(new Date(`${month}-15T12:00:00Z`), { tz: 'UTC', locale }, MONTH);
