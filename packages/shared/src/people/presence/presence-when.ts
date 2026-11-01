import { counted, type Locale, type PluralForm } from '@ab/core';
import { isolateClock, type ClockCycle } from '../../core/format/index.js';
import { chatDay, clockOf, dateText, dayParts, type DateFields } from '../../time/index.js';

// «آخر ظهور …» / «آخر رسالة …» (docs/33 §4): how long ago, on the viewer's clock and zone. The
// words come from each app's ar.json / en.json (`presence`), so this stays pure.

export interface PresenceWords {
  /** «الآن» */
  now: string;
  /** «منذ {n} دقائق», one string per Arabic count form. */
  minutes: Readonly<Record<PluralForm, string>>;
  /** «اليوم {time}» */
  today: string;
  /** «أمس» */
  yesterday: string;
}

export interface PresenceWhenInput {
  iso: string;
  now: Date;
  tz: string;
  cycle: ClockCycle;
  locale: Locale;
  words: PresenceWords;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function dayText(at: Date, input: PresenceWhenInput): string {
  const sameYear = dayParts(at, input.tz).year === dayParts(input.now, input.tz).year;
  const fields: DateFields = { day: 'numeric', month: 'long' };
  return dateText(at, input, sameYear ? fields : { ...fields, year: 'numeric' });
}

/** «الآن» · «منذ 5 دقائق» · «اليوم 10:30» · «أمس» · «25 أكتوبر»; a future time (skew) is «الآن». */
export function presenceWhen(input: PresenceWhenInput): string {
  const at = new Date(input.iso);
  const ago = input.now.getTime() - at.getTime();
  if (!Number.isFinite(ago) || ago < MINUTE_MS) return input.words.now;
  if (ago < HOUR_MS) return counted(input.words.minutes, Math.floor(ago / MINUTE_MS));
  const day = chatDay(at, { now: input.now, tz: input.tz });
  if (day.kind === 'today') {
    const time = isolateClock(clockOf(at, input), input.cycle, input.locale);
    return input.words.today.split('{time}').join(time);
  }
  if (day.kind === 'yesterday') return input.words.yesterday;
  return dayText(at, input);
}
