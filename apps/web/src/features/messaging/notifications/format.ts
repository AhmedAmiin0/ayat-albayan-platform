import { clockOf, intlLocale } from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { dateAndClock, viewerZone } from '@/lib/clock-text';
import { locale } from '@/lib/i18n/locale';

// Bell row times (docs/07: viewer's zone, 12 or 24 h as the viewer chose, Western digits). Recent rows
// read relative («منذ 5 دقائق»), today's the clock, older ones day + month + clock; the full stamp is the tooltip.

const LOCALE = intlLocale(locale);
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const day = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });

const MINUTE = 60_000;

/** Short time of a row as of `now`. */
export function notificationTime(iso: string, clock: Clock, now: Date): string {
  const at = new Date(iso);
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / MINUTE));
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const time = clockOf(at, { ...clock, tz: viewerZone() });
  if (at.toDateString() === now.toDateString()) return time;
  return `${dayMonth.format(at)} ${time}`;
}

/** The whole stamp (tooltip). */
export const notificationStamp = (iso: string, clock: Clock): string => dateAndClock(day, new Date(iso), { ...clock, tz: viewerZone() });
