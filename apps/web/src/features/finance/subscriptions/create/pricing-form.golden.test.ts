import { GOLDEN_ZONES, digest, goldenInstants } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { todayIn } from './pricing-form';

// Regression golden (docs/34 §7): todayIn (the package's first day) moved from
// toLocaleDateString('en-CA', tz) to localDateIn; both agreed over this sweep (digests: old code).

const instants = goldenInstants(15);

const EXPECTED: Record<string, string> = {
  'Africa/Cairo': '36480:a4cd5f75',
  'Asia/Riyadh': '36480:7882658d',
  'Asia/Dubai': '36480:27077da5',
  'Asia/Kuwait': '36480:7882658d',
  'Asia/Qatar': '36480:7882658d',
  'Europe/London': '36480:1ed7fe9d',
  'America/New_York': '36480:37ffdc1d',
};

describe.each(GOLDEN_ZONES)('todayIn, pinned, in %s', (zone) => {
  it('the local day every quarter hour of the sweep', () => {
    expect(digest(instants.map((at) => todayIn(zone, at)))).toBe(EXPECTED[zone]);
  });
});

it('Cairo 2026-10-29 → 30: the day turns at 22:00Z once the clocks are back', () => {
  expect(todayIn('Africa/Cairo', new Date('2026-10-29T21:59:00Z'))).toBe('2026-10-29');
  expect(todayIn('Africa/Cairo', new Date('2026-10-29T22:00:00Z'))).toBe('2026-10-30');
});
