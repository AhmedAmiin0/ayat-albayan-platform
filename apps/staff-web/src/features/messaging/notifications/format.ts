import { clockOf, dateText, intlLocale, localDateIn } from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { dateAndClock, viewerZone } from '@/lib/clock-text';
import { locale } from '@/lib/i18n/locale';

// Bell row times (docs/07: viewer's zone, 12 or 24 h as the viewer chose, Western digits). Recent rows
// read relative («منذ 5 دقائق»), today's the clock, older ones day + month + clock; the full stamp is the tooltip.

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
