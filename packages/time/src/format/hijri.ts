import { intlLocale } from '@ab/core';
import type { DateTextOptions } from './format.js';

// The Hijri date beside the Gregorian one (the family pages' hero, docs/51): Umm al-Qura, the
// calendar Saudi Arabia keeps, in the UI language with ASCII digits. Not every engine ships it
// (a small-ICU build): then there is no Hijri text at all, never a wrong one.

const CALENDAR = 'islamic-umalqura';
const FIELDS = { day: 'numeric', month: 'long', year: 'numeric' } as const;
const formats = new Map<string, Intl.DateTimeFormat>();

function hijriFormat(opts: DateTextOptions): Intl.DateTimeFormat {
  const key = `${opts.locale}|${opts.tz}`;
  const known = formats.get(key);
  if (known) return known;
  const f = new Intl.DateTimeFormat(intlLocale(opts.locale), {
    ...FIELDS,
    calendar: CALENDAR,
    timeZone: opts.tz,
  });
  formats.set(key, f);
  return f;
}

/** «9 جمادى الآخرة 1448 هـ» of `at` in `opts.tz`; null where the engine lacks the calendar. */
export function hijriText(at: Date | number, opts: DateTextOptions): string | null {
  const f = hijriFormat(opts);
  return f.resolvedOptions().calendar === CALENDAR ? f.format(at) : null;
}
