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
}

const dayMonths = new Map<Locale, Intl.DateTimeFormat>();

function dayMonth(locale: Locale): Intl.DateTimeFormat {
  let f = dayMonths.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: RIYADH_TZ, day: 'numeric', month: 'long' });
    dayMonths.set(locale, f);
  }
  return f;
}

/** «الاثنين 12 أكتوبر 18:00»: weekday, day, month and the Riyadh clock of `instant` (an ISO string). */
export function riyadhWhenText(instant: string, words: RiyadhWhenWords): string {
  const at = new Date(instant);
  const weekday = new Date(`${riyadhToday(at)}T00:00:00Z`).getUTCDay();
  return `${words.weekday[String(weekday)] ?? ''} ${dayMonth(words.locale).format(at)} ${clockOf(at, { tz: RIYADH_TZ, locale: words.locale, cycle: words.cycle ?? '24' })}`;
}
