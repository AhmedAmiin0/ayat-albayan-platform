import { GOLDEN_ZONES, digest, goldenInstants } from '@ab/shared/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dayAround, localDay } from './api';

// Regression golden (docs/34 §7). The classroom's ?from&to day (today and the day switcher) moved
// from `new Date(y, m, d)` in the browser's zone to the date-fns facade. Both ran side by side here
// with the browser (process TZ) in every zone of the sweep and agreed; digests from the old code.

const lines = (): string[] =>
  goldenInstants(30).map((at) => {
    const around = [-1, 1, 7].map((k) => dayAround(at, k));
    return JSON.stringify([localDay(at), ...around]);
  });

const EXPECTED: Record<string, string> = {
  'Africa/Cairo': '18240:ebfd17cd',
  'Asia/Riyadh': '18240:10970b1d',
  'Asia/Dubai': '18240:abd0c285',
  'Asia/Kuwait': '18240:10970b1d',
  'Asia/Qatar': '18240:10970b1d',
  'Europe/London': '18240:aff4143d',
  'America/New_York': '18240:2bb2bab1',
};

describe.each(GOLDEN_ZONES)('classroom day, pinned, with the browser in %s', (zone) => {
  const saved = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  });

  it('today and the days around it, every half hour of the sweep', () => {
    expect(digest(lines())).toBe(EXPECTED[zone]);
  }, 90_000);
});

describe('DST edges (zone given)', () => {
  it('Cairo 2026-04-24 starts at 01:00 (no midnight) and lasts 23 h', () => {
    expect(localDay(new Date('2026-04-24T09:00:00Z'), 'Africa/Cairo')).toEqual({
      from: '2026-04-23T22:00:00.000Z',
      to: '2026-04-24T21:00:00.000Z',
    });
  });

  it('Cairo 2026-10-29 lasts 25 h; the day after starts at 00:00 +02', () => {
    expect(dayAround(new Date('2026-10-29T09:00:00Z'), 1, 'Africa/Cairo')).toEqual({
      from: '2026-10-29T22:00:00.000Z',
      to: '2026-10-30T22:00:00.000Z',
    });
    expect(localDay(new Date('2026-10-29T09:00:00Z'), 'Africa/Cairo').from).toBe('2026-10-28T21:00:00.000Z');
  });
});
