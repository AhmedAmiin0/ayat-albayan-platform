import { describe, expect, it } from 'vitest';
import { offsetChanges, probeOccurrences } from './dst-probe';

// Egypt leaves DST at the end of Thu 29 Oct 2026 and re-enters it on Fri 30 Apr 2027;
// Riyadh has no DST. A Riyadh family's Sunday 18:00 rule booked with a Cairo teacher.
const RIYADH_18 = {
  byday: [0],
  start_time_local: '18:00',
  duration_min: 60,
  tz: 'Asia/Riyadh',
  starts_on: '2026-09-06',
  ends_on: null,
};
const SEP_1 = new Date('2026-09-01T00:00:00Z');
const day = (d: Date) => d.toISOString().slice(0, 10);

describe('offsetChanges', () => {
  it('finds both Cairo changes within a year, each at most a day early', () => {
    const changes = offsetChanges('Africa/Cairo', SEP_1).map(day);
    expect(changes).toHaveLength(2);
    expect(changes[0] && changes[0] >= '2026-10-28' && changes[0] <= '2026-10-30').toBe(true);
    expect(changes[1] && changes[1] >= '2027-04-28' && changes[1] <= '2027-04-30').toBe(true);
  });

  it('a zone without DST never changes', () => {
    expect(offsetChanges('Asia/Riyadh', SEP_1)).toEqual([]);
  });
});

describe('probeOccurrences — check where DST will move the rule (R-SCH-04, issue B3)', () => {
  it('Riyadh rule + Cairo teacher: the first Sundays after each Cairo change', () => {
    const out = probeOccurrences({ timing: RIYADH_18, tzs: ['Asia/Riyadh', 'Africa/Cairo'], after: SEP_1 });
    const starts = out.map((o) => o.starts_at.toISOString());
    expect(starts).toContain('2026-11-01T15:00:00.000Z');
    expect(starts.some((s) => s.startsWith('2027-05-02'))).toBe(true);
    expect(starts.length).toBeLessThanOrEqual(4);
  });

  it('one zone (or only the rule tz) → nothing extra to check', () => {
    expect(probeOccurrences({ timing: RIYADH_18, tzs: ['Asia/Riyadh', 'Asia/Riyadh'], after: SEP_1 })).toEqual([]);
  });

  it('a change before the horizon end is not probed again', () => {
    const after = new Date('2026-11-10T00:00:00Z');
    const out = probeOccurrences({ timing: RIYADH_18, tzs: ['Asia/Riyadh', 'Africa/Cairo'], after });
    expect(out.every((o) => o.starts_at > after)).toBe(true);
    expect(out.map((o) => day(o.starts_at))).not.toContain('2026-11-01');
  });
});
