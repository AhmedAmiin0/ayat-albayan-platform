// Wall-clock <-> UTC via Intl only (no tz library). Rule 6, R-SCH-01.
// A "local day" is the UTC-midnight epoch ms of a calendar date in some zone (y/m/d only).

export const MINUTE = 60_000;
export const DAY = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    // hourCycle h23: `hour12: false` can print midnight as "24".
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Wall-clock of `instant` in `tz`, re-read as if it were UTC (seconds precision). */
function wallAsUtc(instant: number, tz: string): number {
  const parts = formatter(tz).formatToParts(instant);
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
}

/** UTC offset of `tz` at `instant`, in ms (Asia/Riyadh → +3h). */
export function offsetMs(instant: number, tz: string): number {
  return wallAsUtc(instant, tz) - Math.floor(instant / 1000) * 1000;
}

/** Calendar day containing `instant` in `tz`, as a local day. */
export function localDay(instant: number, tz: string): number {
  const wall = wallAsUtc(instant, tz);
  return wall - (((wall % DAY) + DAY) % DAY);
}

/** 0 = الأحد … 6 = السبت (same as the DB / JS getDay). */
export function weekdayOf(day: number): number {
  return new Date(day).getUTCDay();
}

/**
 * UTC instant of `minutes` after midnight on local `day` in `tz`. Two passes handle DST.
 * Non-existent wall times (spring-forward gap) shift forward; repeated ones resolve to the later
 * instant. `minutes` may be 1440 ("24:00" = next midnight).
 */
export function zonedToUtc(day: number, minutes: number, tz: string): number {
  const wall = day + minutes * MINUTE;
  const guess = wall - offsetMs(wall, tz);
  return wall - offsetMs(guess, tz);
}

/** "HH:MM" or "HH:MM:SS" (Postgres `time`) → minutes after midnight. Accepts "24:00". */
export function toMinutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}
