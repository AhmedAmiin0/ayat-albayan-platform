import { describe, expect, it } from 'vitest';
import {
  addRange,
  dayProblem,
  emptyGrid,
  gridFromRows,
  gridIsValid,
  gridToSlots,
  gridTz,
  removeRange,
  updateRange,
} from './grid';

const CAIRO = 'Africa/Cairo';
const r = (start: string, end: string) => ({ start, end });

describe('availability grid ↔ rows (R-TCH-02)', () => {
  it('groups rows by weekday and sorts each day by start', () => {
    const grid = gridFromRows([
      { weekday: 6, start_time: '18:00', end_time: '19:00', tz: CAIRO },
      { weekday: 6, start_time: '16:00', end_time: '17:00', tz: CAIRO },
      { weekday: 0, start_time: '10:00', end_time: '12:00', tz: CAIRO },
    ]);
    expect(grid[6]).toEqual([r('16:00', '17:00'), r('18:00', '19:00')]);
    expect(grid[0]).toEqual([r('10:00', '12:00')]);
    expect(grid[3]).toEqual([]);
  });

  it('round-trips to PUT slots in weekday order with one tz', () => {
    const grid = { ...emptyGrid(), 1: [r('09:00', '10:00')], 0: [r('16:00', '18:30')] };
    expect(gridToSlots(grid, CAIRO)).toEqual([
      { weekday: 0, start_time: '16:00', end_time: '18:30', tz: CAIRO },
      { weekday: 1, start_time: '09:00', end_time: '10:00', tz: CAIRO },
    ]);
  });

  it('an empty grid sends no slots (clears availability)', () => {
    expect(gridToSlots(emptyGrid(), CAIRO)).toEqual([]);
  });

  it('keeps the tz of stored rows, else falls back to the teacher tz', () => {
    const rows = [{ weekday: 0, start_time: '10:00', end_time: '11:00', tz: 'Asia/Riyadh' }];
    expect(gridTz(rows, CAIRO)).toBe('Asia/Riyadh');
    expect(gridTz([], CAIRO)).toBe(CAIRO);
  });
});

describe('availability grid editing (R-TCH-02)', () => {
  it('adds 16:00–17:00 to an empty day', () => {
    expect(addRange([])).toEqual([r('16:00', '17:00')]);
  });

  it('adds the next hour after the last range', () => {
    expect(addRange([r('16:00', '18:30')])).toEqual([r('16:00', '18:30'), r('18:30', '19:30')]);
  });

  it('never adds past 23:59', () => {
    expect(addRange([r('22:00', '23:59')]).at(-1)).toEqual(r('23:58', '23:59'));
    expect(addRange([r('22:00', '23:30')]).at(-1)).toEqual(r('23:30', '23:59'));
  });

  it('updates and removes one range by index without mutating', () => {
    const day = [r('16:00', '17:00'), r('18:00', '19:00')];
    expect(updateRange(day, 1, { end: '20:00' })).toEqual([r('16:00', '17:00'), r('18:00', '20:00')]);
    expect(removeRange(day, 0)).toEqual([r('18:00', '19:00')]);
    expect(day).toHaveLength(2);
  });
});

describe('availability grid validation (R-TCH-02)', () => {
  it.each([
    [[], null],
    [[r('16:00', '17:00'), r('17:00', '18:00')], null],
    [[r('16:00', '16:00')], 'endBeforeStart'],
    [[r('18:00', '16:00')], 'endBeforeStart'],
    [[r('', '16:00')], 'endBeforeStart'],
    [[r('16:00', '18:00'), r('17:30', '19:00')], 'overlap'],
    [[r('17:30', '19:00'), r('16:00', '18:00')], 'overlap'],
    [[r('16:00', '20:00'), r('17:00', '18:00')], 'overlap'],
  ])('dayProblem(%j) = %s', (ranges, expected) => {
    expect(dayProblem(ranges)).toBe(expected);
  });

  it('a grid is valid only when every day is', () => {
    expect(gridIsValid({ ...emptyGrid(), 2: [r('16:00', '17:00')] })).toBe(true);
    expect(gridIsValid({ ...emptyGrid(), 2: [r('16:00', '17:00'), r('16:30', '18:00')] })).toBe(false);
  });
});
