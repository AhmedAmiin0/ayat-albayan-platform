import { describe, expect, it } from 'vitest';
import { CALENDAR_PERIODS, parseTeacherCalendarSearch } from './calendar-search';

describe('parseTeacherCalendarSearch (?period=)', () => {
  it('none or junk reads as no period (the week)', () => {
    expect(parseTeacherCalendarSearch({})).toEqual({ period: undefined });
    expect(parseTeacherCalendarSearch({ period: 'year' })).toEqual({ period: undefined });
    expect(parseTeacherCalendarSearch({ period: 3 })).toEqual({ period: undefined });
  });

  it('an old ?view=availability link is ignored', () => {
    expect(parseTeacherCalendarSearch({ view: 'availability' })).toEqual({ period: undefined });
  });

  it.each(CALENDAR_PERIODS)('keeps %s', (period) => {
    expect(parseTeacherCalendarSearch({ period })).toEqual({ period });
  });
});
