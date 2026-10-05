import { monthLabel, monthRange, recentMonths, riyadhToday } from './months';

test('the Riyadh day, not the UTC one, after 21:00 UTC', () => {
  expect(riyadhToday(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10-01');
  expect(riyadhToday(new Date('2026-10-05T10:00:00Z'))).toBe('2026-10-05');
});

test('recent months run newest first across a year end', () => {
  expect(recentMonths('2026-02-10', 4)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11']);
  expect(recentMonths('2026-10-05')).toHaveLength(6);
});

test('a month is its first and last day, leap years included', () => {
  expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  expect(monthRange('2026-02').to).toBe('2026-02-28');
});

test('the label has the year in Western digits', () => {
  expect(monthLabel('2026-10')).toMatch(/2026/);
});
