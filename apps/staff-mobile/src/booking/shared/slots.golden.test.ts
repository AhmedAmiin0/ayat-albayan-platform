import { digest, GOLDEN_ZONES, goldenDates, goldenInstants } from '@ab/shared/testing';
import { dayStartUtc, ruleFromSlot } from './slots';

// Regression golden (docs/34 §7): the instant a local day starts (GET /booking/slots `from`) and
// the rule fields a picked slot fixes (POST bodies). Before the swap to the date-fns facade the old
// two-pass / getUTCDay code ran beside the new one over this sweep and agreed on every value; the
// digests were taken from the old code.

const dates = goldenDates();
const instants = goldenInstants();
const ruleLine = (r: { startsOn: string; startTimeLocal: string; weekday: number }) =>
  `${r.startsOn} ${r.startTimeLocal} ${r.weekday}`;

const EXPECTED: Record<string, { day: string; rule: string }> = {
  'Africa/Cairo': { day: '380:ffe19217', rule: '18240:95624681' },
  'Asia/Riyadh': { day: '380:e288736f', rule: '18240:ef9921a9' },
  'Asia/Dubai': { day: '380:e73bfd27', rule: '18240:efc3f9cd' },
  'Asia/Kuwait': { day: '380:e288736f', rule: '18240:ef9921a9' },
  'Asia/Qatar': { day: '380:e288736f', rule: '18240:ef9921a9' },
  'Europe/London': { day: '380:d8eb32ff', rule: '18240:bfe4de39' },
  'America/New_York': { day: '380:a1b4565d', rule: '18240:a21f664b' },
};

describe.each(GOLDEN_ZONES)('slots, pinned, in %s', (zone) => {
  test('the start of every local day of the sweep', () => {
    expect(digest(dates.map((d) => dayStartUtc(d, zone).toISOString()))).toBe(EXPECTED[zone]?.day);
  });

  test('the rule a slot fixes (local day, «HH:MM», weekday), every half hour', () => {
    const lines = instants.map((at) => ruleLine(ruleFromSlot(at.toISOString(), zone)));
    expect(digest(lines)).toBe(EXPECTED[zone]?.rule);
  });
});

test('DST edges: Cairo 2026-10-29 / 30 and 2026-04-24, New York 2026-03-08', () => {
  expect(dayStartUtc('2026-10-29', 'Africa/Cairo').toISOString()).toBe('2026-10-28T21:00:00.000Z');
  expect(dayStartUtc('2026-10-30', 'Africa/Cairo').toISOString()).toBe('2026-10-29T22:00:00.000Z');
  expect(dayStartUtc('2026-04-24', 'Africa/Cairo').toISOString()).toBe('2026-04-23T22:00:00.000Z');
  expect(dayStartUtc('2026-03-08', 'America/New_York').toISOString()).toBe('2026-03-08T05:00:00.000Z');
  expect(ruleFromSlot('2026-10-29T21:30:00.000Z', 'Africa/Cairo')).toEqual({
    startsOn: '2026-10-29',
    startTimeLocal: '23:30',
    weekday: 4,
  });
});
