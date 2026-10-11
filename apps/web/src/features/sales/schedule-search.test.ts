import { describe, expect, it } from 'vitest';
import { parseSalesScheduleSearch } from './schedule-search';

const TC = 'c2000000-0000-4000-8000-0000000000c2';

describe('parseSalesScheduleSearch', () => {
  it('keeps a valid day and teacher id', () => {
    expect(parseSalesScheduleSearch({ date: '2026-10-12', teacherId: TC })).toEqual({ date: '2026-10-12', teacherId: TC });
  });

  it('drops a malformed or impossible date and a non-uuid teacher', () => {
    expect(parseSalesScheduleSearch({ date: '12-10-2026', teacherId: 'tc1' })).toEqual({});
    expect(parseSalesScheduleSearch({ date: '2026-13-45' })).toEqual({});
    expect(parseSalesScheduleSearch({ date: 20261012 })).toEqual({});
  });
});
