import { describe, expect, it } from 'vitest';
import { ruleOccurrences, type RuleTiming } from './occurrences';

// Same Cairo DST dates as free-slots.cairo-dst.test.ts: summer UTC+3, winter UTC+2.
const CAIRO_SUN_16: RuleTiming = {
  byday: [0],
  start_time_local: '16:00',
  duration_min: 60,
  tz: 'Africa/Cairo',
  starts_on: '2026-01-01',
  ends_on: null,
};
const occ = (rule: RuleTiming, from: string, to: string) =>
  ruleOccurrences(rule, { from: new Date(from), to: new Date(to) }).map((o) => [
    o.starts_at.toISOString(),
    o.ends_at.toISOString(),
  ]);

describe('ruleOccurrences — Africa/Cairo DST (R-SCH-01, R-SCH-02)', () => {
  it('keeps 16:00 wall-clock across the October fall-back', () => {
    expect(occ(CAIRO_SUN_16, '2026-10-25T00:00:00Z', '2026-11-02T00:00:00Z')).toEqual([
      ['2026-10-25T13:00:00.000Z', '2026-10-25T14:00:00.000Z'],
      ['2026-11-01T14:00:00.000Z', '2026-11-01T15:00:00.000Z'],
    ]);
  });

  it('keeps 16:00 wall-clock across the April spring-forward', () => {
    const fri = { ...CAIRO_SUN_16, byday: [5] };
    expect(occ(fri, '2026-04-17T00:00:00Z', '2026-04-25T00:00:00Z').map(([s]) => s)).toEqual([
      '2026-04-17T14:00:00.000Z',
      '2026-04-24T13:00:00.000Z',
    ]);
  });

  it('the same rule in Riyadh does not move in winter while Cairo does', () => {
    const riyadh = { ...CAIRO_SUN_16, tz: 'Asia/Riyadh' };
    expect(occ(riyadh, '2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z')).toEqual([
      ['2026-11-01T13:00:00.000Z', '2026-11-01T14:00:00.000Z'],
    ]);
  });
});
