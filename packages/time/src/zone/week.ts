import { addCalendarDays, weekdayOfDate, weekStartOfDate } from './calendar';

// Academy-week calendar math on local dates "YYYY-MM-DD" (R-SCH-01, rule 6). Plain calendar
// arithmetic, no zone involved (the date-fns facade, calendar.ts). Shared by the web schedule grid
// and the mobile calendar (docs/27 E6); weeks run Saturday → Friday like the availability grid.

/** Weekday of a calendar date: 0 = Sunday … 6 = Saturday (`byday`, teacher_availability). */
export const weekdayOf = weekdayOfDate;

/** The date `days` later (negative: earlier); crosses months and years. */
export const addDays = addCalendarDays;

/** The Saturday on or before `date`: the first day of its academy week. */
export const weekStart = (date: string): string => weekStartOfDate(date, 6);
