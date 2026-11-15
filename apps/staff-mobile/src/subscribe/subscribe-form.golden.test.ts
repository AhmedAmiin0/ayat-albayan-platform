import { digest, GOLDEN_ZONES, goldenDates, goldenInstants } from '@ab/shared/testing';
import { startDays } from './subscribe-form';

// Regression golden (docs/34 §7): the package's first-day choices. Before the swap to the date-fns
// facade the old noon + n × 24 h code ran beside the new one over this sweep and agreed on every
// value; the digests are the old code's.

const EXPECTED: Record<string, string> = {
  'Africa/Cairo': '9120:aac44e94',
  'Asia/Riyadh': '9120:e53a691d',
  'Asia/Dubai': '9120:af8f2b6d',
  'Asia/Kuwait': '9120:e53a691d',
  'Asia/Qatar': '9120:e53a691d',
  'Europe/London': '9120:b726ab2d',
  'America/New_York': '9120:37657e46',
};

test('every day of the sweep, a booked first day leading, pinned', () => {
  const lines = goldenDates().map((d) => startDays(new Date(`${d}T12:00:00Z`), 'UTC', '2026-06-01').join());
  expect(digest(lines)).toBe('380:cb52595e');
});

test.each(GOLDEN_ZONES)('today and the next 6 days, hourly, in %s, pinned', (zone) => {
  const instants = goldenInstants(60);
  expect(digest(instants.map((at) => startDays(at, zone).join()))).toBe(EXPECTED[zone]);
});
