import { describe, expect, it } from 'vitest';
import { PROGRAMS } from '../enums/index.js';
import type { SalesTeacherView } from './academy.js';
import { filterSalesTeachers, isRunningLesson, isTeacherFilterOn, NO_TEACHER_FILTER, teacherPrograms } from './teacher-filter.js';

const tc = (over: Partial<SalesTeacherView>): SalesTeacherView => ({
  id: 'x', name: 'أبرار', name_en: 'Abrar', gender: 'female', programs: ['quran', 'arabic'], lessons_today: 0, live_now: false, active_count: 0, trial_count: 0, meeting_link: null, platform_classroom: false, students: [], ...over,
});
const LIST = [tc({ id: 'a' }), tc({ id: 'b', name: 'إسراء', name_en: null, programs: ['islamic_studies'] }), tc({ id: 'c', name: 'محمد', name_en: 'Mohamed', gender: 'male', programs: ['quran'] })];
const ids = (f: typeof NO_TEACHER_FILTER) => filterSalesTeachers(LIST, f).map((t) => t.id);

describe('sales teacher filter (web + mobile)', () => {
  it('Arabic-normalised name (hamza forms), English name, program, gender', () => {
    expect(ids(NO_TEACHER_FILTER)).toEqual(['a', 'b', 'c']);
    expect(ids({ ...NO_TEACHER_FILTER, q: ' اسراء ' })).toEqual(['b']);
    expect(ids({ ...NO_TEACHER_FILTER, q: 'MOH' })).toEqual(['c']);
    expect(ids({ ...NO_TEACHER_FILTER, program: 'quran' })).toEqual(['a', 'c']);
    expect(ids({ ...NO_TEACHER_FILTER, program: 'quran', gender: 'female' })).toEqual(['a']);
  });

  it('isTeacherFilterOn ignores a blank search; teacherPrograms keeps the catalogue order', () => {
    expect(isTeacherFilterOn({ ...NO_TEACHER_FILTER, q: '  ' })).toBe(false);
    expect(isTeacherFilterOn({ ...NO_TEACHER_FILTER, gender: 'male' })).toBe(true);
    expect(teacherPrograms(LIST, PROGRAMS)).toEqual(PROGRAMS.filter((p) => ['quran', 'arabic', 'islamic_studies'].includes(p)));
  });

  it('isRunningLesson: open and start <= now < end', () => {
    const l = { status: 'confirmed' as const, starts_at: '2026-10-11T16:00:00Z', ends_at: '2026-10-11T16:30:00Z' };
    expect(isRunningLesson(l, new Date('2026-10-11T16:00:00Z'))).toBe(true);
    expect(isRunningLesson(l, new Date('2026-10-11T16:30:00Z'))).toBe(false);
    expect(isRunningLesson({ ...l, status: 'completed' }, new Date('2026-10-11T16:10:00Z'))).toBe(false);
  });
});
