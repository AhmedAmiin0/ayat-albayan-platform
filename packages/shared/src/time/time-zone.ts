import { addHours } from 'date-fns';
import { offsetMinutesIn } from './zoned.js';

// Time-zone choices and DST look-ahead (rule 6: every person has a tz, picked, never typed).
// City labels live in ar.json `tz.<id>`; this module holds no Arabic.

/**
 * Where the academy's families and teachers live. ponytail: a short curated list instead of the
 * ~420 IANA ids; add a zone here together with its ar.json city label.
 */
export const TZ_OPTIONS = [
  'Asia/Riyadh',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Qatar',
  'Asia/Kuwait',
  'Asia/Bahrain',
  'Asia/Muscat',
  'Asia/Amman',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Toronto',
] as const;

/** The curated zones, plus a stored zone outside them first, so an old value still shows. */
export function tzChoices(current: string): string[] {
  const known: readonly string[] = TZ_OPTIONS;
  return !current || known.includes(current) ? [...known] : [current, ...known];
}

/**
 * «القاهرة (Africa/Cairo)» for an <option> (which can't hold <bdi>): the id is wrapped in
 * LRI…PDI so it stays one LTR island. No city label → the isolated id alone.
 */
export function tzOptionLabel(id: string, city: string | undefined): string {
  const ltr = `⁦${id}⁩`;
  return city ? `${city} (${ltr})` : ltr;
}

export interface DstShift {
  /** A moment on the first local day that runs on the new offset (12h after the change). */
  day: Date;
  /** forward = clocks jump an hour ahead (summer time starts), back = they return an hour. */
  dir: 'forward' | 'back';
}

/** UTC offset of `tz` at `at`, in minutes (Riyadh +180, Cairo +120 / +180 in summer). */
export function utcOffsetMinutes(tz: string, at: Date): number {
  return offsetMinutesIn(tz, at);
}

/**
 * The next UTC-offset change of `tz` within `days` after `now`, or null (docs/07 §8 DST note:
 * «من الجمعة 30 أكتوبر القاهرة بترجع ساعة»). ponytail: an hourly scan (≤720 offset reads);
 * fine for one note per screen.
 */
export function nextDstTransition(tz: string, now: Date, days = 30): DstShift | null {
  const before = offsetMinutesIn(tz, now);
  for (let h = 1; h <= days * 24; h += 1) {
    const at = addHours(now, h);
    const after = offsetMinutesIn(tz, at);
    if (after !== before) return { day: addHours(at, 12), dir: after > before ? 'forward' : 'back' };
  }
  return null;
}
