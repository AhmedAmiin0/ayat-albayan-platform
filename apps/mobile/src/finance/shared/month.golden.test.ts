import { digest, goldenDates } from '@ab/shared/testing';
import { shiftMonth } from './month';

// Regression golden (docs/34 §7). Before the swap to the date-fns facade the old Date.UTC code
// ran beside the new one over this sweep and agreed on every value; the digest is the old code's.

test('shiftMonth by −13, −1, 0, 1 and 12 from every month of the sweep, pinned', () => {
  const shifts = (d: string) => [-13, -1, 0, 1, 12].map((n) => shiftMonth(d.slice(0, 7), n)).join();
  const lines = goldenDates().map(shifts);
  expect(digest(lines)).toBe('380:391c22fd');
});
