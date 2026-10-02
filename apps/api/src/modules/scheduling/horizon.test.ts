import { describe, expect, it } from 'vitest';
import { addDays, dayOf, horizonWindow, localDateOf, startOfLocalDay } from './horizon';

describe('horizon helpers (R-SCH-02, R-SCH-01)', () => {
  it('horizon starts now for a rule that already started, and ends now + weeks', () => {
    const now = new Date('2026-10-02T10:00:00Z');
    const w = horizonWindow({ now, startsOn: '2026-09-01', tz: 'Asia/Riyadh', weeks: 5 });
    expect(w.from.toISOString()).toBe('2026-10-02T10:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-11-06T10:00:00.000Z');
  });

  it('horizon starts at local midnight of a future starts_on', () => {
    const now = new Date('2026-10-02T10:00:00Z');
    const w = horizonWindow({ now, startsOn: '2026-10-04', tz: 'Asia/Riyadh', weeks: 1 });
    expect(w.from.toISOString()).toBe('2026-10-03T21:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-10-09T10:00:00.000Z');
  });

  it('a starts_on beyond the horizon gives an inverted (empty) window', () => {
    const now = new Date('2026-10-02T10:00:00Z');
    const w = horizonWindow({ now, startsOn: '2027-01-01', tz: 'Asia/Riyadh', weeks: 5 });
    expect(w.from > w.to).toBe(true);
  });

  it('localDateOf reads the calendar date in the zone, not in UTC', () => {
    const lateUtc = new Date('2026-10-04T22:30:00Z');
    expect(localDateOf(lateUtc, 'Asia/Riyadh')).toBe('2026-10-05');
    expect(localDateOf(lateUtc, 'UTC')).toBe('2026-10-04');
    expect(localDateOf(new Date('2026-10-05T03:00:00Z'), 'America/Los_Angeles')).toBe('2026-10-04');
  });

  it('addDays crosses months and years and goes backwards', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(dayOf('2026-10-04')).toBe(Date.UTC(2026, 9, 4));
  });

  it('startOfLocalDay is DST-aware (Cairo summer vs winter)', () => {
    expect(startOfLocalDay('2026-07-01', 'Africa/Cairo').toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(startOfLocalDay('2026-12-01', 'Africa/Cairo').toISOString()).toBe('2026-11-30T22:00:00.000Z');
  });
});
