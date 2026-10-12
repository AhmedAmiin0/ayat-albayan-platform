import { intlLocale } from '@ab/shared';
import { locale } from '@/lib/locale';

// Bell row times (docs/07: viewer's zone, 24h, Western digits). Recent rows read relative
// («منذ 5 دقائق»), today's the clock, older ones day + month + clock; the full stamp is the tooltip.

const LOCALE = intlLocale(locale);
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const clock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const full = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' });

const MINUTE = 60_000;

/** Short time of a row as of `now`. */
export function notificationTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / MINUTE));
  if (minutes < 60) return relative.format(-minutes, 'minute');
  if (at.toDateString() === now.toDateString()) return clock.format(at);
  return `${dayMonth.format(at)} ${clock.format(at)}`;
}

/** The whole stamp (tooltip). */
export const notificationStamp = (iso: string): string => full.format(new Date(iso));
