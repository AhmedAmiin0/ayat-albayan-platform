import { dateText } from '@ab/shared';
import { locale } from '@/core/lib/i18n/locale';

// The month header's words in the UI language (Western digits, as the rest of the app). Pure.

/** `YYYY-MM` → «نوفمبر 2026» (the academy calendar: the UTC day of a YYYY-MM-DD). */
export function monthTitle(month: string): string {
  const at = new Date(`${month}-01T12:00:00Z`);
  return dateText(at, { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });
}
