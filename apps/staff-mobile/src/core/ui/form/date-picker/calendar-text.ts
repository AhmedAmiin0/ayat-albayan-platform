import { dateText } from '@ab/time';
import { locale } from '@ab/mobile-kit';

// The month header's words in the UI language (Western digits, as the rest of the app). Pure.

/** The academy calendar: the UTC day of a YYYY-MM-DD. */
export function monthTitle(month: string): string {
  const at = new Date(`${month}-01T12:00:00Z`);
  return dateText(at, { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });
}
