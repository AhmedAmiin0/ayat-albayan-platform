import { counted, type Locale, type PluralForm } from '@ab/core';
import {
  chatDay,
  type ClockCycle,
  clockOf,
  type DateFields,
  dateText,
  dayParts,
  isolateClock,
} from '@ab/time';

// Presence times (docs/33 §4) on the viewer's clock and zone; pure.

export interface PresenceWords {
  now: string;
  /** One string per Arabic count form. */
  minutes: Readonly<Record<PluralForm, string>>;
  today: string;
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

/** A future time from clock skew reads as now. */
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
