import { dayStartUtc, windowStart } from './slots';

test('a local day starts at its own midnight in the zone', () => {
  expect(dayStartUtc('2026-10-25', 'Asia/Riyadh').toISOString()).toBe('2026-10-24T21:00:00.000Z');
  expect(dayStartUtc('2026-10-25', 'America/New_York').toISOString()).toBe('2026-10-25T04:00:00.000Z');
  // Cairo is +03 in summer and +02 after it leaves summer time (end of October).
  expect(dayStartUtc('2026-08-01', 'Africa/Cairo').toISOString()).toBe('2026-07-31T21:00:00.000Z');
  expect(dayStartUtc('2026-11-15', 'Africa/Cairo').toISOString()).toBe('2026-11-14T22:00:00.000Z');
});

test('the window opens now, or at `from` when that is later', () => {
  const now = new Date('2026-10-18T10:00:00.000Z');
  expect(windowStart(now)).toBe(now);
  expect(windowStart(now, '2026-10-01T00:00:00.000Z')).toBe(now);
  expect(windowStart(now, '2026-10-24T21:00:00.000Z').toISOString()).toBe('2026-10-24T21:00:00.000Z');
  expect(windowStart(now, 'not a date')).toBe(now);
});
