import { PROGRAMS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { teacher } from './academy.fixtures';
import { filterTeachers, isFiltered, NO_FILTER, programsOf, riyadhWhen } from './teacher-view';

const LIST = [
  teacher({ id: 'a', name: 'أبرار', name_en: 'Abrar' }),
  teacher({ id: 'b', name: 'إسراء', name_en: null, programs: ['islamic_studies'] }),
  teacher({ id: 'c', name: 'محمد', name_en: 'Mohamed', gender: 'male', programs: ['quran'] }),
];
const ids = (f: Parameters<typeof filterTeachers>[1]) => filterTeachers(LIST, f).map((tc) => tc.id);

describe('teacher-view', () => {
  it('filterTeachers: Arabic-normalised name (hamza forms), English name, program, gender', () => {
    expect(ids(NO_FILTER)).toEqual(['a', 'b', 'c']);
    expect(ids({ ...NO_FILTER, q: 'اسراء' })).toEqual(['b']);
    expect(ids({ ...NO_FILTER, q: 'moh' })).toEqual(['c']);
    expect(ids({ ...NO_FILTER, program: 'quran' })).toEqual(['a', 'c']);
    expect(ids({ ...NO_FILTER, program: 'quran', gender: 'female' })).toEqual(['a']);
  });

  it('isFiltered ignores a blank search', () => {
    expect(isFiltered({ ...NO_FILTER, q: '  ' })).toBe(false);
    expect(isFiltered({ ...NO_FILTER, gender: 'male' })).toBe(true);
  });

  it('programsOf keeps the catalogue order and only programs someone teaches', () => {
    expect(programsOf(LIST, PROGRAMS)).toEqual(PROGRAMS.filter((p) => ['quran', 'arabic', 'islamic_studies'].includes(p)));
  });

  it('riyadhWhen: weekday, day, month and the Riyadh clock (UTC+3)', () => {
    expect(riyadhWhen('2026-10-12T15:00:00.000Z')).toBe('الاثنين 12 أكتوبر 18:00');
    expect(riyadhWhen('2026-10-12T22:30:00.000Z')).toBe('الثلاثاء 13 أكتوبر 01:30');
  });
});
