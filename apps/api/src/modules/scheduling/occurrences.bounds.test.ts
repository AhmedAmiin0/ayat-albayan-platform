import { describe, expect, it } from 'vitest';
import { ruleOccurrences, type RuleTiming } from './occurrences';

const RULE: RuleTiming = {
  byday: [0, 2],
  start_time_local: '17:00',
  duration_min: 45,
  tz: 'Asia/Riyadh',
  starts_on: '2026-10-04',
  ends_on: null,
};
const starts = (rule: RuleTiming, from: string, to: string) =>
  ruleOccurrences(rule, { from: new Date(from), to: new Date(to) }).map((o) =>
    o.starts_at.toISOString(),
  );

describe('ruleOccurrences — rule and window bounds (R-SCH-02)', () => {
  it('nothing before starts_on', () => {
    expect(starts(RULE, '2026-09-27T00:00:00Z', '2026-10-05T00:00:00Z')).toEqual([
      '2026-10-04T14:00:00.000Z',
    ]);
  });

  it('ends_on is inclusive', () => {
    const rule = { ...RULE, ends_on: '2026-10-11' };
    expect(starts(rule, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z')).toEqual([
      '2026-10-04T14:00:00.000Z',
      '2026-10-06T14:00:00.000Z',
      '2026-10-11T14:00:00.000Z',
    ]);
  });

  it('a trial (ends_on = starts_on) yields exactly one lesson', () => {
    const rule = { ...RULE, byday: [0], ends_on: '2026-10-04' };
    expect(starts(rule, '2026-10-01T00:00:00Z', '2026-12-01T00:00:00Z')).toHaveLength(1);
  });

  it('`from` is inclusive and `to` is exclusive', () => {
    expect(starts(RULE, '2026-10-04T14:00:00Z', '2026-10-06T14:00:00Z')).toEqual([
      '2026-10-04T14:00:00.000Z',
    ]);
  });

  it('an empty or inverted window yields nothing', () => {
    expect(starts(RULE, '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z')).toEqual([]);
    expect(starts(RULE, '2026-10-07T00:00:00Z', '2026-10-01T00:00:00Z')).toEqual([]);
  });

  it('a window entirely after ends_on yields nothing', () => {
    const rule = { ...RULE, ends_on: '2026-10-06' };
    expect(starts(rule, '2026-10-10T00:00:00Z', '2026-11-01T00:00:00Z')).toEqual([]);
  });

  it('splitting a window in two gives the same lessons as the whole (horizon extension)', () => {
    const whole = starts(RULE, '2026-10-01T00:00:00Z', '2026-11-05T00:00:00Z');
    const split = [
      ...starts(RULE, '2026-10-01T00:00:00Z', '2026-10-13T14:00:00Z'),
      ...starts(RULE, '2026-10-13T14:00:00Z', '2026-11-05T00:00:00Z'),
    ];
    expect(split).toEqual(whole);
  });
});
