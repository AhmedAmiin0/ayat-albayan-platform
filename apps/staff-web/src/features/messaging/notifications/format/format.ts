import { intlLocale } from '@ab/core';
import { clockOf, dateText, localDateIn } from '@ab/time';
import type { Clock } from '@ab/web-kit/lib/clock';
import { dateAndClock, viewerZone } from '@ab/web-kit/lib/clock-text';
import { locale } from '@ab/web-kit/lib/i18n/locale';

// docs/07: viewer's zone and clock cycle with Western digits; recent rows read relative.

const LOCALE = intlLocale(locale);
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const DAY_MONTH = { day: 'numeric', month: 'short' } as const;

const MINUTE = 60_000;

/** Short time of a row as of `now`. */
export function notificationTime(iso: string, clock: Clock, now: Date): string {
  const at = new Date(iso);
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / MINUTE));
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const tz = viewerZone();
  const time = clockOf(at, { ...clock, tz });
  if (localDateIn(at, tz) === localDateIn(now, tz)) return time;
  return `${dateText(at, { tz, locale }, DAY_MONTH)} ${time}`;
}

/** The whole stamp (tooltip). */
export const notificationStamp = (iso: string, clock: Clock): string => dateAndClock(new Date(iso), { ...clock, tz: viewerZone() }, { dateStyle: 'medium' });
