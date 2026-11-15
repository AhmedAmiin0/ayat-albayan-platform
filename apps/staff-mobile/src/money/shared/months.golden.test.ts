import { digest, goldenDates } from '@ab/shared/testing';
import { monthLabel, monthRange, recentMonths } from './months';

// Regression golden (docs/34 §7). Before the swap to the date-fns facade the old Date.UTC code
// ran beside the new one over this sweep and agreed on every value; the digest is the old code's.

const line = (d: string) =>
  [recentMonths(d, 14).join(), JSON.stringify(monthRange(d.slice(0, 7))), monthLabel(d.slice(0, 7))].join(' ');

test('recent months, a month\'s first and last day and its name, pinned', () => {
  expect(digest(goldenDates().map(line))).toBe('380:146f4369');
});

test('February of a leap year and the year end', () => {
  expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  expect(recentMonths('2027-01-31', 2)).toEqual(['2027-01', '2026-12']);
});
