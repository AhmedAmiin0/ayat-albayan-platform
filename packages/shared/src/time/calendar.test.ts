import { describe, expect, it } from 'vitest';
import { addCalendarMonths, shiftCalendarMonths } from './calendar.js';

describe('calendar months', () => {
  it('shiftCalendarMonths keeps the day, clamped to a shorter month', () => {
    expect(shiftCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftCalendarMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(shiftCalendarMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftCalendarMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(shiftCalendarMonths('2026-01-10', -1)).toBe('2025-12-10');
    expect(shiftCalendarMonths('2026-10-30', 0)).toBe('2026-10-30');
  });

  it('addCalendarMonths lands on the 1st, across years', () => {
    expect(addCalendarMonths('2026-12', 1)).toBe('2027-01-01');
    expect(addCalendarMonths('2026-01-31', -1)).toBe('2025-12-01');
  });
});
