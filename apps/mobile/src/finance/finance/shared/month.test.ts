import { canGoNext, currentMonth, shiftMonth, summaryYears, yearRange } from './month';

const NOW = new Date('2026-10-05T09:00:00Z');

test('the current month follows the Riyadh clock, not UTC', () => {
  expect(currentMonth(NOW)).toBe('2026-10');
  expect(currentMonth(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10');
});

test('shiftMonth crosses year edges', () => {
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  expect(shiftMonth('2026-10', -3)).toBe('2026-07');
});

test('the picker cannot go past the current month', () => {
  expect(canGoNext('2026-09', NOW)).toBe(true);
  expect(canGoNext('2026-10', NOW)).toBe(false);
});

test('the summary offers four years and ends this year today', () => {
  expect(summaryYears(NOW)).toEqual(['2026', '2025', '2024', '2023']);
  expect(yearRange('2026', NOW)).toEqual({ from: '2026-01-01', to: '2026-10-05' });
  expect(yearRange('2025', NOW)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
});
