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

const dayFormats = new Map<string, Intl.DateTimeFormat>();

/** The calendar day of the instant in `tz`, as plain numbers (engines differ on zero-padding). */
export function dayParts(at: Date, tz: string): DayParts {
  let f = dayFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: tz });
    dayFormats.set(tz, f);
  }
  const parts = f.formatToParts(at);
  const part = (k: 'day' | 'month' | 'year') => Number(parts.find((p) => p.type === k)?.value);
  return { day: part('day'), month: part('month'), year: part('year') };
}

const DAY_MS = 86_400_000;
const serial = (d: DayParts) => Date.UTC(d.year, d.month - 1, d.day) / DAY_MS;

/** «2026-09-29»: the same key for every message of one local day. */
export function chatDayKey(at: Date, tz: string): string {
  const d = dayParts(at, tz);
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

interface ChatDayOptions {
  now: Date;
  tz: string;
}

/** Which label the day of `at` takes, seen from `now` in `tz`. */
export function chatDay(at: Date, { now, tz }: ChatDayOptions): ChatDay {
  const day = dayParts(at, tz);
  const today = dayParts(now, tz);
  const ago = serial(today) - serial(day);
  if (ago === 0) return { kind: 'today' };
  if (ago === 1) return { kind: 'yesterday' };
  if (ago > 1 && ago <= 6) return { kind: 'weekday', weekday: new Date(serial(day) * DAY_MS).getUTCDay() };
  return { kind: 'date', day: day.day, month: day.month, year: day.year === today.year ? null : day.year };
}
