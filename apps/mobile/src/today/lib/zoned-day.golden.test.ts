import { digest, GOLDEN_ZONES, goldenInstants } from '@ab/shared/testing';
import { localDate } from './timeline';
import { greetingPart } from './today-plan';

// Regression golden (docs/34 §7): the local day key (GET /lessons/day?date, the finance month, the
// package's first day) and the greeting's hour. Before the swap to the date-fns facade the old
// `en-US` / `en` Intl parts ran beside the new code here, hourly over the sweep, and agreed on each
// value; the digests were taken from the old code.

const instants = goldenInstants(60);

const EXPECTED: Record<string, string> = {
  'Africa/Cairo': '9120:e78211a9',
  'Asia/Riyadh': '9120:97525091',
  'Asia/Dubai': '9120:1e0344d5',
  'Asia/Kuwait': '9120:97525091',
  'Asia/Qatar': '9120:97525091',
  'Europe/London': '9120:460994fd',
  'America/New_York': '9120:c1aa2cbf',
};

test.each(GOLDEN_ZONES)('local date and greeting, pinned, every hour in %s', (zone) => {
  const lines = instants.map((at) => `${localDate(at, zone)} ${greetingPart(at, zone)}`);
  expect(digest(lines)).toBe(EXPECTED[zone]);
});

test('Cairo 2026-10-29: 23:30 is still the 29th after the clocks go back, 00:00 the 30th', () => {
  expect(localDate(new Date('2026-10-29T21:30:00Z'), 'Africa/Cairo')).toBe('2026-10-29');
  expect(localDate(new Date('2026-10-29T22:00:00Z'), 'Africa/Cairo')).toBe('2026-10-30');
  expect(greetingPart(new Date('2026-10-30T01:00:00Z'), 'Africa/Cairo')).toBe('night'); // 03:00
  expect(greetingPart(new Date('2026-10-30T02:00:00Z'), 'Africa/Cairo')).toBe('morning'); // 04:00
});
