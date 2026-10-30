import { utcOffsetMinutes } from '../../time/time-zone.js';

// The day-before reminder's send instant and expiry (docs/12 §7, docs/23b §8). Pure.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const localDates = new Map<string, Intl.DateTimeFormat>();

/** «YYYY-MM-DD» of `at` in `tz`. */
export function localDate(at: Date, tz: string): string {
  let f = localDates.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    localDates.set(tz, f);
  }
  return f.format(at);
}

/** The UTC instant of the local wall time `${date}T${time}` in `tz` (DST-correct; two offset reads). */
function localInstant(date: string, time: string, tz: string): Date {
  const naive = Date.parse(`${date}T${time}:00Z`);
  const guess = naive - utcOffsetMinutes(tz, new Date(naive)) * MINUTE;
  return new Date(naive - utcOffsetMinutes(tz, new Date(guess)) * MINUTE);
}

/** The local calendar day before `date` («YYYY-MM-DD»). */
function previousDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The day-before reminder goes out on the previous local day in the recipient's tz (so «بكرة» is
 * always true). sendAtLocal null (today's behaviour): at the lesson's own wall-clock time, 24 h, or
 * 23 / 25 h across a DST change. sendAtLocal «HH:MM» (the rule's send_at_local): at that local time.
 */
export function dayBeforeSendAt(startsAt: Date, tz: string, sendAtLocal: string | null = null): Date {
  if (sendAtLocal !== null) return localInstant(previousDay(localDate(startsAt, tz)), sendAtLocal, tz);
  const naive = new Date(startsAt.getTime() - DAY);
  const shift = utcOffsetMinutes(tz, startsAt) - utcOffsetMinutes(tz, naive);
  return new Date(naive.getTime() + shift * MINUTE);
}

/**
 * Midnight that starts `at`'s local day in `tz`, as a UTC instant. The day-before reminder expires
 * then: sent any later (gate closed, retries) its «بكرة» would already be «النهاردة».
 */
export function localDayStart(at: Date, tz: string): Date {
  return localInstant(localDate(at, tz), '00:00', tz);
}
