import { GOLDEN_ZONES, digest, goldenInstants } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { wallClock } from './track';

// Regression golden (docs/34 §7): the availability grid's today row and now-marker moved from en-US
// Intl parts to weekdayIn / zonedFieldsIn. Both agreed over this sweep; digests from the old code.

const instants = goldenInstants(15);

const EXPECTED: Record<string, string> = {
  'Africa/Cairo': '36480:81641c0f',
  'Asia/Riyadh': '36480:b19e735f',
  'Asia/Dubai': '36480:a4a4bd3f',
  'Asia/Kuwait': '36480:b19e735f',
  'Asia/Qatar': '36480:b19e735f',
  'Europe/London': '36480:69965eef',
  'America/New_York': '36480:1d52ff56',
};

describe.each(GOLDEN_ZONES)('wallClock, pinned, in %s', (zone) => {
  it('weekday and minute of the day every quarter hour of the sweep', () => {
    const lines = instants.map((at) => JSON.stringify(wallClock(at, zone)));
    expect(digest(lines)).toBe(EXPECTED[zone]);
  });
});

it('Cairo 2026-10-29: 21:30Z is Thursday 23:30 (+02), 22:00Z Friday 00:00', () => {
  expect(wallClock(new Date('2026-10-29T21:30:00Z'), 'Africa/Cairo')).toEqual({ weekday: 4, minute: 1410 });
  expect(wallClock(new Date('2026-10-29T22:00:00Z'), 'Africa/Cairo')).toEqual({ weekday: 5, minute: 0 });
});
