import {
  clockOf,
  clockOfHhmm,
  dateText,
  engineTimeZone,
  zonedFieldsIn,
  type DateFields,
} from '@ab/shared';
import { locale } from './i18n/locale';
import type { Clock } from './clock';

// Date from Intl, clock from the shared formatter, joined as Intl joins them so 24 h is unchanged.

const JOIN = { ar: '، ', en: ', ' } as const;

/** The browser's zone: the inbox, bell and logs show times where the viewer is. */
export const viewerZone = (): string => engineTimeZone() ?? 'UTC';

/** The day's `fields` (no hour) in the UI language, then the clock in `tz`. */
export function dateAndClock(at: Date, clock: Clock & { tz: string }, fields: DateFields): string {
  const day = dateText(at, { tz: clock.tz, locale }, fields);
  return `${day}${JOIN[clock.locale]}${clockOf(at, clock)}`;
}

/** LTR, except Arabic 12 h which reads right to left. */
export const clockDir = (clock: Clock): 'ltr' | 'rtl' => (clock.locale === 'ar' && clock.cycle === '12' ? 'rtl' : 'ltr');

/** The clock with seconds, for the activity log. */
export function clockWithSeconds(at: Date, clock: Clock & { tz: string }): string {
  const ss = String(zonedFieldsIn(at, clock.tz).second).padStart(2, '0');
  return clockOf(at, clock).replace(/^(\d{1,2}:\d{2})/, `$1:${ss}`);
}

/** A stored «HH:MM» on screen in the viewer's cycle; «24:00» (a span to midnight) stays as is in 24 h. */
export const hhmmText = (hhmm: string, clock: Clock): string =>
  hhmm === '24:00' && clock.cycle === '24' ? hhmm : clockOfHhmm(hhmm, clock.cycle, clock.locale);
