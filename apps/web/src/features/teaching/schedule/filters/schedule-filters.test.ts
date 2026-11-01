import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { T_ABRAR, T_FATMA, T_NOUR } from '@/features/teaching/schedule/overview-fixture';
import { CLEAR_SCHEDULE_FILTERS, scheduleChips } from './schedule-filters';
import type { ScheduleSearch } from './search';

const teachers = [T_ABRAR, T_FATMA, T_NOUR];
const build = (search: ScheduleSearch, onSearch = vi.fn()) => scheduleChips({ search, teachers, onSearch });

describe('scheduleChips', () => {
  it('no chip for the week / day navigation, only for filters', () => {
    expect(build({ view: 'day', day: '2026-10-05', week: '2026-10-03' })).toEqual([]);
  });

  it('one chip per set filter, in the panel\'s order, each removing only itself', () => {
    const onSearch = vi.fn();
    const chips = build({ teachers: ['t-nour'], program: 'quran', gender: 'female', status: 'scheduled', closed: true }, onSearch);
    expect(chips.map((c) => [c.id, c.label, c.value])).toEqual([
      ['teachers', t.schedule.teacherFilter, 'نور'],
      ['program', t.schedule.programFilter, t.enums.program.quran],
      ['gender', t.teachers.gender, t.teachers.genderLabel.female],
      ['status', t.schedule.statusFilter, t.enums.lessonStatus.scheduled],
      ['closed', t.schedule.showClosed, t.common.yes],
    ]);
    chips.forEach((c) => c.onRemove());
    expect(onSearch.mock.calls.map(([patch]) => Object.keys(patch))).toEqual([['teachers'], ['program'], ['gender'], ['status'], ['closed']]);
  });

  it('several teachers read as a count, not as ids', () => {
    const [chip] = build({ teachers: ['t-nour', 't-abrar'] });
    expect(chip?.value).toBe('معلمان'); // the dual form of the counted forms
    expect(chip?.value).not.toContain('t-nour');
  });

  it('«مسح الكل» clears every filter key and leaves the navigation alone', () => {
    expect(Object.keys(CLEAR_SCHEDULE_FILTERS).sort()).toEqual(['closed', 'gender', 'program', 'status', 'teachers']);
    expect(Object.values(CLEAR_SCHEDULE_FILTERS).every((v) => v === undefined)).toBe(true);
  });
});
