import { describe, expect, it } from 'vitest';
import {
  lessonAt,
  partialRows,
  pastRows,
  patchRow,
  picksFromRows,
  repeatedDays,
  rowsFromPicks,
  weekBounds,
} from './rows.js';

const CAIRO = 'Africa/Cairo';

describe('lesson rows (a date + a time per lesson day)', () => {
  it('a filled row is the wall clock of the student zone, as UTC', () => {
    expect(lessonAt({ date: '2026-11-08', time: '17:00' }, CAIRO)).toBe('2026-11-08T15:00:00.000Z');
    expect(lessonAt({ date: '2026-11-08', time: '17:00' }, 'Asia/Riyadh')).toBe('2026-11-08T14:00:00.000Z');
  });

  it('a row missing its date or time is no pick yet', () => {
    expect(lessonAt({ date: '', time: '17:00' }, CAIRO)).toBeNull();
    expect(lessonAt({ date: '2026-11-08', time: '' }, CAIRO)).toBeNull();
  });

  it('picks are the filled rows, earliest first', () => {
    const rows = [
      { date: '2026-11-10', time: '18:30' },
      { date: '', time: '' },
      { date: '2026-11-08', time: '17:00' },
    ];
    expect(picksFromRows(rows, CAIRO)).toEqual(['2026-11-08T15:00:00.000Z', '2026-11-10T16:30:00.000Z']);
  });

  it('rows from picks round-trip and pad up to the days a week', () => {
    const rows = rowsFromPicks(['2026-11-10T16:30:00.000Z', '2026-11-08T15:00:00.000Z'], CAIRO, 3);
    expect(rows).toEqual([
      { date: '2026-11-08', time: '17:00' },
      { date: '2026-11-10', time: '18:30' },
      { date: '', time: '' },
    ]);
    expect(picksFromRows(rows, CAIRO)).toHaveLength(2);
    expect(rowsFromPicks([], CAIRO, 0)).toEqual([]);
  });

  it('the bounds are one week from the first day, stretched to a later prefilled date', () => {
    expect(weekBounds('2026-11-08')).toEqual({ min: '2026-11-08', max: '2026-11-14' });
    expect(weekBounds('2026-11-08', [{ date: '2026-11-15', time: '10:00' }, { date: '', time: '' }])).toEqual({
      min: '2026-11-08',
      max: '2026-11-15',
    });
  });

  it('a weekday repeated by a later row is flagged (each weekday once a week)', () => {
    const rows = [
      { date: '2026-11-08', time: '17:00' },
      { date: '2026-11-15', time: '18:00' },
      { date: '', time: '' },
      { date: '2026-11-09', time: '17:00' },
    ];
    expect(repeatedDays(rows)).toEqual([1]);
    expect(repeatedDays([{ date: '', time: '' }, { date: '', time: '' }])).toEqual([]);
  });

  it('patchRow changes one row only', () => {
    const rows = [{ date: '2026-11-08', time: '' }, { date: '', time: '' }];
    expect(patchRow(rows, 0, { time: '09:15' })).toEqual([{ date: '2026-11-08', time: '09:15' }, { date: '', time: '' }]);
  });

  it('a row with only a date or only a time is partial; a blank one is not', () => {
    const rows = [{ date: '2026-11-08', time: '' }, { date: '', time: '' }, { date: '', time: '10:00' }];
    expect(partialRows(rows)).toEqual([0, 2]);
  });

  it('a filled row before now is past', () => {
    const now = new Date('2026-11-08T15:30:00.000Z');
    const rows = [{ date: '2026-11-08', time: '17:00' }, { date: '2026-11-08', time: '18:00' }, { date: '', time: '' }];
    expect(pastRows(rows, { tz: CAIRO, now })).toEqual([0]);
  });
});
