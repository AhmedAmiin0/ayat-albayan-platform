import { clockOf, clockOfHhmm } from '@ab/time';

// A 24-hour Arabic device; Chrome's plain `ar` is 12-hour. The web ignores it and shows 12 h.
export const AR_LOCALE = 'ar-u-hc-h23';

/** A wall «HH:MM» on the web: 12-hour with the Arabic AM/PM mark, whatever the locale. */
export const webClock = (hhmm: string): string => clockOfHhmm(hhmm, '12', 'ar');

/** An instant's clock in `tz` as the web shows it (12-hour, Arabic AM/PM mark). */
export const webClockAt = (at: Date, tz: string): string =>
  clockOf(at, { tz, cycle: '12', locale: 'ar' });
