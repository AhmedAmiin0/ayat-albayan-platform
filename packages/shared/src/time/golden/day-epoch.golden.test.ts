import { dayInZone, dayWallToUtc, minutesOfHhmm, offsetMs, weekdayOfDay } from '@ab/time';
import { describe, expect, it, vi } from 'vitest';
import { GOLDEN_TIMES, GOLDEN_ZONES, digest, goldenDates, goldenInstants } from '../../testing/golden-sweep.js';

// A whole year per zone: seconds, not the default 5 s, on a busy CI runner.
vi.setConfig({ testTimeout: 60_000 });

// @ab/time day-epoch (formerly the api's zoned-time: occurrence generation, booking, payouts, the
// `?from&to` windows) on the date-fns facade (docs/34 §7). Before the swap it ran side by side
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

describe.each(GOLDEN_ZONES)('day-epoch, pinned, in %s', (zone) => {
  it('dayWallToUtc(local day, minutes) for every day and time of the sweep, 24:00 included', () => {
    const wall = (date: string, t: string) =>
      String(dayWallToUtc(Date.parse(date), minutesOfHhmm(t), zone));
    const lines = goldenDates().flatMap((date) => [...GOLDEN_TIMES, '24:00'].map((t) => wall(date, t)));
    expect(digest(lines)).toBe(EXPECTED[zone]?.wall);
  });

  it('dayInZone, offsetMs and weekdayOfDay of every half hour', () => {
    const lines = goldenInstants().map((at) => {
      const day = dayInZone(at.getTime(), zone);
      return `${day} ${offsetMs(at.getTime(), zone)} ${weekdayOfDay(day)}`;
    });
    expect(digest(lines)).toBe(EXPECTED[zone]?.instants);
  });
});
