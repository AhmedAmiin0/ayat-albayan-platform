import { calendarDaysBetween, localDateIn, weekdayOfDate, zonedFieldsIn } from '../zone/index.js';

// The day a chat message belongs to, as WhatsApp shows it above each day's first bubble (owner
// 2026-10-27): today, yesterday, the weekday within the last 6 days, else the date (the year only
// when it is not this year). Days are calendar days in the viewer's time zone. Not display text:
// each app words it from its own strings.

export interface DayParts {
  day: number;
  month: number;
  year: number;
}

export type ChatDay =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  /** 0 = Sunday … 6 = Saturday (enums.weekday). */
  | { kind: 'weekday'; weekday: number }
  /** `year` is null in the current year. */
  | { kind: 'date'; day: number; month: number; year: number | null };

/** The calendar day of the instant in `tz`, as plain numbers. */
export function dayParts(at: Date, tz: string): DayParts {
  const { day, month, year } = zonedFieldsIn(at, tz);
  return { day, month, year };
}

const pad = (n: number): string => String(n).padStart(2, '0');
const ymd = (d: DayParts): string => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

/** «2026-09-29»: the same key for every message of one local day. */
export function chatDayKey(at: Date, tz: string): string {
  return localDateIn(at, tz);
}

interface ChatDayOptions {
  now: Date;
  tz: string;
}

/** Which label the day of `at` takes, seen from `now` in `tz`. */
export function chatDay(at: Date, { now, tz }: ChatDayOptions): ChatDay {
  const day = dayParts(at, tz);
  const today = dayParts(now, tz);
  const ago = calendarDaysBetween(ymd(day), ymd(today));
  if (ago === 0) return { kind: 'today' };
  if (ago === 1) return { kind: 'yesterday' };
  if (ago > 1 && ago <= 6) return { kind: 'weekday', weekday: weekdayOfDate(ymd(day)) };
  return { kind: 'date', day: day.day, month: day.month, year: day.year === today.year ? null : day.year };
}
