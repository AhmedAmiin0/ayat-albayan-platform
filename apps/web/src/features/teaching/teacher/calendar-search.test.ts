import { describe, expect, it } from 'vitest';
import { CALENDAR_VIEWS, parseTeacherCalendarSearch } from './calendar-search';

describe('parseTeacherCalendarSearch (?view=)', () => {
  it('none or junk reads as no view', () => {
    expect(parseTeacherCalendarSearch({})).toEqual({ view: undefined });
    expect(parseTeacherCalendarSearch({ view: 'week' })).toEqual({ view: undefined });
    expect(parseTeacherCalendarSearch({ view: 3 })).toEqual({ view: undefined });
  });

  it.each(CALENDAR_VIEWS)('keeps %s', (view) => {
    expect(parseTeacherCalendarSearch({ view })).toEqual({ view });
  });
});
