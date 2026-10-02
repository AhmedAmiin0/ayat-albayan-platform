import { describe, expect, it } from 'vitest';
import { parseScheduleSearch } from './search';

describe('parseScheduleSearch (/admin/schedule)', () => {
  it('keeps valid filters and snaps the week to its Saturday', () => {
    expect(
      parseScheduleSearch({ week: '2026-10-07', teacher: 't1', program: 'quran', status: 'scheduled', closed: true }),
    ).toEqual({ week: '2026-10-03', teacher: 't1', program: 'quran', status: 'scheduled', closed: true });
  });

  it('drops unknown values and leaves defaults out', () => {
    expect(parseScheduleSearch({ week: '7/10/2026', program: 'math', status: 'done', closed: 'no', teacher: '' })).toEqual({});
    expect(parseScheduleSearch({ week: '2026-13-45' })).toEqual({});
  });

  it('reads closed=true from a typed URL too', () => {
    expect(parseScheduleSearch({ closed: 'true' })).toEqual({ closed: true });
  });
});
