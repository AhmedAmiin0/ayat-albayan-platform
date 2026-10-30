import { describe, expect, it } from 'vitest';
import * as legacyZoned from '../../schedule/lessons/series/zoned.js';
import * as legacyDayBefore from '../../messaging/lesson/timing.day-before.js';
import { clockOf as legacyClockOf } from '../../core/format/clock.js';
import { utcOffsetMinutes as legacyOffset } from '../time-zone.js';
import { riyadhToday as legacyRiyadhToday } from '../riyadh-day.js';
import * as legacyWeek from '../week.js';
import { addCalendarDays, addDaysIn, startOfDayIn, weekStartOfDate, weekdayOfDate } from '../calendar.js';
import { localDateIn, offsetMinutesIn, wallInstant, weekdayIn } from '../zoned.js';
import { clockIn } from '../format.js';
import { GOLDEN_TIMES, GOLDEN_ZONES, goldenDates, goldenInstants } from '../../testing/golden-sweep.js';

// Old (Intl / ms math) and new (date-fns facade) side by side over the full sweep: every
// instant must be byte-identical before the old code goes (docs/34 §6).

const dates = goldenDates();
const instants = goldenInstants();

describe.each(GOLDEN_ZONES)('wall clock ↔ UTC in %s', (zone) => {
  it('zonedInstant (occurrence picks) = wallInstant', () => {
    for (const date of dates) {
      for (const time of GOLDEN_TIMES) {
        expect(wallInstant(date, time, zone).toISOString()).toBe(legacyZoned.zonedInstant(date, time, zone));
      }
    }
  });

  it('offset, local day, day start, weekday and clock of every half hour', () => {
    for (const at of instants) {
      expect(offsetMinutesIn(zone, at)).toBe(legacyOffset(zone, at));
      expect(localDateIn(at, zone)).toBe(legacyDayBefore.localDate(at, zone));
      expect(startOfDayIn(at, zone).toISOString()).toBe(legacyDayBefore.localDayStart(at, zone).toISOString());
      expect(weekdayIn(at, zone)).toBe(legacyWeek.weekdayOf(legacyDayBefore.localDate(at, zone)));
      for (const cycle of ['12', '24'] as const) {
        const opts = { tz: zone, cycle, locale: 'ar' } as const;
        expect(clockIn(at, opts)).toBe(legacyClockOf(at, opts));
      }
    }
  });

  it('dayBeforeSendAt: the lesson time a local day earlier, and at a fixed send_at_local', () => {
    for (const at of instants) {
      const legacy = legacyDayBefore.dayBeforeSendAt(at, zone);
      expect(addDaysIn(at, -1, zone).toISOString()).toBe(legacy.toISOString());
      const date = addCalendarDays(localDateIn(at, zone), -1);
      const fixed = legacyDayBefore.dayBeforeSendAt(at, zone, '18:00');
      expect(wallInstant(date, '18:00', zone).toISOString()).toBe(fixed.toISOString());
    }
  });
});

describe('calendar dates', () => {
  it('add days, weekday and academy week start (السبت)', () => {
    for (const date of dates) {
      for (const n of [-400, -31, -7, -1, 0, 1, 7, 28, 366]) {
        expect(addCalendarDays(date, n)).toBe(legacyWeek.addDays(date, n));
        expect(addCalendarDays(date, n)).toBe(legacyZoned.addLocalDays(date, n));
      }
      expect(weekdayOfDate(date)).toBe(legacyWeek.weekdayOf(date));
      expect(weekStartOfDate(date)).toBe(legacyWeek.weekStart(date));
    }
  });

  it('riyadhToday = localDateIn(Asia/Riyadh)', () => {
    for (const at of instants) expect(localDateIn(at, 'Asia/Riyadh')).toBe(legacyRiyadhToday(at));
  });
});
