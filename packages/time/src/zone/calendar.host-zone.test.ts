import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  addCalendarDays,
  addDaysIn,
  addWeeksIn,
  calendarDaysBetween,
  endOfDayIn,
  startOfDayIn,
  startOfWeekIn,
  weekdayOfDate,
} from './calendar.js';

// The calendar helpers on a phone or browser whose own zone has DST (vi.stubEnv sets
// process.env.TZ, and Node applies a runtime TZ change). Every value is what TZ=UTC gives: only
// the zone passed in may decide. addDaysIn once stepped with date-fns addDays on a plain Date, i.e.
// the HOST's setDate: across the host's change the step was 23 / 25 h, and even a Riyadh lesson
// (no DST) moved an hour.

const iso = (d: Date): string => d.toISOString();
const at = (s: string): Date => new Date(s);

describe.each(['America/New_York', 'Europe/London'])('host zone %s', (host) => {
  beforeAll(() => {
    vi.stubEnv('TZ', host);
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('really runs in the host zone (its July offset is not UTC)', () => {
    expect(new Date('2026-07-15T12:00:00Z').getTimezoneOffset()).not.toBe(0);
  });

  it('addDaysIn / addWeeksIn in Riyadh are exactly 24 h a day, across each host change', () => {
    expect(iso(addDaysIn(at('2026-03-07T15:00:00Z'), 1, 'Asia/Riyadh'))).toBe('2026-03-08T15:00:00.000Z');
    expect(iso(addDaysIn(at('2026-03-28T15:00:00Z'), 1, 'Asia/Riyadh'))).toBe('2026-03-29T15:00:00.000Z');
    expect(iso(addWeeksIn(at('2026-10-20T15:00:00Z'), 1, 'Asia/Riyadh'))).toBe('2026-10-27T15:00:00.000Z');
    expect(iso(addDaysIn(at('2026-11-01T15:00:00Z'), -1, 'Asia/Riyadh'))).toBe('2026-10-31T15:00:00.000Z');
  });

  it('addDaysIn keeps the wall clock of the zone it is given (23 / 25 h only for its change)', () => {
    // New York 12:00 EST → 12:00 EDT; London 12:00 GMT, a week after its own change; Cairo 12:00.
    expect(iso(addDaysIn(at('2026-03-07T17:00:00Z'), 1, 'America/New_York'))).toBe('2026-03-08T16:00:00.000Z');
    expect(iso(addDaysIn(at('2026-11-01T12:00:00Z'), -1, 'Europe/London'))).toBe('2026-10-31T12:00:00.000Z');
    expect(iso(addDaysIn(at('2026-10-30T10:00:00Z'), -1, 'Africa/Cairo'))).toBe('2026-10-29T09:00:00.000Z');
  });

  it('day and week bounds in a zone, on the days the hosts change', () => {
    expect(iso(startOfDayIn(at('2026-03-08T12:00:00Z'), 'America/New_York'))).toBe('2026-03-08T05:00:00.000Z');
    expect(iso(endOfDayIn(at('2026-03-08T12:00:00Z'), 'America/New_York'))).toBe('2026-03-09T04:00:00.000Z');
    expect(iso(startOfWeekIn(at('2026-03-09T12:00:00Z'), 'Asia/Riyadh'))).toBe('2026-03-06T21:00:00.000Z');
  });

  it('calendar dates do not move with the host', () => {
    expect(addCalendarDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addCalendarDays('2026-10-25', -1)).toBe('2026-10-24');
    expect(calendarDaysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(calendarDaysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(weekdayOfDate('2026-03-08')).toBe(0);
  });
});
