// Academy-week calendar math on local dates "YYYY-MM-DD" (R-SCH-01, rule 6). Plain calendar
// arithmetic, no zone involved: a date is read at UTC midnight. Shared by the web schedule grid and
// the mobile calendar (docs/27 E6); weeks run السبت → الجمعة like the availability grid.

const DAY_MS = 86_400_000;

function utcOf(date: string): number {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Weekday of a calendar date: 0 = الأحد … 6 = السبت (the `byday` / teacher_availability numbering). */
export function weekdayOf(date: string): number {
  return new Date(utcOf(date)).getUTCDay();
}

/** The date `days` later (negative: earlier); crosses months and years. */
export function addDays(date: string, days: number): string {
  return new Date(utcOf(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Saturday on or before `date`: the first day of its academy week. */
export function weekStart(date: string): string {
  return addDays(date, -((weekdayOf(date) + 1) % 7));
}
