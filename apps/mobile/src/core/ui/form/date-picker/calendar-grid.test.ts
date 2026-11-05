import {
  canShift,
  dayAllowed,
  monthGrid,
  monthOf,
  openingMonth,
  shiftMonth,
} from './calendar-grid';

describe('monthGrid', () => {
  test('weeks start on Saturday: 2026-11-01 is a Sunday, the 2nd column', () => {
    const weeks = monthGrid('2026-11');
    expect(weeks[0]).toEqual([
      null,
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
    ]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  test('every day of the month once, in order; blanks only at the edges', () => {
    const days = monthGrid('2026-02')
      .flat()
      .filter((d): d is string => d !== null);
    expect(days).toHaveLength(28);
    expect(days[0]).toBe('2026-02-01');
    expect(days[27]).toBe('2026-02-28');
  });

  test('a leap February has 29 days; a month starting on Saturday has no leading blank', () => {
    expect(monthGrid('2028-02').flat().filter(Boolean)).toHaveLength(29);
    expect(monthGrid('2026-08')[0]?.[0]).toBe('2026-08-01');
  });

  test('trailing blanks pad the last week', () => {
    const last = monthGrid('2026-11').at(-1) ?? [];
    expect(last.filter((d) => d === null).length).toBeGreaterThan(0);
    expect(last).toHaveLength(7);
  });
});

describe('range', () => {
  const range = { min: '2025-11-02', max: '2026-11-02' };

  test('dayAllowed: inclusive at both ends, out beyond them', () => {
    expect(dayAllowed('2025-11-02', range)).toBe(true);
    expect(dayAllowed('2026-11-02', range)).toBe(true);
    expect(dayAllowed('2025-11-01', range)).toBe(false);
    expect(dayAllowed('2026-11-03', range)).toBe(false);
  });

  test('no max: every later day is allowed', () => {
    expect(dayAllowed('2030-01-01', { min: '2026-11-02' })).toBe(true);
  });

  test('canShift stops at the months of min and max', () => {
    expect(canShift('2025-11', -1, range)).toBe(false);
    expect(canShift('2025-12', -1, range)).toBe(true);
    expect(canShift('2026-11', 1, range)).toBe(false);
    expect(canShift('2026-10', 1, range)).toBe(true);
    expect(canShift('2040-01', 1, { min: '2026-11-02' })).toBe(true);
  });

  test('openingMonth: the day, else the nearest bound', () => {
    expect(openingMonth('2026-03-15', range)).toBe('2026-03');
    expect(openingMonth('2020-01-01', range)).toBe('2025-11');
    expect(openingMonth('2030-01-01', range)).toBe('2026-11');
  });
});

test('shiftMonth / monthOf across the year', () => {
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  expect(monthOf('2026-11-02')).toBe('2026-11');
});
