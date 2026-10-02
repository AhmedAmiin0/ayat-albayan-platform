// Sheet wall-clock values → UTC (rule 6). read-excel-file returns serial dates as Date objects whose
// UTC parts are the sheet's wall clock; extraction keeps them zone-less and mappers add the tz here.

/** Date cell → 'YYYY-MM-DD' (midnight), 'HH:mm' (time-only, Excel day 0) or 'YYYY-MM-DDTHH:mm:ss'. */
export function wallClock(d: Date): string {
  const iso = d.toISOString();
  if (iso.startsWith('1899-12-30') || iso.startsWith('1899-12-31')) return iso.slice(11, 16);
  if (iso.slice(11, 19) === '00:00:00') return iso.slice(0, 10);
  return iso.slice(0, 19);
}

function utcOf(date: string): number {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function partsIn(instant: number, tz: string): number {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  return (
    utcOf(`${p['year']}-${p['month']}-${p['day']}`) +
    (Number(p['hour']) * 60 + Number(p['minute'])) * 60_000
  );
}

/** Minutes `tz` is ahead of UTC at `instant`. */
function offsetMin(instant: number, tz: string): number {
  return (partsIn(instant, tz) - Math.floor(instant / 60_000) * 60_000) / 60_000;
}

/** The UTC instant of wall clock `date` `time` ('HH:mm') in `tz`; DST-safe (second pass). Same as web zonedToUtc. */
export function zonedToUtc(o: { date: string; time: string; tz: string }): Date {
  const [h = 0, mi = 0] = o.time.split(':').map(Number);
  const wall = utcOf(o.date) + (h * 60 + mi) * 60_000;
  const first = wall - offsetMin(wall, o.tz) * 60_000;
  return new Date(wall - offsetMin(first, o.tz) * 60_000);
}

/** Inclusive local-day window check on 'YYYY-MM-DD' strings (A6: reports 2026-08-01..today). */
export function inWindow(o: { date: string; from: string; to: string }): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(o.date) && o.date >= o.from && o.date <= o.to;
}

/** Today's local date in `tz`. */
export function localToday(o: { now: Date; tz: string }): string {
  return new Date(partsIn(o.now.getTime(), o.tz)).toISOString().slice(0, 10);
}
