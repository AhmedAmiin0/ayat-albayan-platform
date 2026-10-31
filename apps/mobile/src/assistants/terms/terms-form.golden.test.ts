import { digest, goldenDates } from '@ab/shared/testing';
import { shiftDay } from './terms-form';

// Regression golden (docs/34 §7). Before the swap to the date-fns facade the old Date.UTC code
// ran beside the new one over this sweep and agreed on every value; the digest is the old code's.

const STEPS = [
  { days: 1 },
  { days: -1 },
  { months: 1 },
  { months: -1 },
  { months: 12 },
  { months: 1, days: -1 },
  { months: 3, days: 2 },
];

test('shiftDay by days and clamped months from every day of the sweep, pinned', () => {
  expect(digest(goldenDates().map((d) => STEPS.map((s) => shiftDay(d, s)).join()))).toBe('380:71b50050');
  expect(shiftDay('2026-01-31', { months: 1, days: -1 })).toBe('2026-02-27');
});
