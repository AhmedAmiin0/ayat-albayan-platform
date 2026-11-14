import { describe, expect, it } from 'vitest';
import { addMonths, lessonsByDay, monthGrid, monthOf, monthSpan, monthWindowIn } from './month-grid.js';

describe('addMonths / monthOf', () => {
  it('crosses years both ways', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 0)).toBe('2026-11');
    expect(addMonths('2026-11', -13)).toBe('2025-10');
  });

  it('reads the month of a date', () => {
    expect(monthOf('2026-11-14')).toBe('2026-11');
  });
});

describe('monthGrid', () => {
  it('starts on the Saturday on or before the 1st and ends on a Friday', () => {
    // 2026-11-01 is a Sunday: the grid opens on Saturday 31 October.
    const weeks = monthGrid('2026-11');
    expect(weeks[0]?.[0]).toEqual({ date: '2026-10-31', inMonth: false });
    expect(weeks[0]?.[1]).toEqual({ date: '2026-11-01', inMonth: true });
    const last = weeks.at(-1)?.at(-1);
    expect(last?.date).toBe('2026-12-04');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });

  it('needs no borrowed days when the 1st is a Saturday', () => {
    // 2025-02-01 is a Saturday and February 2025 has 28 days: exactly 4 weeks.
    const weeks = monthGrid('2025-02');
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((c) => c.inMonth)).toBe(true);
  });

  it('spans 6 weeks for a long month starting on a Friday', () => {
    // 2026-05-01 is a Friday.
    expect(monthGrid('2026-05')).toHaveLength(6);
    expect(monthSpan('2026-05')).toEqual({ first: '2026-04-25', end: '2026-06-06' });
  });
});

describe('monthWindowIn', () => {
  it('covers the whole grid in the zone', () => {
    const w = monthWindowIn('2026-11', 'Asia/Riyadh');
    expect(w.from.toISOString()).toBe('2026-10-30T21:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-12-04T21:00:00.000Z');
  });
});

describe('lessonsByDay', () => {
  it('buckets by the local day of the start', () => {
    const a = { id: 'a', starts_at: '2026-11-13T22:30:00Z' }; // 14th in Riyadh
    const b = { id: 'b', starts_at: '2026-11-14T08:00:00Z' };
    const c = { id: 'c', starts_at: '2026-11-15T08:00:00Z' };
    const days = lessonsByDay([a, b, c], 'Asia/Riyadh');
    expect(days.get('2026-11-14')).toEqual([a, b]);
    expect(days.get('2026-11-15')).toEqual([c]);
    expect(lessonsByDay([a], 'UTC').get('2026-11-13')).toEqual([a]);
  });
});
