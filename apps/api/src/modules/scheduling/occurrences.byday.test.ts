import { describe, expect, it } from 'vitest';
import { ruleOccurrences, type RuleTiming } from './occurrences';

// Asia/Riyadh is UTC+3 all year. 2026-10-04 is a Sunday; 2026-10-07 a Wednesday.
const RULE: RuleTiming = {
  byday: [0, 2, 4],
  start_time_local: '20:00',
  duration_min: 60,
  tz: 'Asia/Riyadh',
  starts_on: '2026-10-04',
  ends_on: null,
};
const starts = (rule: RuleTiming, from: string, to: string) =>
  ruleOccurrences(rule, { from: new Date(from), to: new Date(to) }).map((o) =>
    o.starts_at.toISOString().slice(0, 16),
  );

describe('ruleOccurrences — byday combinations and calendar edges (R-SCH-02)', () => {
  it('all seven days → one lesson per day', () => {
    const daily = { ...RULE, byday: [0, 1, 2, 3, 4, 5, 6] };
    expect(starts(daily, '2026-10-04T00:00:00Z', '2026-10-11T00:00:00Z')).toEqual([
      '2026-10-04T17:00',
      '2026-10-05T17:00',
      '2026-10-06T17:00',
      '2026-10-07T17:00',
      '2026-10-08T17:00',
      '2026-10-09T17:00',
      '2026-10-10T17:00',
    ]);
  });

  it('Friday + Saturday only (weekend rule)', () => {
    const weekend = { ...RULE, byday: [6, 5] };
    expect(starts(weekend, '2026-10-04T00:00:00Z', '2026-10-18T00:00:00Z')).toEqual([
      '2026-10-09T17:00',
      '2026-10-10T17:00',
      '2026-10-16T17:00',
      '2026-10-17T17:00',
    ]);
  });

  it('starts_on mid-week (Wednesday) begins on the next listed day, not the week start', () => {
    const rule = { ...RULE, starts_on: '2026-10-07' };
    expect(starts(rule, '2026-10-04T00:00:00Z', '2026-10-14T00:00:00Z')).toEqual([
      '2026-10-08T17:00',
      '2026-10-11T17:00',
      '2026-10-13T17:00',
    ]);
  });

  it('starts_on on a listed day includes that day', () => {
    const rule = { ...RULE, starts_on: '2026-10-06' };
    expect(starts(rule, '2026-10-01T00:00:00Z', '2026-10-09T00:00:00Z')).toEqual([
      '2026-10-06T17:00',
      '2026-10-08T17:00',
    ]);
  });

  it('crosses a month boundary without gaps or repeats (Tue/Thu, Oct → Nov)', () => {
    const rule = { ...RULE, byday: [2, 4] };
    expect(starts(rule, '2026-10-26T00:00:00Z', '2026-11-07T00:00:00Z')).toEqual([
      '2026-10-27T17:00',
      '2026-10-29T17:00',
      '2026-11-03T17:00',
      '2026-11-05T17:00',
    ]);
  });

  it('crosses a year boundary (Thu 31 Dec → Sun 3 Jan)', () => {
    const rule = { ...RULE, byday: [4, 0], start_time_local: '21:00' };
    expect(starts(rule, '2026-12-30T00:00:00Z', '2027-01-04T00:00:00Z')).toEqual([
      '2026-12-31T18:00',
      '2027-01-03T18:00',
    ]);
  });

  it('ends_on mid-week stops after that local day (inclusive), whatever the window', () => {
    const rule = { ...RULE, ends_on: '2026-10-13' };
    expect(starts(rule, '2026-10-01T00:00:00Z', '2026-12-01T00:00:00Z')).toEqual([
      '2026-10-04T17:00',
      '2026-10-06T17:00',
      '2026-10-08T17:00',
      '2026-10-11T17:00',
      '2026-10-13T17:00',
    ]);
  });

  it('ends_on uses the local day: a 01:00 Riyadh lesson on ends_on (22:00Z the day before) counts', () => {
    const rule = { ...RULE, byday: [2], start_time_local: '01:00', ends_on: '2026-10-13' };
    expect(starts(rule, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z')).toEqual([
      '2026-10-05T22:00',
      '2026-10-12T22:00',
    ]);
  });

  it('a 90-minute lesson ends 90 minutes later', () => {
    const [o] = ruleOccurrences(
      { ...RULE, duration_min: 90 },
      { from: new Date('2026-10-04T00:00:00Z'), to: new Date('2026-10-05T00:00:00Z') },
    );
    expect(o?.ends_at.toISOString()).toBe('2026-10-04T18:30:00.000Z');
  });
});
