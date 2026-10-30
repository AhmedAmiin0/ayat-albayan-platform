import { RIYADH_TZ } from '../core/format/running-head.js';
import { clockOf, type ClockCycle } from '../core/format/index.js';
import { intlLocale, type Locale } from '../i18n/locale.js';

// The academy's own calendar (docs/11 §3): Riyadh days and times of UTC instants, Western digits.
// Shared by both apps (docs/27 E6); the words (weekday names, UI language) are injected.

const riyadhDays = new Intl.DateTimeFormat('en-US', { timeZone: RIYADH_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Today on the Riyadh calendar, "YYYY-MM-DD" (ranges and weeks are Riyadh days). */
export function riyadhToday(now: Date = new Date()): string {
  const parts = riyadhDays.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export interface RiyadhWhenWords {
  /** The app's `t.enums.weekday`: "0" = الأحد … "6" = السبت. */
  weekday: Readonly<Record<string, string | undefined>>;
  /** The UI language: the month's name. */
  locale: Locale;
  /** The viewer's clock (12 or 24 h); 24 h when not given. */
  cycle?: ClockCycle;
  /** The viewer's zone (docs/34); the academy's (Riyadh) when not given. */
  tz?: string;
}

const dayMonths = new Map<string, Intl.DateTimeFormat>();

function dayMonth(locale: Locale, tz: string): Intl.DateTimeFormat {
  const key = `${locale}|${tz}`;
  let f = dayMonths.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: tz, day: 'numeric', month: 'long' });
    dayMonths.set(key, f);
  }
  return f;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekdays = new Map<string, Intl.DateTimeFormat>();

function weekdayOf(at: Date, tz: string): number {
  let f = weekdays.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
    weekdays.set(tz, f);
  }
  return DAYS.indexOf(f.format(at));
}

/** «الاثنين 12 أكتوبر 18:00»: weekday, day, month and clock of `instant` (ISO) in `words.tz`. */
export function riyadhWhenText(instant: string, words: RiyadhWhenWords): string {
  const at = new Date(instant);
  const tz = words.tz ?? RIYADH_TZ;
  const clock = clockOf(at, { tz, locale: words.locale, cycle: words.cycle ?? '24' });
  return `${words.weekday[String(weekdayOf(at, tz))] ?? ''} ${dayMonth(words.locale, tz).format(at)} ${clock}`;
}
