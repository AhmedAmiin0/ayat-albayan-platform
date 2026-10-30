import { describe, expect, it } from 'vitest';
import { addDays, weekdayOf, weekStart } from './week.js';

describe('academy-week math (R-SCH-01)', () => {
  it('adds days across months and years, and back', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-03', -7)).toBe('2026-09-26');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-03', 0)).toBe('2026-10-03');
  });

  it('numbers weekdays 0 = الأحد … 6 = السبت', () => {
    expect(weekdayOf('2026-10-03')).toBe(6);
    expect(weekdayOf('2026-10-04')).toBe(0);
    expect(weekdayOf('2026-10-09')).toBe(5);
  });

  it.each([
    ['2026-10-01', '2026-09-26'],
    ['2026-10-02', '2026-09-26'],
    ['2026-10-03', '2026-10-03'],
    ['2026-10-04', '2026-10-03'],
    ['2027-01-01', '2026-12-26'],
  ])('the week of %s starts on Saturday %s', (date, start) => {
    expect(weekStart(date)).toBe(start);
  });
});
