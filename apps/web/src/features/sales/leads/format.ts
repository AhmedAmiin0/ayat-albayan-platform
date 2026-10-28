import { intlLocale } from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { dateAndClock, viewerZone } from '@/lib/clock-text';
import { locale } from '@/lib/i18n/locale';

// Display helpers for the inbox. DB times are UTC; these render in the viewer's zone (rule 6).
// `nu-latn` (in intlLocale): Western digits everywhere (docs/07 §2 Numerals), either language.
const LOCALE = intlLocale(locale);
const dateOnly = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** «03/10/2026، 14:05»: the day, then the clock in the viewer's cycle (12 or 24 h). */
export function formatDateTime(iso: string | null, clock: Clock): string {
  return iso ? dateAndClock(dateOnly, new Date(iso), { ...clock, tz: viewerZone() }) : '—';
}

/** A day with no time (e.g. an application date: minutes add nothing, and need no zone). */
export function formatDate(iso: string | null): string {
  return iso ? dateOnly.format(new Date(iso)) : '—';
}

/** Lead age as relative time ("قبل 3 أيام"): minutes under an hour, hours under a day. */
export function formatAge(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  if (ms < HOUR) return relative.format(-Math.floor(ms / MINUTE), 'minute');
  if (ms < DAY) return relative.format(-Math.floor(ms / HOUR), 'hour');
  return relative.format(-Math.floor(ms / DAY), 'day');
}
