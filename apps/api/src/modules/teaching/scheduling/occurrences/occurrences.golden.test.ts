import { GOLDEN_ZONES, digest, goldenDates } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { monthWindow } from '../../../finance/payouts/payouts.plan';
import { rangeWindow, riyadhDate } from '../../../reporting/dashboard/range';
import { ruleOccurrences } from './occurrences';

// Regression goldens (docs/34 §6): occurrence generation (idempotent on unique(rule_id, starts_at)),
// the payroll month and the academy-day `?from&to` window must give byte-identical instants. The
// digests were taken from the pre-date-fns code (Intl + ms math) and pin it: a different instant
// anywhere in the year, in any zone, changes the digest.

const WINDOW = { from: new Date('2025-12-20T00:00:00Z'), to: new Date('2027-01-10T00:00:00Z') };
const STARTS = ['00:00', '00:30', '01:30', '02:30', '12:00', '23:30:00'];
const MONTHS = [...new Set(goldenDates().map((d) => d.slice(0, 7)))];

function occurrenceLines(zone: string): string[] {
  return STARTS.flatMap((start_time_local) =>
    ruleOccurrences(
      { byday: [0, 1, 2, 3, 4, 5, 6], start_time_local, duration_min: 45, tz: zone, starts_on: '2025-12-24', ends_on: '2027-01-07' },
      WINDOW,
    ).map((o) => `${o.starts_at.toISOString()} ${o.ends_at.toISOString()}`),
  );
}

const EXPECTED: Record<string, { occurrences: string; months: string }> = {
  'Africa/Cairo': { occurrences: '2280:d3dff1bb', months: '14:e654de36' },
  'Asia/Riyadh': { occurrences: '2280:1b494639', months: '14:86689a66' },
  'Asia/Dubai': { occurrences: '2280:5d456fa1', months: '14:eef57242' },
  'Asia/Kuwait': { occurrences: '2280:1b494639', months: '14:86689a66' },
  'Asia/Qatar': { occurrences: '2280:1b494639', months: '14:86689a66' },
  'Europe/London': { occurrences: '2280:8db3646d', months: '14:3284d09d' },
  'America/New_York': { occurrences: '2280:939f0a49', months: '14:30781543' },
};

describe.each(GOLDEN_ZONES)('pinned instants in %s', (zone) => {
  it('every lesson of a daily rule at six wall times, a whole year', () => {
    expect(digest(occurrenceLines(zone))).toBe(EXPECTED[zone]?.occurrences);
  });

  it('the payroll month window of every month', () => {
    const lines = MONTHS.map((m) => `${m} ${monthWindow(m, zone).from} ${monthWindow(m, zone).to}`);
    expect(digest(lines)).toBe(EXPECTED[zone]?.months);
  });
});

const one = (tz: string, date: string, start_time_local: string): string | undefined =>
  ruleOccurrences(
    { byday: [0, 1, 2, 3, 4, 5, 6], start_time_local, duration_min: 30, tz, starts_on: date, ends_on: date },
    WINDOW,
  )[0]?.starts_at.toISOString();

describe('DST edges, pinned', () => {
  it('Cairo 2026-10-29 (clocks back at 24:00): a repeated 23:30 is the later, winter one', () => {
    expect(one('Africa/Cairo', '2026-10-29', '23:30')).toBe('2026-10-29T21:30:00.000Z');
    expect(one('Africa/Cairo', '2026-10-30', '00:30')).toBe('2026-10-29T22:30:00.000Z');
  });

  it('Cairo 2026-04-24 (no 00:00–00:59): a missing 00:30 moves an hour on', () => {
    expect(one('Africa/Cairo', '2026-04-24', '00:30')).toBe('2026-04-23T22:30:00.000Z');
  });

  it('New York and London, both changes', () => {
    expect(one('America/New_York', '2026-03-08', '02:30')).toBe('2026-03-08T06:30:00.000Z');
    expect(one('America/New_York', '2026-11-01', '01:30')).toBe('2026-11-01T05:30:00.000Z');
    expect(one('Europe/London', '2026-03-29', '01:30')).toBe('2026-03-29T01:30:00.000Z');
    expect(one('Europe/London', '2026-10-25', '01:30')).toBe('2026-10-25T01:30:00.000Z');
  });
});

describe('academy days (Asia/Riyadh)', () => {
  it('the ?from&to window and the Riyadh day of an instant', () => {
    const lines = goldenDates().map((d) => {
      const w = rangeWindow({ from: d, to: d });
      return `${d} ${w.from.toISOString()} ${w.to.toISOString()} ${riyadhDate(`${d}T21:30:00Z`)}`;
    });
    expect(digest(lines)).toBe('380:6bc70779');
  });
});
