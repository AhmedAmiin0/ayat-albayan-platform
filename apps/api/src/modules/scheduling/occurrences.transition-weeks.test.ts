import { describe, expect, it } from 'vitest';
import { ruleOccurrences, type RuleTiming } from './occurrences';

// Africa/Cairo 2026 (checked with Intl): spring-forward Fri 24 Apr 00:00 EET → 01:00 EEST;
// fall-back Thu 29 Oct 24:00 EEST → 23:00 EET (23:00–24:00 happens twice).
const DAILY_18: RuleTiming = {
  byday: [0, 1, 2, 3, 4, 5, 6],
  start_time_local: '18:00',
  duration_min: 30,
  tz: 'Africa/Cairo',
  starts_on: '2026-01-01',
  ends_on: null,
};
const starts = (rule: RuleTiming, from: string, to: string) =>
  ruleOccurrences(rule, { from: new Date(from), to: new Date(to) }).map((o) =>
    o.starts_at.toISOString(),
  );

describe('ruleOccurrences — Cairo transition weeks, every day (R-SCH-01, R-SCH-02)', () => {
  it('spring week 19–25 Apr: 16:00Z (UTC+2) until Thursday, 15:00Z (UTC+3) from Friday', () => {
    expect(starts(DAILY_18, '2026-04-19T00:00:00Z', '2026-04-26T00:00:00Z')).toEqual([
      '2026-04-19T16:00:00.000Z',
      '2026-04-20T16:00:00.000Z',
      '2026-04-21T16:00:00.000Z',
      '2026-04-22T16:00:00.000Z',
      '2026-04-23T16:00:00.000Z',
      '2026-04-24T15:00:00.000Z',
      '2026-04-25T15:00:00.000Z',
    ]);
  });

  it('autumn week 25–31 Oct: 15:00Z through Thursday 29th, 16:00Z from Friday 30th', () => {
    expect(starts(DAILY_18, '2026-10-25T00:00:00Z', '2026-11-01T00:00:00Z')).toEqual([
      '2026-10-25T15:00:00.000Z',
      '2026-10-26T15:00:00.000Z',
      '2026-10-27T15:00:00.000Z',
      '2026-10-28T15:00:00.000Z',
      '2026-10-29T15:00:00.000Z',
      '2026-10-30T16:00:00.000Z',
      '2026-10-31T16:00:00.000Z',
    ]);
  });

  it('a mid-summer week and a mid-winter week keep their single offset', () => {
    expect(starts(DAILY_18, '2026-07-05T00:00:00Z', '2026-07-08T00:00:00Z')).toEqual([
      '2026-07-05T15:00:00.000Z',
      '2026-07-06T15:00:00.000Z',
      '2026-07-07T15:00:00.000Z',
    ]);
    expect(starts(DAILY_18, '2026-01-04T00:00:00Z', '2026-01-07T00:00:00Z')).toEqual([
      '2026-01-04T16:00:00.000Z',
      '2026-01-05T16:00:00.000Z',
      '2026-01-06T16:00:00.000Z',
    ]);
  });

  it('a wall time inside the spring-forward gap moves forward an hour (00:30 → 01:30 EEST)', () => {
    const fri = { ...DAILY_18, byday: [5], start_time_local: '00:30' };
    expect(starts(fri, '2026-04-16T00:00:00Z', '2026-05-02T00:00:00Z')).toEqual([
      '2026-04-16T22:30:00.000Z', // Fri 17 Apr 00:30 EET
      '2026-04-23T22:30:00.000Z', // Fri 24 Apr: 00:30 does not exist → 01:30 EEST
      '2026-04-30T21:30:00.000Z', // Fri 1 May 00:30 EEST
    ]);
  });

  it('a repeated wall time on fall-back night resolves to the later instant, once', () => {
    const thu = { ...DAILY_18, byday: [4], start_time_local: '23:30' };
    expect(starts(thu, '2026-10-22T00:00:00Z', '2026-11-06T00:00:00Z')).toEqual([
      '2026-10-22T20:30:00.000Z', // EEST
      '2026-10-29T21:30:00.000Z', // the second 23:30 (EET)
      '2026-11-05T21:30:00.000Z', // EET
    ]);
  });
});
