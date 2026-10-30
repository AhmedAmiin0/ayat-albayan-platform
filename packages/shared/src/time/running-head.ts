// Running head (docs/07 §1.7, §7): Gregorian + Hijri date and the Riyadh / Cairo clocks.
// Western digits everywhere (one numeral system), Hijri via Umm al-Qura. DB stays UTC.
import { CAIRO_TZ, RIYADH_TZ, type ClockCycle } from '../core/format/index.js';
import type { Locale } from '../i18n/index.js';
import { clockOf, dateTextParts } from './format.js';
import { hhmmIn } from './zoned.js';

export { CAIRO_TZ, RIYADH_TZ };

export interface RunningHead {
  /** «الخميس 1 أكتوبر 2026» (Riyadh calendar day). */
  gregorian: string;
  /** «20 ربيع الآخر 1448 هـ». */
  hijri: string;
  /** «15:20» (24 h) or «3:20 م» (12 h). */
  riyadhTime: string;
  cairoTime: string;
}

// Built on first use per UI language, not at import: an engine without the Umm al-Qura calendar
// (Hermes on some Android builds) must not crash every importer of @ab/shared. Without it the Hijri
// line is ''. date-fns has no Hijri calendar, so this one stays a plain Intl format.
const hijris = new Map<Locale, Intl.DateTimeFormat | null>();

/** «20 ربيع الآخر 1448 هـ» / «20 Rabiʻ II 1448 AH». */
function hijriLine(date: Date, locale: Locale): string {
  if (!hijris.has(locale)) {
    const tag = locale === 'ar' ? 'ar-SA' : 'en-GB';
    try {
      hijris.set(
        locale,
        new Intl.DateTimeFormat(`${tag}-u-ca-islamic-umalqura-nu-latn`, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: RIYADH_TZ,
        }),
      );
    } catch {
      hijris.set(locale, null);
    }
  }
  return hijris.get(locale)?.format(date) ?? '';
}

/** «HH:mm» in `timeZone`, 24 h, ASCII digits: keys and server texts (screens: clockOf). */
export const clockTime = (date: Date, timeZone: string): string => hhmmIn(date, timeZone);

const GREGORIAN = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;

/** Weekday, day, month, year joined by spaces (Intl puts «، » after the weekday). */
function gregorianLine(date: Date, locale: Locale): string {
  const parts = dateTextParts(date, { tz: RIYADH_TZ, locale }, GREGORIAN);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return [part('weekday'), part('day'), part('month'), part('year')].join(' ');
}

/** Screen text in the UI language (default Arabic); clocks in the viewer's 12/24 h cycle. */
export function formatRunningHead(
  date: Date,
  locale: Locale = 'ar',
  cycle: ClockCycle = '24',
): RunningHead {
  return {
    gregorian: gregorianLine(date, locale),
    hijri: hijriLine(date, locale),
    riyadhTime: clockOf(date, { tz: RIYADH_TZ, cycle, locale }),
    cairoTime: clockOf(date, { tz: CAIRO_TZ, cycle, locale }),
  };
}
