import { clockOfParts, type ClockOptions } from '../clock/index.js';
import { intlLocale, type Locale } from '@ab/core';
import { zonedFieldsIn } from '../zone/index.js';

// The date-fns facade, part 3 (docs/34 §7): words for dates and clocks. The arithmetic is
// date-fns (zoned.ts, calendar.ts); month and weekday names come from Intl in the UI language
// (MSA, `-u-nu-latn`: ASCII digits, rule 10), the only Intl.DateTimeFormat left in the apps
// (lint: no-restricted-properties outside src/time). Clocks follow the viewer's 12/24 h cycle
// (useClock / useClockCycle stay its source) through clockOfParts, the same on every engine.

/** The fields of a date text: any of Intl's, without the zone and calendar (given apart). */
export type DateFields = Omit<Intl.DateTimeFormatOptions, 'timeZone' | 'calendar'>;

export interface DateTextOptions {
  /** IANA zone the instant is read in. */
  tz: string;
  /** The UI language: names in it, digits Western. */
  locale: Locale;
}

const formats = new Map<string, Intl.DateTimeFormat>();

function dateFormat(opts: DateTextOptions, fields: DateFields): Intl.DateTimeFormat {
  const key = `${opts.locale}|${opts.tz}|${JSON.stringify(fields)}`;
  let f = formats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(opts.locale), { ...fields, timeZone: opts.tz });
    formats.set(key, f);
  }
  return f;
}

/** «الخميس، 29 أكتوبر 2026», «29 أكتوبر»…: `fields` of `at` in `opts.tz`, ASCII digits. */
export function dateText(at: Date | number, opts: DateTextOptions, fields: DateFields): string {
  return dateFormat(opts, fields).format(at);
}

/** The parts of dateText (to join them without Intl's own separators). */
export function dateTextParts(
  at: Date | number,
  opts: DateTextOptions,
  fields: DateFields,
): Intl.DateTimeFormatPart[] {
  return dateFormat(opts, fields).formatToParts(at);
}

/** «السبت، 10 – الاثنين، 12 أكتوبر»: Intl's range of two dates (shared parts said once). */
export function dateRangeText(
  range: { from: Date | number; to: Date | number },
  opts: DateTextOptions,
  fields: DateFields,
): string {
  return dateFormat(opts, fields).formatRange(range.from, range.to);
}

const WEEKDAY_DAY_MONTH = { weekday: 'long', day: 'numeric', month: 'long' } as const;

/** «الأحد 4 أكتوبر»: weekday, day and month joined by spaces (without Intl's «، »). */
export function weekdayDayMonth(at: Date | number, opts: DateTextOptions): string {
  const parts = dateTextParts(at, opts, WEEKDAY_DAY_MONTH);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return [part('weekday'), part('day'), part('month')].join(' ');
}

/** «17:30» (24) or «5:30 م» / «5:30 PM» (12): the clock of `at` in `opts.tz`. */
export function clockOf(at: Date | number, opts: ClockOptions): string {
  const { hour, minute } = zonedFieldsIn(at, opts.tz);
  return clockOfParts(hour, minute, opts);
}

/** «الاثنين 12 أكتوبر 18:00»-style: `fields` of the date, then the clock in the viewer's cycle. */
export function dateClockText(at: Date | number, opts: ClockOptions, fields: DateFields): string {
  return `${dateText(at, opts, fields)} ${clockOf(at, opts)}`;
}

/** The device's zone as the engine reports it (resolveViewerTz validates it). */
export function engineTimeZone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The engine's (browser's, phone's) default hour cycle: h11 / h12 = 12 h, undefined if unknown. */
export function engineHourCycle(): string | undefined {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
}
