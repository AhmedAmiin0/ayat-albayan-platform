import { digest, GOLDEN_TIMES, GOLDEN_ZONES, goldenDates, goldenInstants } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { localDay, offsetMs, toMinutes, weekdayOf, zonedToUtc } from './zoned-time';

// zoned-time (the API's wall clock ↔ UTC: occurrence generation, booking, payouts, the `?from&to`
// windows) on the @ab/shared date-fns facade (docs/34 §6). Before the swap it ran side by side
// with the old Intl code over this sweep and agreed on every value; these digests were then taken
// from the old code and now pin the facade-backed one.

const EXPECTED: Record<string, { wall: string; instants: string }> = {
  'Africa/Cairo': { wall: '6080:e097ff62', instants: '18240:4eee2a11' },
  'Asia/Riyadh': { wall: '6080:ad1c3f78', instants: '18240:4a0fab6f' },
  'Asia/Dubai': { wall: '6080:0a5f5251', instants: '18240:cc9bd9ad' },
  'Asia/Kuwait': { wall: '6080:ad1c3f78', instants: '18240:4a0fab6f' },
  'Asia/Qatar': { wall: '6080:ad1c3f78', instants: '18240:4a0fab6f' },
  'Europe/London': { wall: '6080:1a94b943', instants: '18240:9fe0de61' },
  'America/New_York': { wall: '6080:2effde9e', instants: '18240:9bddce2d' },
};

describe.each(GOLDEN_ZONES)('zoned-time, pinned, in %s', (zone) => {
  it('zonedToUtc(local day, minutes) for every day and time of the sweep, 24:00 included', () => {
    const lines = goldenDates().flatMap((date) =>
      [...GOLDEN_TIMES, '24:00'].map((t) => String(zonedToUtc(Date.parse(date), toMinutes(t), zone))),
    );
    expect(digest(lines)).toBe(EXPECTED[zone]?.wall);
  });

  it('localDay, offsetMs and weekdayOf of every half hour', () => {
    const lines = goldenInstants().map((at) => {
      const day = localDay(at.getTime(), zone);
      return `${day} ${offsetMs(at.getTime(), zone)} ${weekdayOf(day)}`;
    });
    expect(digest(lines)).toBe(EXPECTED[zone]?.instants);
  });
});
