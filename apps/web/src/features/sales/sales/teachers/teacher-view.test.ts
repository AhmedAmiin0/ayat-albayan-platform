import { PROGRAMS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { teacher } from '../academy.fixtures';
import { filterTeachers, isFiltered, NO_FILTER, programsOf, riyadhWhen } from './teacher-view';

const LIST = [
  teacher({ id: 'a', name: 'أبرار', name_en: 'Abrar' }),
  teacher({ id: 'b', name: 'إسراء', name_en: null, programs: ['islamic_studies'] }),
  teacher({ id: 'c', name: 'محمد', name_en: 'Mohamed', gender: 'male', programs: ['quran'] }),
];
const ids = (f: Parameters<typeof filterTeachers>[1]) => filterTeachers(LIST, f).map((tc) => tc.id);

describe('teacher-view', () => {
  it('the shared filter under the web names: name, program, gender; blank search is no filter', () => {
    expect(ids({ ...NO_FILTER, q: 'اسراء' })).toEqual(['b']);
    expect(ids({ ...NO_FILTER, program: 'quran', gender: 'female' })).toEqual(['a']);
    expect(isFiltered({ ...NO_FILTER, q: '  ' })).toBe(false);
    expect(programsOf(LIST, PROGRAMS)).toEqual(PROGRAMS.filter((p) => ['quran', 'arabic', 'islamic_studies'].includes(p)));
  });

  it('riyadhWhen: weekday, day, month and the Riyadh clock (UTC+3)', () => {
    expect(riyadhWhen('2026-10-12T15:00:00.000Z', '24')).toBe('الاثنين 12 أكتوبر 18:00');
    expect(riyadhWhen('2026-10-12T15:00:00.000Z', '12')).toBe('الاثنين 12 أكتوبر 6:00 م');
    expect(riyadhWhen('2026-10-12T22:30:00.000Z', '24')).toBe('الثلاثاء 13 أكتوبر 01:30');
  });
});
