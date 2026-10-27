import { clockOf, clockOfHhmm } from '@ab/shared';
import type { Clock } from './clock';

// Date + clock on screens: the date from Intl, the clock from the shared formatter (our own ص / م and
// AM / PM on every browser), joined the way Intl joins them, so 24 h reads exactly as before.

const JOIN = { ar: '، ', en: ', ' } as const;

/** The browser's zone: the inbox, bell and logs show times where the viewer is. */
export const viewerZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** «03/10/2026، 2:05 م»: `date` formats the day (no hour in its options), then the clock in `tz`. */
export function dateAndClock(date: Intl.DateTimeFormat, at: Date, clock: Clock & { tz: string }): string {
  return `${date.format(at)}${JOIN[clock.locale]}${clockOf(at, clock)}`;
}

/** The direction of a clock island: LTR as before, RTL for Arabic 12 h («5:30 م» reads right to left). */
export const clockDir = (clock: Clock): 'ltr' | 'rtl' => (clock.locale === 'ar' && clock.cycle === '12' ? 'rtl' : 'ltr');

const seconds = new Map<string, Intl.DateTimeFormat>();

/** «14:05:33» / «2:05:33 م»: the clock with seconds (the activity log). */
export function clockWithSeconds(at: Date, clock: Clock & { tz: string }): string {
  let f = seconds.get(clock.tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { second: '2-digit', timeZone: clock.tz });
    seconds.set(clock.tz, f);
  }
  const ss = (f.formatToParts(at).find((p) => p.type === 'second')?.value ?? '0').padStart(2, '0');
  return clockOf(at, clock).replace(/^(\d{1,2}:\d{2})/, `$1:${ss}`);
}

/** A stored «HH:MM» on screen in the viewer's cycle; «24:00» (a span to midnight) stays as is in 24 h. */
export const hhmmText = (hhmm: string, clock: Clock): string =>
  hhmm === '24:00' && clock.cycle === '24' ? hhmm : clockOfHhmm(hhmm, clock.cycle, clock.locale);
