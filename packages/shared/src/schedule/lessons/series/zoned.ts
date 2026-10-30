// Local wall clock → UTC instant in an IANA zone, for prefilled picks (owner 2026-10-18: «تابِع بنفس
// الأيام», «تغيير أيام الحلقات»). The same two-pass rule as the web's zonedToUtc. Pure, Intl only.

const DAY_MS = 86_400_000;
const utcOf = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const formats = new Map<string, Intl.DateTimeFormat>();

function format(tz: string): Intl.DateTimeFormat {
  let f = formats.get(tz);
  if (!f) {
    const opts = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' } as const;
    f = new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: tz, hourCycle: 'h23' });
    formats.set(tz, f);
  }
  return f;
}

/** Minutes `tz` is ahead of UTC at `instant` (ms). */
function offsetMin(instant: number, tz: string): number {
  const parts = format(tz).formatToParts(new Date(instant));
  const n = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const wall = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'));
  return (wall - Math.floor(instant / 60_000) * 60_000) / 60_000;
}

/** The ISO instant a wall clock (`date` "YYYY-MM-DD", `time` "HH:MM") happens in `tz`; DST-safe. */
export function zonedInstant(date: string, time: string, tz: string): string {
  const [h = 0, mi = 0] = time.split(':').map(Number);
  const wall = utcOf(date) + (h * 60 + mi) * 60_000;
  const first = wall - offsetMin(wall, tz) * 60_000;
  return new Date(wall - offsetMin(first, tz) * 60_000).toISOString();
}

/** `date` moved by `days` local days ("YYYY-MM-DD"). */
export const addLocalDays = (date: string, days: number): string => new Date(utcOf(date) + days * DAY_MS).toISOString().slice(0, 10);

/** 0 = الأحد … 6 = السبت of a local date (the date-fns facade). */
export { weekdayOfDate } from '../../../time/calendar.js';
