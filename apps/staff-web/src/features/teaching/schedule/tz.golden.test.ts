import { GOLDEN_TIMES, GOLDEN_ZONES, digest, goldenDates, goldenInstants } from '@ab/shared/testing';
import { wallInstant, weekWindowIn, zonedPartsIn } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { dateLabel, dayMonthLabel } from './tz';

// Regression golden (docs/34 §7). Before the date-fns facade replaced the en-CA Intl parts and the
// Date.UTC offset math here, both ran side by side over this sweep and agreed on every value; the
// digests were taken from the old code. wallInstant feeds the booking picks and edit-time bodies.

const dates = [...goldenDates(), '2026-02-30'];
const times = [...GOLDEN_TIMES, '24:00', '09:05:00'];
const instants = goldenInstants(15);

function wallLines(tz: string): string[] {
  return dates.flatMap((d) => {
    const week = weekWindowIn(d, tz);
    const clocks = times.map((t) => wallInstant(d, t, tz).toISOString());
    return [...clocks, `${week.from.toISOString()} ${week.to.toISOString()}`];
  });
}

const partLines = (tz: string): string[] =>
  instants.map((at) => JSON.stringify(zonedPartsIn(at, tz)));

const EXPECTED: Record<string, { wall: string; parts: string }> = {
  'Africa/Cairo': { wall: '6858:e8511a85', parts: '36480:797a0151' },
  'Asia/Riyadh': { wall: '6858:eeb91d26', parts: '36480:317b944d' },
  'Asia/Dubai': { wall: '6858:c36f80e6', parts: '36480:56e2aef5' },
  'Asia/Kuwait': { wall: '6858:eeb91d26', parts: '36480:317b944d' },
  'Asia/Qatar': { wall: '6858:eeb91d26', parts: '36480:317b944d' },
  'Europe/London': { wall: '6858:329bf0bb', parts: '36480:666fbc0d' },
  'America/New_York': { wall: '6858:fac5e009', parts: '36480:ae2bfa35' },
};

describe.each(GOLDEN_ZONES)('schedule tz, pinned, in %s', (zone) => {
  it('every wall time of the sweep → its UTC instant, and each local week window', () => {
    expect(digest(wallLines(zone))).toBe(EXPECTED[zone]?.wall);
  });

  it('every quarter hour → local day, time and weekday', () => {
    expect(digest(partLines(zone))).toBe(EXPECTED[zone]?.parts);
  });
});

describe('labels and DST edges', () => {
  it('day labels of every date', () => {
    const lines = dates.map((d) => `${dayMonthLabel(d)} ${dateLabel(d)}`);
    expect(digest(lines)).toBe('381:7fb3ce48');
    expect(dateLabel('')).toBe('');
  });

  it('Cairo 2026-10-29: 23:30 happens twice (the second, +02, wins); the next midnight is +02', () => {
    expect(wallInstant('2026-10-29', '23:30', 'Africa/Cairo').toISOString()).toBe('2026-10-29T21:30:00.000Z');
    expect(wallInstant('2026-10-30', '00:00', 'Africa/Cairo').toISOString()).toBe('2026-10-29T22:00:00.000Z');
  });

  it('a wall time in a spring-forward gap resolves as before (Cairo 04-24 00:30 → 01:30, NY 02:30 → 01:30 EST)', () => {
    expect(wallInstant('2026-04-24', '00:30', 'Africa/Cairo').toISOString()).toBe('2026-04-23T22:30:00.000Z');
    expect(wallInstant('2026-03-08', '02:30', 'America/New_York').toISOString()).toBe('2026-03-08T06:30:00.000Z');
  });
});
