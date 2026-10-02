import { intlLocale } from '@ab/shared';
import { locale } from '@/lib/locale';

// Display helpers for the inbox. DB times are UTC; these render in the viewer's zone (rule 6).
// `nu-latn` (in intlLocale): Western digits everywhere (docs/07 §2 Numerals), either language.
const LOCALE = intlLocale(locale);
// 24h like every other time in the product (running head, availability).
const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' });
const dateOnly = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
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

const KUNYA = /^(أم|ام|أبو|ابو)\s+/;

/** Avatar letter: first letter of the name, skipping a kunya («أم سلمى» → «س»). Empty if unnamed. */
export function initialOf(name: string | null): string {
  const bare = (name ?? '').trim().replace(KUNYA, '');
  return [...bare][0] ?? '';
}
