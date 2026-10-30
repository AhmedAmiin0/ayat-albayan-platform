import { localDateIn, offsetMinutesIn, wallToUtc, weekdayIn } from '@ab/shared';
import { GOLDEN_TIMES, GOLDEN_ZONES, goldenDates, goldenInstants } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { localDay, offsetMs, toMinutes, weekdayOf, zonedToUtc } from './zoned-time';

// zoned-time (the API's wall clock ↔ UTC: occurrence generation, booking, payouts, the `?from&to`
// windows) and the @ab/shared date-fns facade side by side over the full sweep (docs/34 §6).

const dates = goldenDates();
const instants = goldenInstants();

describe.each(GOLDEN_ZONES)('zoned-time = the date-fns facade in %s', (zone) => {
  it('zonedToUtc(local day, minutes) = wallToUtc', () => {
    const legacy: number[] = [];
    const next: number[] = [];
    for (const date of dates) {
      for (const time of [...GOLDEN_TIMES, '24:00']) {
        legacy.push(zonedToUtc(Date.parse(date), toMinutes(time), zone));
        next.push(wallToUtc(date, toMinutes(time), zone).getTime());
      }
    }
    expect(next).toEqual(legacy);
  });

  it('localDay, offsetMs and weekdayOf of every half hour', () => {
    const legacy = instants.map((at) => {
      const day = localDay(at.getTime(), zone);
      return [day, offsetMs(at.getTime(), zone), weekdayOf(day)];
    });
    const next = instants.map((at) => {
      const day = Date.parse(localDateIn(at, zone));
      return [day, offsetMinutesIn(zone, at) * 60_000, weekdayIn(at, zone)];
    });
    expect(next).toEqual(legacy);
  });
});
