import { describe, expect, it } from 'vitest';
import { addCalendarDays, addDaysIn, startOfDayIn, weekStartOfDate, weekdayOfDate } from '../calendar.js';
import { clockIn } from '../format.js';
import { localDateIn, offsetMinutesIn, wallInstant, weekdayIn } from '../zoned.js';
import { GOLDEN_TIMES, GOLDEN_ZONES, digest, goldenDates, goldenInstants } from '../../testing/golden-sweep.js';

// Regression goldens for the date-fns facade itself (docs/34 §7). Before it replaced the Intl /
// ms code, both ran side by side here over this sweep and agreed on every value; the digests below
// were then taken from the old code (commit "pin reminder … instants") and now pin the facade.

const dates = goldenDates();
const instants = goldenInstants();

const wallLines = (zone: string): string[] =>
  dates.flatMap((date) => GOLDEN_TIMES.map((time) => wallInstant(date, time, zone).toISOString()));

function instantLines(zone: string): string[] {
  return instants.map((at) => {
    const clocks = (['12', '24'] as const).map((cycle) =>
      clockIn(at, { tz: zone, cycle, locale: 'ar' }),
    );
    const day = localDateIn(at, zone);
    const start = startOfDayIn(at, zone).toISOString();
    const fields = [offsetMinutesIn(zone, at), day, start, weekdayIn(at, zone)];
    return [...fields, ...clocks, addDaysIn(at, -1, zone).toISOString()].join(' ');
  });
}

function dateLines(): string[] {
  return dates.map((date) => {
    const moved = [-400, -31, -7, -1, 0, 1, 7, 28, 366].map((n) => addCalendarDays(date, n));
    return [...moved, weekdayOfDate(date), weekStartOfDate(date)].join(' ');
  });
}

const EXPECTED: Record<string, { wall: string; instants: string }> = {
  'Africa/Cairo': { wall: '5700:83595874', instants: '18240:8b596d37' },
  'Asia/Riyadh': { wall: '5700:b6f52d53', instants: '18240:a426f3d9' },
  'Asia/Dubai': { wall: '5700:f1a17c07', instants: '18240:995b52ed' },
  'Asia/Kuwait': { wall: '5700:b6f52d53', instants: '18240:a426f3d9' },
  'Asia/Qatar': { wall: '5700:b6f52d53', instants: '18240:a426f3d9' },
  'Europe/London': { wall: '5700:580c4659', instants: '18240:63ae8843' },
  'America/New_York': { wall: '5700:5464dfbd', instants: '18240:2477f843' },
};

describe.each(GOLDEN_ZONES)('the facade, pinned, in %s', (zone) => {
  it('wall clock → UTC for every day and time of the sweep', () => {
    expect(digest(wallLines(zone))).toBe(EXPECTED[zone]?.wall);
  });

  it('offset, local day, day start, weekday, both clocks and a day back, every half hour', () => {
    expect(digest(instantLines(zone))).toBe(EXPECTED[zone]?.instants);
  });
});

describe('calendar dates', () => {
  it('add days, weekday and academy week start (السبت)', () => {
    expect(digest(dateLines())).toBe('380:d419bf46');
  });

  it('Cairo 2026-10-29 → 30: the day after the change starts at 00:00 +02', () => {
    expect(startOfDayIn(new Date('2026-10-30T10:00:00Z'), 'Africa/Cairo').toISOString()).toBe('2026-10-29T22:00:00.000Z');
    expect(addDaysIn(new Date('2026-10-30T10:00:00Z'), -1, 'Africa/Cairo').toISOString()).toBe('2026-10-29T09:00:00.000Z');
  });
});
