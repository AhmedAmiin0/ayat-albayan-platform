// Running head (docs/07 §1.7, §7): Gregorian + Hijri date and the Riyadh / Cairo clocks.
// Western digits everywhere (one numeral system), Hijri via Umm al-Qura. DB stays UTC.
import { intlLocale, type Locale } from '../i18n/locale.js';

export const RIYADH_TZ = 'Asia/Riyadh';
export const CAIRO_TZ = 'Africa/Cairo';

export interface RunningHead {
  /** «الخميس 1 أكتوبر 2026» (Riyadh calendar day). */
  gregorian: string;
  /** «20 ربيع الآخر 1448 هـ». */
  hijri: string;
  /** «15:20», 24h. */
  riyadhTime: string;
  cairoTime: string;
}

// Built on first use per UI language, not at import: an engine without the Umm al-Qura calendar
// (Hermes on some Android builds) must not crash every importer of @ab/shared. Without it the Hijri
// line is ''.
const gregorians = new Map<Locale, Intl.DateTimeFormat>();
const hijris = new Map<Locale, Intl.DateTimeFormat | null>();

function gregorianFormat(locale: Locale): Intl.DateTimeFormat {
  let f = gregorians.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(locale), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: RIYADH_TZ,
    });
    gregorians.set(locale, f);
  }
  return f;
}

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

/** «HH:mm» in `timeZone`, 24h, Western digits. */
export function clockTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(date);
}

/** Weekday, day, month, year joined by spaces (Intl puts «، » after the weekday). */
function gregorianLine(date: Date, locale: Locale): string {
  const parts = gregorianFormat(locale).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return [part('weekday'), part('day'), part('month'), part('year')].join(' ');
}

/** Screen text in the UI language (Arabic by default); the clocks are the same in both. */
export function formatRunningHead(date: Date, locale: Locale = 'ar'): RunningHead {
  return {
    gregorian: gregorianLine(date, locale),
    hijri: hijriLine(date, locale),
    riyadhTime: clockTime(date, RIYADH_TZ),
    cairoTime: clockTime(date, CAIRO_TZ),
  };
}
