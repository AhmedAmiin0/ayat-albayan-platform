import { RIYADH_TZ, type ClockCycle } from '../clock/index.js';
import type { Locale } from '@ab/core';
import { clockOf, dateText } from './format.js';
import { localDateIn, weekdayIn } from '../zone/index.js';

// The academy's own calendar (docs/11 §3): Riyadh days and times of UTC instants, Western digits
// (the date-fns facade: zoned.ts, format.ts).
// Shared by both apps (docs/27 E6); the words (weekday names, UI language) are injected.

/** Today on the Riyadh calendar, "YYYY-MM-DD" (ranges and weeks are Riyadh days). */
export function riyadhToday(now: Date = new Date()): string {
  return localDateIn(now, RIYADH_TZ);
}

export interface ZonedWhenWords {
  /** The app's `t.enums.weekday`: "0" = الأحد … "6" = السبت. */
  weekday: Readonly<Record<string, string | undefined>>;
  /** The UI language: the month's name. */
  locale: Locale;
  /** The viewer's clock (12 or 24 h); 24 h when not given. */
  cycle?: ClockCycle;
  /** The viewer's zone (docs/34): always passed, so no screen falls back to Riyadh's clock. */
  tz: string;
}

/** «الاثنين 12 أكتوبر 18:00»: weekday, day, month and clock of `instant` (ISO) in `words.tz`. */
export function zonedWhenText(instant: string, words: ZonedWhenWords): string {
  const at = new Date(instant);
  const { tz } = words;
  const clock = clockOf(at, { tz, locale: words.locale, cycle: words.cycle ?? '24' });
  const dayMonth = dateText(at, { tz, locale: words.locale }, { day: 'numeric', month: 'long' });
  return `${words.weekday[String(weekdayIn(at, tz))] ?? ''} ${dayMonth} ${clock}`;
}
