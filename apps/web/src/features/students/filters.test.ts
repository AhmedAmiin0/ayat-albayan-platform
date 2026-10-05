import { describe, expect, it } from 'vitest';
import { activeFilterCount, filterParams, parseStudentFilters, selectedStatuses, setFilter, toggleStatus } from './filters';

const T = '11111111-1111-4111-8111-111111111111';

describe('student list filters in the URL (R-STU-01)', () => {
  it('keeps every valid filter; status stays a comma-joined string', () => {
    const raw = { status: 'active,trial', teacher: T, program: 'arabic', package: 'unpaid', weekly: 'yes', tz: 'Africa/Cairo' };
    expect(parseStudentFilters(raw)).toEqual({ ...raw, status: 'trial,active' });
  });

  it('drops each blank or invalid filter on its own', () => {
    expect(parseStudentFilters({ status: 'x', teacher: 'abc', program: '', package: 'free', weekly: 'none', tz: '' })).toEqual({});
    expect(parseStudentFilters({ teacher: 'none', package: 'low' })).toEqual({ teacher: 'none', package: 'low' });
  });

  it('API params: only the set filters, in a fixed order', () => {
    expect(filterParams({ weekly: 'no', status: 'paused' })).toEqual([
      ['status', 'paused'],
      ['weekly', 'no'],
    ]);
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ teacher: 'none', tz: 'Asia/Riyadh' })).toBe(2);
  });

  it('setFilter: a value sets, «الكل» (empty) removes', () => {
    expect(setFilter({ program: 'quran' }, 'teacher', 'none')).toEqual({ program: 'quran', teacher: 'none' });
    expect(setFilter({ program: 'quran', teacher: 'none' }, 'teacher', '')).toEqual({ program: 'quran' });
  });

  it('toggleStatus adds and removes chips; none left = no status filter', () => {
    const one = toggleStatus({}, 'active');
    expect(one).toEqual({ status: 'active' });
    const two = toggleStatus(one, 'trial');
    expect(selectedStatuses(two)).toEqual(['trial', 'active']);
    expect(toggleStatus(toggleStatus(two, 'trial'), 'active')).toEqual({});
  });
});
