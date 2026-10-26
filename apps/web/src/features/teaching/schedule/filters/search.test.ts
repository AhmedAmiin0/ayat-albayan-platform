import { describe, expect, it } from 'vitest';
import { parseScheduleSearch } from './search';

describe('parseScheduleSearch (/admin/schedule)', () => {
  it('keeps valid filters and snaps the week to its Saturday', () => {
    expect(
      parseScheduleSearch({ week: '2026-10-07', teachers: ['t1'], program: 'quran', gender: 'male', status: 'scheduled', closed: true }),
    ).toEqual({ week: '2026-10-03', teachers: ['t1'], program: 'quran', gender: 'male', status: 'scheduled', closed: true });
  });

  it('reads the old ?teacher=<id> and a typed comma list as picked teachers', () => {
    expect(parseScheduleSearch({ week: '2026-10-10', teacher: 't-abrar' })).toEqual({ week: '2026-10-10', teachers: ['t-abrar'] });
    expect(parseScheduleSearch({ teachers: 'a, b,a,' })).toEqual({ teachers: ['a', 'b'] });
  });

  it('keeps the day of the day view and drops the week there', () => {
    expect(parseScheduleSearch({ view: 'day', day: '2026-10-05', week: '2026-10-03' })).toEqual({ view: 'day', day: '2026-10-05' });
    expect(parseScheduleSearch({ view: 'day', day: '5/10' })).toEqual({ view: 'day' });
    expect(parseScheduleSearch({ view: 'month', day: '2026-10-05' })).toEqual({});
  });

  it('drops unknown values and leaves defaults out', () => {
    expect(
      parseScheduleSearch({ week: '7/10/2026', program: 'math', gender: 'x', status: 'done', closed: 'no', teacher: '', teachers: [1, ''] }),
    ).toEqual({});
    expect(parseScheduleSearch({ week: '2026-13-45' })).toEqual({});
  });

  it('reads closed=true from a typed URL too', () => {
    expect(parseScheduleSearch({ closed: 'true' })).toEqual({ closed: true });
  });
});
