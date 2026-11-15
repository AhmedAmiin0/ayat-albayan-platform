import { GOLDEN_ZONES, digest, goldenDates } from '@ab/shared/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { formatTimeOff, toTimeOffBody } from './time-off';

// Regression golden (docs/34 §7). Before the date-fns facade replaced `new Date('…T00:00')` +
// setDate and the Intl formatter, both ran side by side here in every zone of the sweep (the zone
// is the browser's: process TZ) and agreed; the digests were taken from the old code.

const dates = [...goldenDates(), '2026-02-30', '2026-13-01', ''];
const clocks = [{ cycle: '24', locale }, { cycle: '12', locale }] as const;

/** Inputs: the browser's own local midnight of `date`, `days` later (the old dayStart). */
function browserMidnight(date: string, days = 0): string {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const bodyLines = (tz: string): string[] =>
  dates.map((from) => {
    const r = toTimeOffBody({ from, to: from, reason: '' }, tz);
    return r.ok ? [r.body.starts_at, r.body.ends_at].join(' ') : `x ${r.error}`;
  });

function textLines(): string[] {
  return goldenDates().flatMap((d) => {
    const start = browserMidnight(d);
    const end = browserMidnight(d, 3);
    const late = new Date(Date.parse(start) + 90 * 60_000).toISOString();
    const spans: [string, string][] = [[start, end], [start, browserMidnight(d, 1)], [late, end]];
    return spans.flatMap(([a, b]) => clocks.map((c) => formatTimeOff(a, b, c)));
  });
}

const EXPECTED: Record<string, { body: string; text: string }> = {
  'Africa/Cairo': { body: '383:2528df45', text: '2280:fafa04ff' },
  'Asia/Riyadh': { body: '383:03e76d6e', text: '2280:732850c7' },
  'Asia/Dubai': { body: '383:8ef1f1a8', text: '2280:732850c7' },
  'Asia/Kuwait': { body: '383:03e76d6e', text: '2280:732850c7' },
  'Asia/Qatar': { body: '383:03e76d6e', text: '2280:732850c7' },
  'Europe/London': { body: '383:f84574e0', text: '2280:2a17fe9f' },
  'America/New_York': { body: '383:78f70dbe', text: '2280:732850c7' },
};

describe.each(GOLDEN_ZONES)('time off, pinned, with the browser in %s', (zone) => {
  const saved = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  });

  it('every day of the sweep → the POST body instants', () => {
    expect(digest(bodyLines(zone))).toBe(EXPECTED[zone]?.body);
  });

  it('whole-day and timed spans → the same text, both cycles', () => {
    expect(digest(textLines())).toBe(EXPECTED[zone]?.text);
  });
});

describe('DST edges', () => {
  it('Cairo 2026-04-24 has no midnight: it starts at 01:00, and so does the day after', () => {
    const r = toTimeOffBody({ from: '2026-04-24', to: '2026-04-24', reason: '' }, 'Africa/Cairo');
    expect(r.ok && [r.body.starts_at, r.body.ends_at]).toEqual([
      '2026-04-23T22:00:00.000Z',
      '2026-04-24T22:00:00.000Z',
    ]);
  });

  it('Cairo 2026-10-29 (clocks back at midnight): the next day starts at 00:00 +02', () => {
    const r = toTimeOffBody({ from: '2026-10-29', to: '2026-10-29', reason: '' }, 'Africa/Cairo');
    expect(r.ok && [r.body.starts_at, r.body.ends_at]).toEqual([
      '2026-10-28T21:00:00.000Z',
      '2026-10-29T22:00:00.000Z',
    ]);
  });

  it('New York 2026-03-08 and London 2026-03-29 keep their midnights', () => {
    const ny = toTimeOffBody({ from: '2026-03-08', to: '2026-03-08', reason: '' }, 'America/New_York');
    expect(ny.ok && ny.body.ends_at).toBe('2026-03-09T04:00:00.000Z');
    const ldn = toTimeOffBody({ from: '2026-03-29', to: '2026-03-29', reason: '' }, 'Europe/London');
    expect(ldn.ok && ldn.body.starts_at).toBe('2026-03-29T00:00:00.000Z');
  });
});
