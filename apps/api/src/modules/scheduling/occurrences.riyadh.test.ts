import { describe, expect, it } from 'vitest';
import { ruleOccurrences, type RuleTiming } from './occurrences';

// Sun + Tue 17:00 Riyadh (UTC+3 all year) → 14:00Z. 2026-10-04 is a Sunday.
const RULE: RuleTiming = {
  byday: [0, 2],
  start_time_local: '17:00',
  duration_min: 45,
  tz: 'Asia/Riyadh',
  starts_on: '2026-10-04',
  ends_on: null,
};
const win = (from: string, to: string) => ({ from: new Date(from), to: new Date(to) });
const starts = (rule: RuleTiming, w: ReturnType<typeof win>) =>
  ruleOccurrences(rule, w).map((o) => o.starts_at.toISOString());

describe('ruleOccurrences — Asia/Riyadh (R-SCH-02, R-SCH-01)', () => {
  it('two weeks of Sun/Tue at 17:00 local, sorted, with the lesson duration', () => {
    const out = ruleOccurrences(RULE, win('2026-10-04T00:00:00Z', '2026-10-18T00:00:00Z'));
    expect(out.map((o) => o.starts_at.toISOString())).toEqual([
      '2026-10-04T14:00:00.000Z',
      '2026-10-06T14:00:00.000Z',
      '2026-10-11T14:00:00.000Z',
      '2026-10-13T14:00:00.000Z',
    ]);
    expect(out[0]?.ends_at.toISOString()).toBe('2026-10-04T14:45:00.000Z');
  });

  it('accepts Postgres "HH:MM:SS" times', () => {
    const w = win('2026-10-04T00:00:00Z', '2026-10-05T00:00:00Z');
    expect(starts({ ...RULE, start_time_local: '17:00:00' }, w)).toEqual([
      '2026-10-04T14:00:00.000Z',
    ]);
  });

  it('repeated or unordered days never duplicate an occurrence', () => {
    const w = win('2026-10-04T00:00:00Z', '2026-10-11T00:00:00Z');
    expect(starts({ ...RULE, byday: [2, 0, 2] }, w)).toEqual(starts(RULE, w));
  });

  it('is deterministic: the same window gives the same list (idempotent input to the upsert)', () => {
    const w = win('2026-10-01T00:00:00Z', '2026-11-08T00:00:00Z');
    expect(starts(RULE, w)).toEqual(starts(RULE, w));
    expect(starts(RULE, w)).toHaveLength(10);
  });

  it('an after-midnight local slot lands on the previous UTC day and is still found', () => {
    // Monday 01:30 Riyadh = Sunday 22:30Z.
    const rule = { ...RULE, byday: [1], start_time_local: '01:30' };
    expect(starts(rule, win('2026-10-04T00:00:00Z', '2026-10-05T00:00:00Z'))).toEqual([
      '2026-10-04T22:30:00.000Z',
    ]);
  });

  it('a US-evening slot lands on the next UTC day and is still found', () => {
    // Sunday 20:00 Los Angeles (PDT, UTC-7) = Monday 03:00Z.
    const rule = { ...RULE, byday: [0], start_time_local: '20:00', tz: 'America/Los_Angeles' };
    expect(starts(rule, win('2026-10-05T00:00:00Z', '2026-10-06T00:00:00Z'))).toEqual([
      '2026-10-05T03:00:00.000Z',
    ]);
  });
});
