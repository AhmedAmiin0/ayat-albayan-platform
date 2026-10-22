import { describe, expect, it } from 'vitest';
import { localDate, sheetDate } from './sheet-dates';

describe('sheet dates', () => {
  it('reads a serial date, an ISO text date, a d/m/yyyy text date and Arabic digits', () => {
    expect(sheetDate(46316)).toBe('2026-10-21');
    expect(sheetDate('2026-10-21')).toBe('2026-10-21');
    expect(sheetDate('2026/10/21 17:00')).toBe('2026-10-21');
    expect(sheetDate('21/10/2026')).toBe('2026-10-21');
    expect(sheetDate('٢٠٢٦/١٠/٢١')).toBe('2026-10-21');
  });

  it('ignores headers, blanks and nonsense', () => {
    expect(sheetDate('تاريخ الحلقة')).toBeNull();
    expect(sheetDate('')).toBeNull();
    expect(sheetDate(null)).toBeNull();
    expect(sheetDate(7)).toBeNull();
    expect(sheetDate('2026-13-40')).toBeNull();
  });

  it('gives the lesson day in Riyadh (a late UTC evening is the next day)', () => {
    expect(localDate('2026-10-21T22:30:00Z', 'Asia/Riyadh')).toBe('2026-10-22');
    expect(localDate('2026-10-21T10:00:00Z', 'Asia/Riyadh')).toBe('2026-10-21');
  });
});
