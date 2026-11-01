// The one display formatter for clock times (clock-pref.ts). Built on h23 parts plus our own
// ص / م (AM / PM) suffix, so every engine (Hermes included) prints the same; digits stay Western.
// The clock of an instant (clockOf) reads its zone through the date-fns facade (format/format.ts).
import type { Locale } from '@ab/core';
import type { ClockCycle } from './clock-pref.js';

export interface ClockOptions {
  /** IANA zone the instant is read in. */
  tz: string;
  cycle: ClockCycle;
  locale: Locale;
}

/** «ص» / «م» or «AM» / «PM»: the 12 h suffix (also the meridiem toggle of a 12 h picker). */
export function meridiemLabel(meridiem: 'am' | 'pm', locale: Locale): string {
  if (locale === 'ar') return meridiem === 'am' ? 'ص' : 'م';
  return meridiem === 'am' ? 'AM' : 'PM';
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** «17:30» (24) or «5:30 م» / «5:30 PM» (12) from a 24 h hour and a minute. */
export function clockOfParts(hour: number, minute: number, opts: Omit<ClockOptions, 'tz'>): string {
  const h = ((hour % 24) + 24) % 24;
  if (opts.cycle === '24') return `${pad(h)}:${pad(minute)}`;
  return `${h % 12 || 12}:${pad(minute)} ${meridiemLabel(h < 12 ? 'am' : 'pm', opts.locale)}`;
}

/** A stored «HH:MM» (or «HH:MM:SS») wall time for display; anything else comes back as given. */
export function clockOfHhmm(hhmm: string, cycle: ClockCycle, locale: Locale): string {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hhmm);
  if (!m) return hhmm;
  return clockOfParts(Number(m[1]), Number(m[2]), { cycle, locale });
}

/**
 * Unicode isolate for a clock or a range: LTR (LRI … PDI) as today, except Arabic 12 h, whose
 * «5:30 م» reads right to left (RLI … PDI) so the suffix sits after the digits for the reader.
 */
export function isolateClock(text: string, cycle: ClockCycle, locale: Locale): string {
  return locale === 'ar' && cycle === '12' ? `⁧${text}⁩` : `⁦${text}⁩`;
}

/** «16:00 – 18:00» / «4:00 م – 6:00 م», isolated (isolateClock). Takes two formatted clocks. */
export function clockRange(from: string, to: string, opts: Omit<ClockOptions, 'tz'>): string {
  return isolateClock(`${from} – ${to}`, opts.cycle, opts.locale);
}
